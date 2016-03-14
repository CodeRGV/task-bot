var config = require('../lib/config.js');

var Keen = require('keen-js');
var client = new Keen({
	projectId: config('KEEN_ID'),
	writeKey: config('KEEN_WRITE'),
	readKey: config('KEEN_READ')
});

var Botkit = require('botkit');
var firebase = require('../storage/firebase.js');

var controller = Botkit.slackbot({
	debug: true,
	logLevel: 'debug',
	storage: firebase({ firebase_uri: config('FIREBASE') })
});

var storage = controller.storage;

storage.channels.all(function(err, channels){

	var index, last = channels.length - 1;
	var waitToFinish = function(){
		if (index == last){
			console.log('done! (' + index + ', ' + last + ')');
			process.exit();
		}
	};

	channels.forEach(function(channel, i){

		channel.tasks.forEach(function(task){
			var assigned = task.assigned;
			if (!assigned.pop) assigned = assigned.replace(/[<>@ ]/g, '').split(',');

			if (task.status == 'due') client.addEvent('creates', {
				channel: channel.id,
				task_id: task.id,
				description: task.description,
				section: task.section,
				due: new Date(task.due).toISOString(),
				assigned: task.assigned,
				creator: task.creator,
				keen: {
					timestamp: new Date(task.created || (task.due - 7 * (60e3 * 60 * 24))).toISOString()
				}
			}, waitToFinish);

			if (task.status == 'done') client.addEvent('dones', {
				channel: channel.id,
				task_id: task.id,
				section: task.section,
				due: new Date(task.due).toISOString(),
				delta: Date.now() - Number(new Date(task.due)),
				assigned: task.assigned,
				doneBy: task.doneBy
			}, waitToFinish);

		});
		
		index = i;

	});

});