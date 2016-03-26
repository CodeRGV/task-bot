var Q = require('q');

module.exports = function(context){

	var storage = context.controller.storage;
	var api = context.api;

	var User = function(json){
		this.json = json;
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

	User.prototype.getName = function(){
		var deferred = Q.defer();
		deferred.resolve(this.json.name || this.json.id);
		return deferred.promise;
	};

	return User;
};