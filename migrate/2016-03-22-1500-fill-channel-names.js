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

var Channel = require('../lib/Channel.js')({api: bot.api, controller: controller});

// see Channel.init checks for .name and fills from slack info
Channel.all();