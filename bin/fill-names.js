var os = require('os');
if (false && /rhc/.test(os.hostname())){
	console.log('You can only run this on the production server.');
	process.exit(1);
}

var config = require('../lib/config.js');

var Botkit = require('botkit');
var firebase = require('../storage/firebase.js');

var controller = Botkit.slackbot({
	debug: true,
	logLevel: 'debug',
	storage: firebase({ firebase_uri: config('FIREBASE') })
});

var bot = controller.spawn({ token: config('TOKEN') });
var storage = controller.storage;

var MAP = {
	C: 'channel',
	D: 'user',
	G: 'group'
}

storage.channels.all(function(err, channels){
	
	channels.forEach(function(channel){
		if (channel.name) return;

		var type = MAP[channel.id.charAt(0)];
		if (!type) return console.error('No type found for: ' + channel.id);

		var options = {};
		options[type] = channel.id;
		bot.api[type + 's'].info(options, function(err, res){
			if (err) return console.error(res);
			if (!res[type].name) return console.error('no name: ' + res[type].name + ' channel: ' + channel.id);

			channel.name = res[type].name;
			storage.channels.save(channel);
		});

	});

});