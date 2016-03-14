require('dotenv').config({ path: __dirname + '/../.env' });

module.exports = (function(env){
	
	var map = {false: false};
	
	return function(key, value){
		if (env.get(key)) return env.get(key);
		if (key in process.env) value = process.env[key];
		if (value in map) value = map[value];
		return value;
	};

})(require('cloud-env'));
