var should = require('should');
var sinon = require('sinon');

var bot = require('../bot.js');

var stub;
var message = function(message, options){
	if (!options) options = {};

	bot.controller.trigger('direct_message', [stub, {
		'channel': options.channel || 'mocha',
		'user': options.user || 'mocha',
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
	});

	describe('@task (RTM API)', function(){
		it('should help', function(){
			message('help');
			stub.reply.called.should.be.true();
			(/Usage/i).test(stub.reply.firstCall).should.be.true();
		});

		it('should add tasks', function(){
			message('add a test task');
			stub.reply.called.should.be.true();
			console.log(stub.reply.firstCall)
			(/Task.*added/i).test(stub.reply.firstCall).should.be.true();
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
