
var Collection = function(set, Base){
	this.set = (set || []).map(function(datum){
		return datum instanceof Base ? datum : new Base(datum);
	});

	this.Base = Base;
};

Collection.prototype.add = function(data){
	if (!data.pop) data = [data];
	data.forEach(function(datum){
		if (!(datum instanceof this.Base)) datum = new this.Base(datum);
		if (!this.find(datum.getId())) this.set.push(datum);
	}, this);
};

Collection.prototype.count = function(){
	return this.set.length;
};

Collection.prototype.find = function(id){
	return this.set.filter(function(datum){
		return datum.getId() == id;
	})[0];
};

Collection.prototype.forEach = function(cb, bind){
	return this.set.forEach(cb, bind);
};

Collection.prototype.get = function(i){
	return this.set[i];
};

Collection.prototype.indexOf = function(datum){
	var id = datum.getId();
	for (var i = 0; i < this.set.length; i++) if (id == this.set[i].getId()){
		return i;
	}
	return -1;
};

Collection.prototype.map = function(cb, bind){
	return this.set.map(cb, bind);
};

Collection.prototype.last = function(){
	return this.set[this.set.length - 1];
};

Collection.prototype.push = function(datum){
	return this.set.push(datum);
};

Collection.prototype.remove = function(data){
	if (!data.pop) data = [data];
	var self = this;
	data.forEach(function(datum){
		if (!(datum instanceof self.Base)) datum = new self.Base(datum);
		var index = self.indexOf(datum);
		if (index > -1) self.set.splice(index, 1);
	});
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