var Q = require('q');
var date = require('date.js');

module.exports = function(controller){
	
	var User = require('./User.js')(controller);
	var log = controller.log;

	var Task = function(json){
		this.json = json || {};
		this._family = 'task';
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

	Task.is = function(task){
		return task._family == 'task';
	};

	Task.prototype.toObject = function(){
		return this.json;
	};

	Task.prototype.getAssigned = function(){
		return this.json.assigned;
	};

	// todo(ibolmo): use User
	Task.prototype.setAssigned = function(assigned){
		this.json.assigned = assigned;
	};

	Task.prototype.getCreated = function(timestamp){
		return this.json.created;
	};

	Task.prototype.setCreated = function(timestamp){
		this.json.created = timestamp;
	};

	Task.prototype.getDescription = function(){
		return this.json.description;
	};

	Task.prototype.setDescription = function(description){
		this.json.description = description;
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
