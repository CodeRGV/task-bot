var config = require('./lib/config.js');

var os = require('os');
var date = require('date.js');
var fecha = require('fecha');
var Keen = require('keen-js');

var client = new Keen({
	projectId: config('KEEN_ID'),
	writeKey: config('KEEN_WRITE'),
	readKey: config('KEEN_READ')
});

var Botkit = require('botkit');
var firebase = require('./storage/firebase.js');

var DEBUG = config('DEBUG', os.hostname().indexOf('rhcloud') < 0),
	ALL = 'direct_message,direct_mention',
	TOKEN = config('TOKEN'),
	FIREBASE = config('FIREBASE'),
	TEAM_ID = config('TEAM_ID');

var express = require('express');
var app = express();
var http = require('http');

app.get('*', function(req, res){
	res.redirect('http://www.codergv.org/');
});

http.createServer(app).listen(config('PORT'), config('IP'), function() {
		console.log("✔ Express server listening at %s:%d ", config('IP'), config('PORT'));
});

var controller = Botkit.slackbot({
	debug: DEBUG,
	logLevel: DEBUG ? 'debug' : 'critical',
	storage: firebase({ firebase_uri: FIREBASE })
});

var storage = controller.storage;

controller.findTeamById(TEAM_ID, function(err, team){
	if (!team) controller.saveTeam({
		id: TEAM_ID,
		createdBy: 'olmo',
		url: 'codergv.slack.com',
		name: 'Code#RGV'
	});
});

var bot = controller.spawn({ token: TOKEN }).startRTM();

controller.hears(['^help'], ALL, function(bot, message) {
	bot.reply(message, [
		'*Usage*:',
		'> @task list',
		'> @task add {description} #section [1/1/2016] @name',
		'> @task finish|done|complete {id}',
		'> @task aid|assist {id}',
		'> @task abandon|drop {id}',
		//'> @task update {slug|id|search}',
		//'> @task note|comment {slug|id|search}',
		'> @task help',
		'',
		'For technical support: support@codergv.org'
	].join('\n'));
});


