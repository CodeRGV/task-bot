var should = require('should');
var sinon = require('sinon');
var date = require('date.js');

var config = require('../lib/config.js');

var Botkit = require('botkit');
var firebase = require('../storage/firebase.js');

var controller = Botkit.slackbot({
	debug: false,
	logLevel: 'emergency',
	storage: firebase({ firebase_uri: config('FIREBASE') })
});

var bot = controller.spawn({ token: config('TOKEN') });
var stub = sinon.stub(bot.api);
var Channel = require('../lib/Channel.js')({api: stub, controller: controller});;

describe('Channel model', function(){

	it('should find by id', function(done){

		var test = {id: 'find-me', name: 'Find Me Channel'}
		controller.storage.channels.save(test, function(err, res){
			
			Channel.find(test.id).then(function(channel){
				channel.getName().then(function(name){
					name.should.be.exactly(test.name);
					done();
				});
			});

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
		});
	});

});