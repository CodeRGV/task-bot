var os = require('os');
if (false && /rhc/.test(os.hostname())){
	console.log('You can only run this on the production server.');
	process.exit(1);
}

var config = require('../lib/config.js');

var BOT_USERS = config('IGNORE_BOT_USERS');

var Botkit = require('botkit');
var firebase = require('../storage/firebase.js');

var controller = Botkit.slackbot({
	debug: true,
	logLevel: 'debug',
	storage: firebase({ firebase_uri: config('FIREBASE') })
});

var bot = controller.spawn({ token: config('TOKEN') });
var storage = controller.storage;

storage.channels.all(function(err, channels){
	
	channels.forEach(function(channel){
		if (channel.id.charAt(0) != 'D' && channel.name) return;

		switch (channel.id.charAt(0)){
			case 'C':
				bot.api.channels.info({channel: channel.id}, function(err, res){
					if (err) return;
					channel.name = res.channel.name;
					storage.channels.save(channel);
				});
				break;
			case 'D':
				bot.api.im.history({channel: channel.id}, function(err, res){
					if (err) return;

					// don't include taskbot(s)
					var message = res.messages.filter(function(message){
						return BOT_USERS.indexOf(message.user) < 0;
					})[0];

					storage.users.get(message.user, function(err, user){
						if (!user){
							bot.api.users.info({user: message.user}, function(err, res){
								if (err) return;
								storage.users.save(res.user);
								channel.name = res.user.name;
								storage.channels.save(channel);
							});
						} else {
							channel.name = user.name;
							storage.channels.save(channel);
						}
					});
				});
			case 'G':
				bot.api.groups.info({channel: channel.id}, function(err, res){
					if (err) return;
					channel.name = res.group.name;
					storage.channels.save(channel);
				});
				break;
			default:
				console.error('unknown type for: ' + channel.id)
		}
	});

});