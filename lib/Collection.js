
var Collection = function(set, Base){
	this.set = set.map(function(datum){
		return datum instanceof Base ? datum : new Base(datum);
	});
};

Collection.prototype.count = function(){
	return this.set.length;
};

Collection.prototype.find = function(id){
	return this.set.filter(function(datum){
		return datum.getId() == id;
	})[0];
};

Collection.prototype.get = function(i){
	return this.set[i];
};

Collection.prototype.forEach = function(cb, bind){
	return this.set.forEach(cb, bind);
};

Collection.prototype.last = function(){
	return this.set[this.set.length - 1];
};

Collection.prototype.push = function(datum){
	return this.set.push(datum);
};

Collection.prototype.sort = function(comparator){
	return this.set.sort(comparator);
};

Collection.prototype.toObject = function(){
	return this.set.map(function(datum){
		return datum.toObject ? datum.toObject() : datum;
	});
};

module.exports = Collection;