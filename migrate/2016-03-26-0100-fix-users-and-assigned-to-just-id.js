var config = require('../lib/config.js');

var Botkit = require('botkit');
var firebase = require('../storage/firebase.js');

var controller = Botkit.slackbot({
	storage: firebase({ firebase_uri: config('FIREBASE') })
});

var bot = controller.spawn({ token: config('TOKEN') });
var storage = controller.storage;

var Channel = require('../lib/Channel.js')({api: bot.api, controller: controller});
var User = require('../lib/User.js')({api: bot.api, controller: controller});

Channel.all().then(function(channels){
	
	console.log(channels);

	channels.forEach(function(channel){

		var tasks = channel.getTasks().map(function(task, i){
			console.log(i);

			//*/
			if (!task.assigned.pop) task.assigned = task.assigned.split(/[, ]+/g);
			task.assigned = task.assigned.map(function(user){
				return user.replace(/[<>@]/g, '');
			});

			task.assigned.forEach(function(user){
				if (user) User.find(user);
			});
			if (task.creator) User.find(task.creator);
			//*/

			return task;
		});

		console.log('done')

		channel.setTasks(tasks);
		channel.save();

	});

}).fail(function(){
	console.log(arguments);
});