var should = require('should');
var sinon = require('sinon');
var date = require('date.js');

process.env.DEBUG = false;
process.env.TRACK = false;

var bot = require('../bot.js');
bot.storage = bot.controller.storage;

var stub;
var message = function(message, options){
	if (!options) options = {};

	// replace @user to <@user> to mock Slack
	message = message.replace(/@([^, ]+)/ig, function(match){
		return '<' + match + '>';
	});

	bot.controller.trigger('direct_message', [stub, {
		'channel': options.channel || 'mochachannel',
		'user': options.user || 'mochauser',
		'text': message,
	}]);
};

var ACTIONS = ['added', 'done', 'assign', 'drop', 'list', 'updated'];

describe('TaskBot', function() {
	
	var sandbox;

	before(function(done){
		bot.storage.channels.get('mochachannel', function(err, channel){
			if (!channel) channel = {id: 'mochachannel'};
			channel.tasks = [];
			bot.storage.channels.save(channel);
			done();
		});
	});
	
	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		stub = sandbox.stub(bot.controller.bot);
	});

	afterEach(function () {
		sandbox.restore();
		ACTIONS.forEach(function(action){
			bot.controller.events['task.' + action] = [];
		});
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

				task = task.toObject();
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

				task = task.toObject();
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

		it('should add task with due', function(done){
			var now = Date.now();
			var hour = 3600e3;

			bot.controller.on('task.added', function(task){
				stub.reply.called.should.be.true();
				(/Task.*added/i).test(stub.reply.firstCall).should.be.true();

				task = task.toObject();
				task.description.should.be.exactly('a task with due');
				task.section.should.be.exactly('all');
				task.due.should.be.above(now);
				task.due.should.be.above(date('in 3 days') - hour);
				task.due.should.be.below(date('in 4 days'));
				task.assigned.should.be.containEql('mochauser');
				task.creator.should.be.exactly('mochauser');
				task.status.should.be.exactly('due');

				done();
			});
			message('add a task with due [in 3 days]');
		});

		it('should add task with single assignment', function(done){
			var now = Date.now();
			var hour = 3600e3;

			bot.controller.on('task.added', function(task){
				stub.reply.called.should.be.true();
				(/Task.*added/i).test(stub.reply.firstCall).should.be.true();
				
				task = task.toObject();
				task.description.should.be.exactly('a task with assignment');
				task.section.should.be.exactly('all');
				task.due.should.be.above(now);
				task.due.should.be.above(date('in 7 days') - hour);
				task.assigned.should.be.containEql('otheruser');
				task.assigned.length.should.be.exactly(1);
				task.creator.should.be.exactly('mochauser');
				task.status.should.be.exactly('due');

				done();
			});
			message('add a task with assignment @otheruser');
		});

		it('should add task with multiple assignment', function(done){
			var now = Date.now();
			var hour = 3600e3;

			bot.controller.on('task.added', function(task){
				stub.reply.called.should.be.true();
				(/Task.*added/i).test(stub.reply.firstCall).should.be.true();

				task = task.toObject();
				task.description.should.be.exactly('a task with assignments');
				task.section.should.be.exactly('all');
				task.due.should.be.above(now);
				task.due.should.be.above(date('in 7 days') - hour);
				task.assigned.should.be.containEql('anotheruser');
				task.assigned.should.be.containEql('otheruser');
				task.assigned.length.should.be.exactly(2);
				task.creator.should.be.exactly('mochauser');
				task.status.should.be.exactly('due');

				done();
			});
			message('add a task with assignments @otheruser, @anotheruser');
		});

		it('should complete task', function(done){
			var id = -1;

			bot.controller.on('task.added', function(task){
				id = task.getId();
				message('done ' + task.getId());
			});

			bot.controller.on('task.done', function(task){
				(/Updated.*task/i).test(stub.reply.secondCall).should.be.true();

				task.getId().should.be.exactly(id);
				task.getStatus().should.be.exactly('done');
				done();
			});

			message('add a task done');
		});

		it('should assign to task implied', function(done){
			var id = -1;

			bot.controller.on('task.added', function(task){
				id = task.getId();
				message('assign ' + id);
			});

			bot.controller.on('task.assign', function(task){
				(/Updated.*task/i).test(stub.reply.secondCall).should.be.true();

				task.getId().should.be.exactly(id);
				task.getAssigned().should.be.containEql('mochauser');
				task.getAssigned().length.should.be.exactly(2);
				done();
			});

			message('add a task assign implied @otheruser');
		});

		it('should assign to task explicit', function(done){
			var id = -1;

			bot.controller.on('task.added', function(task){
				id = task.getId();
				message('assign ' + id + ' @otheruser');
			});

			bot.controller.on('task.assign', function(task){
				(/Updated.*task/i).test(stub.reply.secondCall).should.be.true();

				task.getId().should.be.exactly(id);
				task.getAssigned().should.be.containEql('otheruser');
				task.getAssigned().length.should.be.exactly(2);
				done();
			});

			message('add a task assign explicit');
		});

		it('should not duplicate assign', function(done){
			var id = -1;

			bot.controller.on('task.added', function(task){
				id = task.getId();
				message('assign ' + id);
			});

			bot.controller.on('task.assign', function(task){
				(/Updated.*task/i).test(stub.reply.secondCall).should.be.true();

				task.getId().should.be.exactly(id);
				task.getAssigned().should.containEql('mochauser');
				task.getAssigned().length.should.be.exactly(1);
				done();
			});

			message('add a task no duplicate');
		});

		it('should abandon tasks implicit', function(done){
			var id = -1;

			bot.controller.on('task.added', function(task){
				id = task.getId();
				message('drop ' + id);
			});

			bot.controller.on('task.drop', function(task){
				(/Updated.*task/i).test(stub.reply.secondCall).should.be.true();

				task.getId().should.be.exactly(id);
				task.getAssigned().length.should.be.exactly(0);
				done();
			});

			message('add a task abandon implicit');
		});


		it('should abandon tasks explicit', function(done){
			var id = -1;

			bot.controller.on('task.added', function(task){
				id = task.getId();
				message('drop ' + id + ' @otheruser');
			});

			bot.controller.on('task.drop', function(task){
				(/Updated.*task/i).test(stub.reply.secondCall).should.be.true();

				task.getId().should.be.exactly(id);
				task.getAssigned().should.containEql('mochauser');
				task.getAssigned().length.should.be.exactly(1);
				done();
			});

			message('add a task abandon explicit @otheruser, @mochauser');
		});

		it('should list tasks', function(done){
			bot.controller.on('task.added', function(task){
				task = task.toObject();
				if (task.description == 'task1') message('add task2'); 
				if (task.description == 'task2') message('list');
			});

			bot.controller.on('task.list', function(){
				var replies = stub.reply.getCalls().map(function(spy){
					return spy.args[1].text;
				}).join('\n');

				(/task1/i).test(replies).should.be.true();
				(/task2/i).test(replies).should.be.true();

				done();
			});

			message('add task1');
		});

		it('should update description of a task', function(done){
			bot.controller.on('task.added', function(task){
				task = task.toObject();
				task.description.should.be.exactly('task for description update');
				message('update ' + task.id + ' task for adjusted update');
			});

			bot.controller.on('task.updated', function(task){
				task = task.toObject();
				task.description.should.be.exactly('task for adjusted update');
				task.updatedBy.should.be.exactly('mochauser');

				done();
			});

			message('add task for description update');
		});

		it('should update assignment of a task', function(done){
			bot.controller.on('task.added', function(task){
				message('update ' + task.getId() + ' @otheruser');
			});

			bot.controller.on('task.updated', function(task){
				task = task.toObject();
				task.assigned.should.be.containEql('otheruser');
				task.assigned.length.should.be.exactly(1);
				done();
			});

			message('add task for assignment update');
		});

		it('should update due date of a task', function(done){
			bot.controller.on('task.added', function(task){
				message('update ' + task.getId() + ' [in 2 days]');
			});

			bot.controller.on('task.updated', function(task){
				task = task.toObject();
				task.due.should.be.above(date('tomorrow'));
				task.due.should.be.below(date('in 3 days'));
				done();
			});

			message('add task for due update');
		});

		it('should update section of a task', function(done){
			bot.controller.on('task.added', function(task){
				message('update ' + task.getId() + ' #section');
			});

			bot.controller.on('task.updated', function(task){
				task = task.toObject();
				task.section.should.be.exactly('section');
				done();
			});

			message('add task for section update');
		});

		it('should update all of task', function(done){
			bot.controller.on('task.added', function(task){
				message('update ' + task.getId() + ' new description #section [in 4 days] @otheruser @another');
			});

			bot.controller.on('task.updated', function(task){
				task = task.toObject();
				task.description.should.be.exactly('new description');
				task.assigned.should.be.containEql('otheruser');
				task.assigned.should.be.containEql('another');
				task.assigned.length.should.be.containEql(2);
				task.due.should.be.above(date('in 3 days'));
				task.due.should.be.below(date('in 5 days'));
				task.section.should.be.exactly('section');
				done();
			});

			message('add task for all update');
		});
	});

});
