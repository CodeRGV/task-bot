require('dotenv').config({ path: __dirname + '/../.env' });

var get = (function(env){
	var map = {false: false, true: true};
	
	return function(key, value){
		if (env.get(key)) return env.get(key);
		if (key in process.env) value = process.env[key];
		if (value in map) value = map[value];
		return value;
	};

})(require('cloud-env'));

module.exports = function(key, value){
	if (key == 'IGNORE_BOT_USERS'){
		var i = 1, bots = [], bot;
		while (bot = get('IGNORE_BOT_USER' + i++)) bots.push(bot);
		return bots;
	}

	return get(key, value);
};


