var config = require('./lib/config.js');

var date = require('date.js');
var fecha = require('fecha');
var Keen = require('keen-js');

var client = new Keen({
	projectId: config('KEEN_ID'),
	writeKey: config('KEEN_WRITE'),
	readKey: config('KEEN_READ')
});

ALL = 'direct_message,direct_mention';
TRACK = config('TRACK', true);

var controller = require('./lib/Controller.js');
var storage = controller.storage;

var Channel = require('./lib/Channel.js')(controller);
var Task = require('./lib/Task.js')(controller);
var User = require('./lib/User.js')(controller);

controller.findTeamById(config('TEAM_ID'), function(err, team){
	if (!team) controller.saveTeam({
		id: TEAM_ID,
		createdBy: 'olmo',
		url: 'codergv.slack.com',
		name: 'Code#RGV'
	});
});

controller.hears(['^help'], ALL, function(bot, message) {
	bot.reply(message, [
		'*Usage*:',
		'> @task list',
		'> @task add {description} #section [1/1/2016] @name',
		'> @task finish|done|complete {id}',
		'> @task aid|assist {id}',
		'> @task abandon|drop {id}',
		'> @task update {id} {description} #section [1/1/2016] @name',
		//'> @task note|comment {slug|id|search}',
		'> @task help',
		'',
		'For technical support: support@codergv.org'
	].join('\n'));
});


controller.hears(['^add'], ALL, function(bot, message) {

	var task = Task.fromMessage(message);

	Channel.findOrCreate(message.channel).then(function(channel){
		task.addTo(channel);
		channel.save().then(function(){
			bot.reply(message, 'Task (id: ' + task.getId() + ') added.');
			controller.trigger('task.added', [task]);

			if (TRACK) channel.getName().then(function(name){
				return client.addEvent('creates', {
					channel: name,
					task_id: task.getId(),
					description: task.getDescription(),
					section: task.getSection(),
					due: new Date(task.getDue()).toISOString(),
					assigned: task.getAssigned().toObject(),
					creator: task.getCreator(),
					created: task.getCreated(),
					updated: task.getUpdated()
				});
			});
		}).done();

		return channel;
	});

});



