var config = require('./config.js');
var os = require('os');

DEBUG = config('DEBUG', os.hostname().indexOf('rhcloud') < 0);

var Botkit = require('botkit');
var firebase = require('../storage/firebase.js');

var controller = Botkit.slackbot({
	debug: DEBUG,
	logLevel: DEBUG ? 'debug' : 'critical',
	storage: firebase({ firebase_uri: config('FIREBASE') })
});

controller.bot = controller.spawn({ token: config('TOKEN') });

module.exports = controller;