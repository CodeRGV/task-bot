var should = require('should');
var sinon = require('sinon');
var date = require('date.js');

var controller = require('../lib/Controller.js');
var stub = sinon.stub(controller.bot.api);

var Channel = require('../lib/Channel.js')(controller);
var Task = require('../lib/Task.js')(controller);

describe('Channel model', function(){

	it('should find by id', function(done){

		var test = {id: 'Channel-find-me', name: 'Find Me Channel'}
		controller.storage.channels.save(test, function(err){
			
			Channel.find(test.id).then(function(channel){
				channel.getName().then(function(name){
					name.should.be.exactly(test.name);
					done();
				});
			}).done();

		});
	});

	it('should return a defined name', function(done){

		controller.storage.channels.all(function(err, channels){
			var channel = new Channel({id: 'ChannelID', name: 'stuff'});

			channel.getName().then(function(name){
				name.should.be.exactly('stuff');
				done();
			});
		});

	});

	it('should resolve channel name, if not given', function(done){
		var id = 'ChannelTest';
		var test = 'Channel Test';

		stub.callAPI.withArgs('channels.info', {channel: id}).callsArgWith(2, null, {
			ok: true,
			channel: { id: id, name: test }
		});

		new Channel({id: id}).getName().then(function(name){
			name.should.be.exactly(test);
			done();
		});
	});

	it('should resolve group name, if not given', function(done){
		var id = 'GroupTest';
		var test = 'Group Test';

		stub.callAPI.withArgs('groups.info', {channel: id}).callsArgWith(2, null, {
			ok: true,
			group: { id: id, name: test }
		});

		new Channel({id: id}).getName().then(function(name){
			name.should.be.exactly(test);
			done();
		});
	});

	it('should resolve im name, if not given', function(done){
		var id = 'DirectMessage';
		var test = 'Direct message';

		stub.callAPI.withArgs('im.history', {channel: id}).callsArgWith(2, null, {
			ok: true,
			messages: [{ user: id }]
		});

		stub.callAPI.withArgs('users.info', {user: id}).callsArgWith(2, null, {
			ok: true,
    	user: {
        id: id,
        name: test
      }
		});

		new Channel({id: id}).getName().then(function(name){
			name.should.be.exactly(test);
			done();
		}).done();
	});

	it('should add a task', function(done){
		var channel = new Channel({id: 'ChannelTest', name: 'Channel Test'});
		var task = new Task({description: 'test task'});
		task.addTo(channel);
		channel.save().then(function(){
			var object = channel.toObject();
			object.tasks[0].id.should.be.exactly(0);
			object.tasks[0].description.should.be.exactly('test task');
			done();
		}).done();
	});

	it('should multiple tasks', function(done){
		var channel = new Channel({id: 'ChannelMultipleTasks', name: 'Channel multiple tasks'});
		var task1 = new Task({description: 'test task 1'});
		task1.addTo(channel);
		channel.save().then(function(){
			var task2 = new Task({description: 'test task 2'});
			task2.addTo(channel);
			channel.save().then(function(){
				var object = channel.toObject();

				object.tasks[0].id.should.be.exactly(0);
				object.tasks[0].description.should.be.exactly('test task 1');

				object.tasks[1].id.should.be.exactly(1);
				object.tasks[1].description.should.be.exactly('test task 2');
				done();
			});
		}).done();
	});

	it('should create a channel if not found', function(done){
		Channel.findOrCreate('CreateChannel').then(function(channel){
			channel.getId().should.be.exactly('CreateChannel');
			done();
		});
	});

	it('should find a channel already present', function(done){
		controller.storage.channels.save({id: 'ChannelPresent', random: 1}, function(err){
			Channel.findOrCreate('ChannelPresent').then(function(channel){
				channel = channel.toObject();
				channel.id.should.be.exactly('ChannelPresent');
				channel.random.should.be.exactly(1);
				done();
			}).done();
		});
	});

	it('should initialize tasks', function(done){
		controller.storage.channels.save({
			id: 'ChannelWithTasks',
			tasks: [{
				id: 0, description: 'task 1'
			}, {
				id: 1, description: 'task 2'
			}]
		}, function(){
			Channel.find('ChannelWithTasks').then(function(channel){
				var tasks = channel.getTasks(), task;

				task = tasks.get(0);
				(task instanceof Task).should.be.exactly(true);

				task = task.toObject();
				task.id.should.be.exactly(0);
				task.description.should.be.exactly('task 1');

				task = tasks.get(1);
				(task instanceof Task).should.be.exactly(true);

				task = task.toObject();
				task.id.should.be.exactly(1);
				task.description.should.be.exactly('task 2');

				done();
			}).done();
		});
	});
});