var Q = require('q');

var User;

module.exports = function(controller){
	if (User) return User;

	var storage = controller.storage;
	var api = controller.bot.api;

	User = function(json){
		if (!json) json = {};
		this.json = json.length ? {id: json} : json;
		this.init();
	};

	User.all = function(){
		var deferred = Q.defer();
		storage.users.all(function(err, users){
			if (err) return deferred.reject(new Error(err));
			deferred.resolve(new Collection(users, User));
		});
		return deferred.promise;
	};

	User.cleanId = function(id){
		return id.replace(/[<>@]/g, '');
	};

	User.find = function(id){
		var deferred = Q.defer();
		storage.users.get(id, function(err, res){			
			if (err) return deferred.reject(new Error(err));
			if (res) return deferred.resolve(new User(res));
			api.users.info({user: id}, function(err, res){
				if (err) return deferred.reject(new Error(err));
				var user = new User(res.user);
				user.save();
				deferred.resolve(user);
			});
		});
		return deferred.promise;
	};

	User.prototype.pending = [];

	User.prototype.init = (function(perform){
		return function(){
			if (this.json.id) this.json.id = User.cleanId(this.json.id);
			if (!this.json.name) this.json.name = '';

			for (var key in this.json) if (key in this.json && key in perform){
				perform[key].call(this, this.json[key]);
			}
		};
	})({

		name: function(name){
			var self = this;
			if (!name) var i = this.pending.push(this.getName().then(function(name){
				self.setName(name);
				self.save();
			}).fail(function(err){
				console.error('(' + name + ') ' + err);
			}).fin(function(){
				self.pending.splice(i, 1);
			}).done());
		}

	});

	User.prototype.getId = function(){
		return this.json.id;
	};

	User.prototype.hasPending = function(){
		return !!this.pending.length;
	};

	User.prototype.getPending = function(){
		return this.pending;
	};

	User.prototype.getName = function(){
		var deferred = Q.defer();
		if (this.json.name){
			deferred.resolve(this.json.name);
		} else {
			api.users.info({user: this.json.id}, function(err, res){
				if (err) return deferred.reject(new Error(err));
				deferred.resolve(res.user.name);
			});
		}
		return deferred.promise;
	};

	User.prototype.setName = function(name){
		this.json.name = name;
	};

	User.prototype.save = function(){
		var deferred = Q.defer(), self = this;
		storage.users.save(this.toObject(), function(err){
			if (err) deferred.reject(err);
			else deferred.resolve(self);
		});
		return deferred.promise;
	};

	User.prototype.toObject = function(){
		var object = {}, value;
		for (var key in this.json) if (key in this.json){
			value = this.json[key];
			if (value.toObject) value = value.toObject();
			object[key] = value;
		}
		return object;
	};

	return User;
};