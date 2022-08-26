const fs = require('fs');
// const path = require('path');
const ping = require("ping");

let _APP = null;

let _MOD = {

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to ledger.
			_APP = parent;
	
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},

	uuidv4: function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16).toUpperCase();
		});
	},

	pingCheck: function(host, timeoutMs) {
		return new Promise(async function(resolve,reject){
			let timeoutSec = Math.floor(timeoutMs / 1000);
			let result = await ping.promise.probe(host, { timeout: timeoutSec, });
			resolve(result);
		});
	},

};

module.exports = _MOD;