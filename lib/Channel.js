var Q = require('q');
var config = require('./config.js');

module.exports = function(context){

	var User = require('./User.js')(context);

	var storage = context.controller.storage;
	var api = context.api;

	var Channel = function(json){
		this.json = json;
		if (this.json) this.init();
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
			else deferred.resolve(channels.map(function(channel){
				return new Channel(channel);
			}));
		});
		return deferred.promise;
	};

	Channel.find = function(id){
		var deferred = Q.defer();
		storage.channels.get(id, function(err, res){
			if (err) deferred.reject(new Error(err));
			else deferred.resolve(new Channel(res));
		});
		return deferred.promise;
	};

	Channel.prototype.init = function(){
		this.type = Channel.TYPES[this.json.id[0]];

		var self = this;
		if (!this.json.name) this.getName().then(function(name){
			self.json.name = name;
			storage.channels.save(self.json);
		});
	};

	var getName = Channel.prototype.getName = function(){
		var deferred = Q.defer();
		
		if (this.json.name) deferred.resolve(this.json.name);
		else getName[this.type].call(this, deferred);

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
				});
			}).fail(function(err){
				deferred.reject(err);
			});
		});
	};

	Channel.prototype.getTasks = function(){
		return this.json.tasks;
	};

	Channel.prototype.setTasks = function(tasks){
		this.json.tasks = tasks;
	};

	Channel.prototype.save = function(){
		storage.channels.save(this.json);
	};

	return Channel;
};