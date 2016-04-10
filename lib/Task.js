var Q = require('q');
var date = require('date.js');


var Collection = require('./Collection.js');
var Task;

module.exports = function(controller){
	if (Task) return Task;
	
	var User = require('./User.js')(controller);
	var log = controller.log;

	Task = function(json){
		this.json = json || {};
		this.init();
	};

	Task.fromMessage = function(message){
		var task = {
			description: (match(message.text, /^add ([^#\[<]+)/i)[1] || '').trim(),
			section: (match(message.text, /#([\w-]+)/)[1] || '').trim(),
			due: (match(message.text, /\[([^\]]+)\]/)[1] || '').trim(),
			assigned: match(message.text, /<@([^>]+)>/ig).map(User.cleanId),
			creator: message.user,
			status: 'due',
			channel: message.channel,
			votes: 0,
			created: Date.now(),
			updated: Date.now()
		};
		
		log('understood: ' + JSON.format(task));

		task.section = task.section || 'all';
		task.due = date(task.due || 'in 7 days') * 1;
		if (!task.assigned.length) task.assigned = [message.user];

		return new Task(task);
	};

	Task.prototype.init = (function(perform){

		return function(){
			var self = this;
			for (var key in this.json) if (key in this.json && key in perform){
				perform[key].call(this, this.json[key]);
			}
		};

	})({

		assigned: function(users){
			this.json.assigned = new Collection(users, User);
		}

	});

	Task.prototype.toObject = function(){
		var object = {}, value;
		for (var key in this.json) if (key in this.json){
			value = this.json[key];
			if (value.toObject) value = value.toObject();
			object[key] = value;
		}
		return object;
	};

	Task.prototype.addTo = function(channel){
		var tasks = channel.getTasks();
		var last = tasks.last() || new Task();
		this.setId(last.getId() + 1);
		tasks.push(this);
	};

	Task.prototype.getAssigned = function(){
		return this.json.assigned || new Collection();
	};

	Task.prototype.setAssigned = function(assigned){
		if (!(assigned instanceof Collection)) assigned = new Collection(assigned, User);
		this.json.assigned = assigned;
	};

	Task.prototype.getCreated = function(){
		return this.json.created;
	};

	Task.prototype.setCreated = function(timestamp){
		this.json.created = timestamp;
	};

	Task.prototype.getCreator = function(){
		return this.json.creator;
	};

	Task.prototype.setCreator = function(timestamp){
		this.json.creator = timestamp;
	};

	Task.prototype.getDescription = function(){
		return this.json.description;
	};

	Task.prototype.setDescription = function(description){
		this.json.description = description;
	};

	Task.prototype.getDoneBy = function(){
		return this.json.doneBy || '';
	};

	// todo(ibolmo): use User
	Task.prototype.setDoneBy = function(user){
		this.json.doneBy = user;
	};

	Task.prototype.getDue = function(){
		return this.json.due;
	};

	Task.prototype.setDue = function(timestamp){
		this.json.due = timestamp;
	};

	Task.prototype.getId = function(){
		return this.json.id != null ? this.json.id : -1;
	};

	Task.prototype.setId = function(id){
		this.json.id = id;
	};

	Task.prototype.getSection = function(){
		return this.json.section;
	};

	// todo(ibolmo): when referring to #knownchannel in slack it'll return C**** coded name
	Task.prototype.setSection = function(section){
		this.json.section = section;
	};

	Task.prototype.getStatus = function(){
		return this.json.status;
	};

	// todo(ibolmo): when referring to #knownchannel in slack it'll return C**** coded name
	Task.prototype.setStatus = function(status){
		this.json.status = status;
		this.json.updated = Date.now();
	};

	Task.prototype.getUpdated = function(){
		return this.json.updated;
	};

	Task.prototype.setUpdated = function(timestamp){
		this.json.updated = timestamp;
	};

	Task.prototype.getUpdatedBy = function(){
		return this.json.updatedBy;
	};

	// todo(ibolmo): use User
	Task.prototype.setUpdatedBy = function(user){
		this.json.updatedBy = user;
	};

	return Task;
};

JSON.format = function(object){
	return JSON.stringify(object, null, '\t');
};

function match(string, regexp){
	return string.match(regexp) || [];
}
