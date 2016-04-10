var Q = require('q');
var config = require('./config.js');

var Collection = require('./Collection.js');
var Channel;

module.exports = function(controller){
	if (Channel) return Channel;

	var User = require('./User.js')(controller);
	var Task = require('./Task.js')(controller);

	var storage = controller.storage;
	var api = controller.bot.api;

	Channel = function(json){
		this.json = json;
		this.init();
	};

	Channel.TYPES = {
		'C': 'channel',
		'D': 'im',
		'G': 'group'
	};

	Channel.BOT_USERS = config('IGNORE_BOT_USERS');

	Channel.all = function(){
		var deferred = Q.defer();
		storage.channels.all(function(err, channels){
			if (err) deferred.reject(new Error(err));
			else deferred.resolve(new Collection(channels, Channel));
		});
		return deferred.promise;
	};

	Channel.find = function(id){
		var deferred = Q.defer();
		storage.channels.get(id, function(err, res){
			if (err) deferred.reject(new Error(err));
			else deferred.resolve(res && new Channel(res));
		});
		return deferred.promise;
	};

	Channel.findOrCreate = function(id){
		var deferred = Q.defer();
		
		Channel.find(id).then(function(channel){
			if (!channel) channel = new Channel({id: id});
			deferred.resolve(channel);
		}).fail(function(err){
			deferred.reject(err);
		}).done();

		return deferred.promise;
	};

	Channel.prototype.init = (function(perform){

		return function(){
			if (!this.json.name) this.json.name = '';
			if (!this.json.tasks) this.json.tasks = [];

			this.type = Channel.TYPES[this.json.id[0]];

			var self = this;
			for (var key in this.json) if (key in this.json && key in perform){
				perform[key].call(this, this.json[key]);
			}
		};

	})({

		name: function(name){
			var self = this;
			if (!name) this.getName().then(function(name){
				self.setName(name);
				self.save();
			}).fail(function(err){
				console.error('(' + name + ') ' + err);
			}).done();
		}, 

		tasks: function(tasks){
			this.json.tasks = new Collection(tasks, Task);
		}

	});

	Channel.prototype.getId = function(){
		return this.json.id;
	};

	var getName = Channel.prototype.getName = function(){
		var deferred = Q.defer();

		if (this.json.name) deferred.resolve(this.json.name);
		else if (this.type in getName) getName[this.type].call(this, deferred);
		else deferred.resolve('');

		return deferred.promise;
	};

	getName.channel = function(deferred){	
		api.channels.info({channel: this.json.id}, function(err, res){
			if (err) deferred.reject(new Error(err));
			else deferred.resolve(res.channel.name);
		});
	};

	getName.group = function(deferred){
		api.groups.info({channel: this.json.id}, function(err, res){
			if (err) deferred.reject(new Error(err));
			else deferred.resolve(res.group.name);
		});
	};

	getName.im = function(deferred){
		var self = this;
		api.im.history({channel: this.json.id}, function(err, res){
			if (err) return deferred.reject(new Error(err));

			// find a non-bot user
			var message = res.messages.filter(function(message){
				return Channel.BOT_USERS.indexOf(message.user) < 0;
			})[0];

			User.find(message.user).then(function(user){
				user.getName().then(function(name){
					deferred.resolve(name);
				}).done();
			}).fail(function(err){
				deferred.reject(err);
			}).done();
		});
	};

	Channel.prototype.setName = function(name){
		this.json.name = name;
	};

	Channel.prototype.getTasks = function(){
		return this.json.tasks || new Collection([], Task);
	};

	Channel.prototype.setTasks = function(tasks){
		this.json.tasks = tasks;
	};

	Channel.prototype.toObject = function(){
		var object = {}, value;
		for (var key in this.json) if (key in this.json){
			value = this.json[key];
			if (value.toObject) value = value.toObject();
			object[key] = value;
		}
		return object;
	};

	Channel.prototype.save = function(){
		var deferred = Q.defer(), self = this;
		storage.channels.save(this.toObject(), function(err){
			if (err) deferred.reject(err);
			else deferred.resolve(self);
		});
		return deferred.promise;
	};

	return Channel;
};
