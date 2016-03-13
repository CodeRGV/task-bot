var should = require('should');
var sinon = require('sinon');
var date = require('date.js');

process.env.DEBUG = false;
var bot = require('../bot.js');

var stub;
var message = function(message, options){
	if (!options) options = {};

	// replace @user to <@user> to mock Slack

	bot.controller.trigger('direct_message', [stub, {
		'channel': options.channel || 'mochachannel',
		'user': options.user || 'mochauser',
		'text': message,
	}]);
};

describe('TaskBot', function() {
	
	var sandbox;
	
	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		stub = sandbox.stub(bot.bot);
	});

	afterEach(function () {
		sandbox.restore();
		bot.controller.events['task.added'] = [];
	});

	describe('@task (RTM API)', function(){
		it('should help', function(){
			message('help');
			stub.reply.called.should.be.true();
			(/Usage/i).test(stub.reply.firstCall).should.be.true();
		});

		it('should add task with just description', function(done){
			var now = Date.now();
			var hour = 3600e3;

			bot.controller.on('task.added', function(task){
				stub.reply.called.should.be.true();
				(/Task.*added/i).test(stub.reply.firstCall).should.be.true();

				task.description.should.be.exactly('a test task');
				task.section.should.be.exactly('all');
				task.due.should.be.above(now);
				task.due.should.be.above(date('in 7 days') - hour);
				task.assigned.should.be.containEql('mochauser');
				task.creator.should.be.exactly('mochauser');
				task.status.should.be.exactly('due');

				done();
			});
			message('add a test task');
		});

		it('should add task with section', function(done){
			var now = Date.now();
			var hour = 3600e3;

			bot.controller.on('task.added', function(task){
				stub.reply.called.should.be.true();
				(/Task.*added/i).test(stub.reply.firstCall).should.be.true();

				task.description.should.be.exactly('a task with section');
				task.section.should.be.exactly('section-test');
				task.due.should.be.above(now);
				task.due.should.be.above(date('in 7 days') - hour);
				task.assigned.should.be.containEql('mochauser');
				task.creator.should.be.exactly('mochauser');
				task.status.should.be.exactly('due');

				done();
			});
			message('add a task with section #section-test');
		});

		it('should complete tasks', function(){

		});

		it('should assign tasks', function(){

		});

		it('should abandon tasks', function(){

		});

		it('should list tasks', function(){

		});
	});

	describe('WebServer', function(){
		it('should redirect all to Code RGV.', function(){

		})
	});

});