controller.hears(['^update'], ALL, function(bot, message) {
	var id = (match(message.text, /^update *(\d+)/i)[1] || '').trim();
	if (!id) return bot.reply(message, 'You need to provide a task id.');

	Channel.findOrCreate(message.channel).then(function(channel){
		var tasks = channel.getTasks();
		if (!tasks.count()) return bot.reply(message, 'No tasks recorded. "@task help" for usage.');

		var task = tasks.find(id);
		if (!task) return bot.reply(message, 'Could not find the task, by the id: ' + id + '. Try @task list again.');

		var previous = Object.merge({}, task.toObject());

		task.setDescription((match(message.text, /^update *\d+ *([^#\[<]+)/i)[1] || '').trim())
		task.setSection((match(message.text, /#([\w-]+)/)[1] || '').trim() || 'all')
		task.setDue(date((match(message.text, /\[([^\]]+)\]/)[1] || '').trim() || 'in 7 days') * 1);
		task.setAssigned(match(message.text, /<@([^>]+)>/ig).map(User.cleanId));
		task.setUpdatedBy(message.user);
		task.setUpdated(Date.now());

		channel.save().then(function(){
			bot.reply(message, 'Updated task (' + task.id + ').');
			controller.trigger('task.updated', [task]);

			if (TRACK) channel.getName().then(function(name){
				return client.addEvent('updates', {
					channel: name,
					task_id: task.getId(),
					previous: previous,
					current: task.toObject(),
					updatedBy: task.getUpdatedBy()
				});
			});
		}).done();
	}).done();

});

controller.hears(['^list'], ALL, function(bot, message) {
	var filter = !(match(message.text, /(all)$/i)[1] || '').trim()

	Channel.findOrCreate(message.channel).then(function(channel){
		var tasks = channel.getTasks();
		if (!tasks.count()) return bot.reply(message, 'No tasks recorded. "@task help" for usage.');

		tasks.sort(function(a, b){
			return new Date(a.getDue()) > new Date(b.getDue());
		}).forEach(function(task){
			var due = fecha.format(new Date(task.getDue()), 'shortDate');
			var assigned = task.getAssigned().map(function(user){
				return '<@' + user + '>';
			}).join(' ');
			if (!assigned.length) assigned = '_*none*_'; 

			bot.reply(message, {
				text: [
					'_(' + task.getId() + ')_ ⋅ *' + due + '* ⋅ ' + 	assigned + ' (*' + task.getStatus() + '*)',
					'> ' + task.getDescription()
				].join('\n')
			});
		});

		controller.trigger('task.list');
	}).done();
});


controller.hears(['^(finish)|(done)|(complete)'], ALL, function(bot, message) {
	var id = (match(message.text, /(\d+)$/i)[1] || '').trim();
	if (!id) return bot.reply(message, 'You need to provide a task id.');

	Channel.findOrCreate(message.channel).then(function(channel){
		var tasks = channel.getTasks();
		if (!tasks.count()) return bot.reply(message, 'No tasks recorded. "@task help" for usage.');

		var task = tasks.find(id);
		if (!task) return bot.reply(message, 'Could not find the task, by the id: ' + id + '. Try @task list again.');

		task.setStatus('done');
		task.setDoneBy(message.user);

		channel.save().then(function(){
			bot.reply(message, 'Updated task (' + task.getId() + ').');
			controller.trigger('task.done', [task]);

			if (TRACK) channel.getName().then(function(name){
				client.addEvent('dones', {
					channel: name,
					task_id: task.getId(),
					section: task.getSection(),
					due: new Date(task.getDue()).toISOString(),
					delta: Date.now() - Number(new Date(task.getDue())),
					assigned: task.getAssigned().toObject(),
					doneBy: task.getDoneBy()
				});
			}).done();
		}).done();
	}).done();
});


controller.hears(['^(aid)|(assists?)|(assign)'], ALL, function(bot, message){
	var id = (match(message.text, /(\d+)/i)[1] || '').trim();
	if (!id) return bot.reply(message, 'You need to provide a task id.');

	var assign = match(message.text, /<@([^>]+)>/ig).map(User.cleanId);
	if (!assign.length) assign = [message.user];

	Channel.findOrCreate(message.channel).then(function(channel){
		var tasks = channel.getTasks();
		if (!tasks.count()) return bot.reply(message, 'No tasks recorded. "@task help" for usage.');

		var task = tasks.find(id);
		if (!task) return bot.reply(message, 'Could not find the task, by the id: ' + id + '. Try @task list again.');

		task.getAssigned().add(assign);

		channel.save().then(function(){
			bot.reply(message, 'Updated task (' + id + ').');
			controller.trigger('task.assign', [task]);

			if (TRACK) channel.getName().then(function(name){
				client.addEvent('assigns', {
					channel: name,
					task_id: task.getId(),
					helper: message.user
				});
			}).done();
		}).done();
	}).done();
});


controller.hears(['^(abandon)|(drop)'], ALL, function(bot, message){
	var id = (match(message.text, /(\d+)/i)[1] || '').trim();
	if (!id) return bot.reply(message, 'You need to provide a task id.');

	var assign = match(message.text, /<@([^>]+)>/ig).map(User.cleanId);
	if (!assign.length) assign = [message.user];

	Channel.findOrCreate(message.channel).then(function(channel){
		var tasks = channel.getTasks();
		if (!tasks.count()) return bot.reply(message, 'No tasks recorded. "@task help" for usage.');

		var task = tasks.find(id);
		if (!task) return bot.reply(message, 'Could not find the task, by the id: ' + id + '. Try @task list again.');

		task.getAssigned().remove(assign);

		channel.save().then(function(){
			bot.reply(message, 'Updated task (' + id + ').');
			controller.trigger('task.drop', [task]);

			if (TRACK) channel.getName().then(function(name){
				client.addEvent('abandons', {
					channel: name,
					task_id: task.getId(),
					runaway: message.user
				});	
			}).done();
		}).done();
	}).done();
});


controller.hears(['uptime'],'direct_message,direct_mention,mention',function(bot, message) {
	var uptime = formatUptime(process.uptime());
	bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + '.');
});


var express = require('express');
var livereload = require('express-livereload');
var app = express();
var http = require('http');

app.locals.moment = require('moment');

livereload(app, {watchDir: 'views'});

app.set('view engine', 'jade');

var COLUMNS = 'id description assigned due creator'.split(' ');

var secure = function(req, res, next){
	if (req.query.key == config('SECRET')) next();
	else res.redirect('http://www.codergv.org/');
};


app.get('/board', secure, function(req, res){
	
	Channel.all().then(function(channels){
		channels.waitForPending().then(function(){
			res.render('board', {
				channels: channels.toObject(),
				KEEN_ID: config('KEEN_ID'),
				KEEN_READ: config('KEEN_READ'),
			})
		}).done();
	}).done();

});

app.get('*', function(req, res){
	res.redirect('http://www.codergv.org/');
});

http.createServer(app).listen(config('PORT'), config('IP'), function() {
		console.log("✔ Express server listening at %s:%d ", config('IP'), config('PORT'));
});

function formatUptime(uptime) {
	var unit = 'second';
	if (uptime > 60) uptime /= 60, unit = 'minute';
	if (uptime > 60) uptime /= 60, unit = 'hour';
	if (uptime != 1) unit += 's';
	return uptime + ' ' + unit;
}

function match(string, regexp){
	return string.match(regexp) || [];
}

Object.merge = function(target, source){
	[].slice.call(arguments, 1).forEach(function(source){
		for (var key in source) if (key in source) target[key] = source[key];
	});
	return target;
};

module.exports = {
	app: app,
	controller: controller
};