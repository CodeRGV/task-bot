var Q = require('q');

var User;

module.exports = function(controller){
	if (User) return User;

	var storage = controller.storage;
	var api = controller.bot.api;

	User = function(json){
		this.json = json.length ? {id: json} : json;

		if (this.json.id) this.json.id = User.cleanId(this.json.id);
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
			deferred.resolve(this.json.name);
		} else if (this.json.id){
			var self = this;
			User.find(this.json.id).then(function(user){
				self.json = user.toObject();
				return deferred.resolve(self.json.name);
			}).catch(function(err){
				console.log(err);
			}).done();
		} else {
			deferred.resolve('');
		}
		return deferred.promise;
	};

	User.prototype.toObject = function(){
		return this.json;
	};

	return User;
};