var Q = require('q');

var User;

module.exports = function(controller){
	if (User) return User;

	var storage = controller.storage;
	var api = controller.bot.api;

	User = function(json){
		this.json = json.length ? {id: json} : json;
	};

	User.all = function(){
		var deferred = Q.defer();
		storage.users.all(function(err, users){
			if (err) return deferred.reject(new Error(err));
			
			deferred.resolve(users.map(function(user){
				return new User(user);
			}));
		});
		return deferred.promise;
	};

	User.cleanId = function(id){
		if (!id.replace) console.log(id);
		return id.replace(/[<>@]/g, '');
	};

	User.find = function(id){
		var deferred = Q.defer();
		storage.users.get(id, function(err, res){			
			if (err) return deferred.reject(new Error(err));
			if (res) return deferred.resolve(new User(res));

			// grab slack's info and save
			api.users.info({user: id}, function(err, res){
				if (err) return deferred.reject(new Error(err));

				storage.users.save(res.user);
				deferred.resolve(new User(res.user));
			});
		});
		return deferred.promise;
	};

	User.prototype.getId = function(){
		return this.json.id;
	};

	User.prototype.getName = function(){
		var deferred = Q.defer();
		if (this.json.name){
			deferred.resolve(this.json.name || this.json.id);
		} else {
			var self = this;
			User.find(this.json.id).then(function(user){
				self.json = user.toObject();
				return deferred.resolve(self.json.name);
			});
		}
		return deferred.promise;
	};

	User.prototype.toObject = function(){
		return this.json;
	};

	return User;
};