controller.hears(['^add'], ALL, function(bot, message) {

	var task = {
		description: (match(message.text, /^add ([^#\[<]+)/i)[1] || '').trim(),
		section: (match(message.text, /#([\w-]+)/)[1] || '').trim(),
		due: (match(message.text, /\[([^\]]+)\]/)[1] || '').trim(),
		assigned: match(message.text, /<@([^>]+)>/ig).map(function(user){
			return user.replace(/[<>@]/g, '');
		}),
		creator: message.user,
		status: 'due',
		channel: message.channel,

		votes: 0,
		created: Date.now(),
		updated: Date.now()
	};

	if (DEBUG) controller.log('understood: ' + JSON.format(task));

	task.section = task.section || 'all';
	task.due = date(task.due || 'in 7 days') * 1;
	if (!task.assigned.length) task.assigned = [message.user];

	if (DEBUG) controller.log('assuming: ' + JSON.format(task));

	storage.channels.get(message.channel, function(err, channel){
		if (!channel) channel = {tasks: []};
		channel.id = message.channel;
		if (!channel.tasks) channel.tasks = [];
		
		var last = channel.tasks.slice(-1)[0] || {id : -1};
		task.id = last.id + 1;
		channel.tasks.push(task);

		storage.channels.save(channel, function(err, channel){
			bot.reply(message, 'Task (id: ' + task.id + ') added.');

			client.addEvent('creates', {
				channel: message.channel,
				task_id: task.id,
				description: task.description,
				section: task.section,
				due: new Date(task.due).toISOString(),
				assigned: task.assigned,
				creator: task.creator,
				created: task.created,
				updated: task.updated
			});

			controller.trigger('task.added', [task]);
		});
	});
});


controller.hears(['^list'], ALL, function(bot, message) {
	var filter = !(match(message.text, /(all)$/i)[1] || '').trim()

	storage.channels.get(message.channel, function(err, channel){
		if (!channel) channel = {tasks: []};
		
		if (channel.tasks.length){
			var tasks = channel.tasks;
			if (filter){
				tasks = tasks.filter(function(task){
					return task.status !== 'done';
				});
			}

			tasks.sort(function(a, b){
				return new Date(a.due) > new Date(b.due);
			}).forEach(function(task){
				if (!task.assigned) task.assigned = [];
				if (!task.assigned.pop) task.assigned = task.assigned.replace(/[<>@ ]/g, '').split(',');

				var due = fecha.format(new Date(task.due), 'shortDate');
				var assigned = !task.assigned.length ? '_*none*_' : task.assigned.map(function(user){
					return '<@' + user + '>';
				}).join(' ');

				bot.reply(message, {
					text: [
						'_(' + task.id + ')_ ⋅ *' + due + '* ⋅ ' + 	assigned + ' (*' + task.status + '*)',
						'> ' + task.description
					].join('\n')
				});
			});

			controller.trigger('task.list');
		} else {
			bot.reply(message, 'No tasks recorded. "@task help" for usage.');
		}
	});
});


controller.hears(['^(finish)|(done)|(complete)'], ALL, function(bot, message) {
	var id = (match(message.text, /(\d+)$/i)[1] || '').trim();

	if (!id) return bot.reply(message, 'You need to provide a task id.');

	storage.channels.get(message.channel, function(err, channel){
		if (!channel) channel = {tasks: []};
		
		if (channel.tasks && channel.tasks.length){
			var task = channel.tasks.filter(function(task){
				return task.id == id;
			})[0];

			if (!task) return bot.reply(message, 'Could not find the task, by the id: ' + id + '. Try @task list again.');

			var task = channel.tasks[id * 1];
			task.status = 'done';
			task.doneBy = message.user;
			task.updated = Date.now();

			storage.channels.save(channel, function(err, channel){
				bot.reply(message, 'Updated task (' + id + ').');

				client.addEvent('dones', {
					channel: message.channel,
					task_id: task.id,
					section: task.section,
					due: new Date(task.due).toISOString(),
					delta: Date.now() - Number(new Date(task.due)),
					assigned: task.assigned,
					doneBy: task.doneBy
				});

				controller.trigger('task.done', [task]);
			});

		} else {
			bot.reply(message, 'No tasks recorded. "@task help" for usage.');
		}
	});
});


controller.hears(['^(aid)|(assists?)|(assign)'], ALL, function(bot, message){
	var id = (match(message.text, /(\d+)/i)[1] || '').trim();
	if (!id) return bot.reply(message, 'You need to provide a task id.');

	var assign = match(message.text, /<@([^>]+)>/ig).map(function(user){
		return user.replace(/[<>@]/g, '');
	});
	if (!assign.length) assign = [message.user];

	storage.channels.get(message.channel, function(err, channel){
		if (!channel) channel = {tasks: []};
		
		if (channel.tasks && channel.tasks.length){
			var index = -1;
			
			channel.tasks.some(function(task, i){
				controller.log(task.id + ', i: ' + i);
				if (task.id == id) {
					index = i;
					return true;
				}
			});

			if (index == -1) return bot.reply(message, 'Could not find the task, by the id: ' + id + '. Try @task list again.');

			var task = channel.tasks[index];
			task.assigned = Array.include(task.assigned, assign);
			task.updated = Date.now();

			storage.channels.save(channel, function(err, channel){
				bot.reply(message, 'Updated task (' + id + ').');

				client.addEvent('assigns', {
					channel: message.channel,
					task_id: task.id,
					helper: message.user
				});

				controller.trigger('task.assign', [task]);
			});

		} else {
			bot.reply(message, 'No tasks recorded. "@task help" for usage.');
		}
	});

});


controller.hears(['^(abandon)|(drop)'], ALL, function(bot, message){
	var id = (match(message.text, /(\d+)/i)[1] || '').trim();
	if (!id) return bot.reply(message, 'You need to provide a task id.');

	var assign = match(message.text, /<@([^>]+)>/ig).map(function(user){
		return user.replace(/[<>@]/g, '');
	});
	if (!assign.length) assign = [message.user];

	storage.channels.get(message.channel, function(err, channel){
		if (!channel) channel = {tasks: []};
		
		if (channel.tasks && channel.tasks.length){
			var index = -1;
			
			channel.tasks.some(function(task, i){
				if (task.id == id) {
					index = i;
					return true;
				}
			});

			if (index == -1) return bot.reply(message, 'Could not find the task, by the id: ' + id + '. Try @task list again.');

			var task = channel.tasks[index];
			task.assigned = Array.exclude(task.assigned, assign);
			task.updated = Date.now()

			storage.channels.save(channel, function(err){
				bot.reply(message, 'Updated task (' + id + ').');

				client.addEvent('abandons', {
					channel: channel.id,
					task_id: task.id,
					runaway: message.user
				});	

				controller.trigger('task.drop', [task]);
			});

		} else {
			bot.reply(message, 'No tasks recorded. "@task help" for usage.');
		}
	});

});


controller.hears(['uptime'],'direct_message,direct_mention,mention',function(bot, message) {
	var uptime = formatUptime(process.uptime());
	bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + '.');
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

JSON.format = function(object){
	return JSON.stringify(object, null, '\t');
};

Array.include = function(array, value){
	if (!value.pop) value = [value];
	value.forEach(function(val){
		if (array.indexOf(val) < 0) array.push(val);
	});
	return array;
};

Array.exclude = function(array, value){
	if (!value.pop) value = [value];
	value.forEach(function(val){
		var index = array.indexOf(val);
		if (index > -1) array.splice(index, 1);
	});
	return array;
};


module.exports = {
	app: app,
	bot: bot,
	controller: controller,
	storage: storage
};