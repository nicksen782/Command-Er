// Packages for THIS module.
const fs   = require('fs');
const path = require('path'); 

// Modules saved within THIS module.
const m_config = require('./m_config.js');
const m_terms  = require('./m_terms.js');
const m_utils  = require('./m_utils.js');
const m_db     = require('./m_db.js');
const m_dbInit = require('./m_dbInit.js');
const m_cmdMgr = require('./m_cmdMgr.js');

// Main app.
let _APP = {
	// Express variables.
	app    : null,
	express: null,
	wss    : null,

	// Manual route list. (Emulates something like route annotations.)
	routeList: {}, 

	//
	db_type             : null,
	db_filepath         : null,
	db_filepath_default : 'backend/db/Command-Er.db', // Can be overriden by config.json.

	// MODULES (_APP will have access to all the modules.)
	m_config    : m_config ,
	m_terms     : m_terms ,
	m_utils     : m_utils ,
	m_db        : m_db ,
	m_dbInit    : m_dbInit ,
	m_cmdMgr    : m_cmdMgr ,

	// Init this module.
	module_init: function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to _APP.
			// _APP = parent;
			
			// Add routes.
			_APP.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		// Outputs a list of registered routes.
		_APP.addToRouteList({ path: "/getRoutePaths", method: "get", args: ['type'], file: __filename, desc: "Outputs a list of manually registered routes." });
		app.get('/getRoutePaths'    ,express.json(), async (req, res) => {
			let resp = _APP.getRoutePaths(req.query.type, app); 
			res.json(resp);
		});
	},

	// Add the _APP object to each required object.
	module_inits: function(){
		return new Promise(async function(resolve,reject){
			await _APP         .module_init(_APP);
			
			// DATABASE
			await _APP.m_db    .module_init(_APP);
			await _APP.m_dbInit.module_init(_APP);
			// await _APP.db_start("memory", '');
			await _APP.db_start("file", 'backend/db/Command-Er.db');
			
			await _APP.m_config.module_init(_APP);
			await _APP.m_terms .module_init(_APP);
			await _APP.m_utils .module_init(_APP);
			await _APP.m_cmdMgr.module_init(_APP);

			resolve();
		});
	},

	// Start the database connect and do db_init if needed.
	db_start: async function(type, db_filepath){
		return new Promise(async function(resolve,reject){
			if(type == "file"){
				_APP.db_type = type;
				_APP.db_filepath = db_filepath;

				console.log(`Database type: ${type}, "${_APP.db_filepath}"`);

				// If the file does not exist...
				if (!fs.existsSync(db_filepath)) {
					console.log(`  Database file not found. Creating and initing.`);

					// Create/Open it.
					await _APP.m_db.open(_APP.db_filepath);
					
					// Do a db_init.
					await _APP.m_dbInit.db_init();

					resolve(); return;
				}
				else{
					console.log(`  Database file found.`);

					// Open it.
					await _APP.m_db.open(_APP.db_filepath);

					resolve(); return;
				}
			}

			// If type is memory then open it as memory and do a db_init. 
			else if(type == "memory"){
				_APP.db_type = type;
				_APP.db_filepath = ":memory:";

				console.log(`Database type: ${type}, "${_APP.db_filepath}"`);
				console.log(`  NOTE: The in-memory database will NOT persist if you restart the server.`);
				
				// Open and init the in-memory database.
				await _APP.m_db.open(":memory:");
				await _APP.m_dbInit.db_init();

				resolve(); return;

			}
		});
	},

	// ROUTED: Outputs a list of registered routes.
	getRoutePaths : function(type="manual", app){
		let routes = app._router.stack.filter(r => r.route).map(r => r.route).map(function(r){
			let methods = [];
			for(let m in r.methods){
				methods.push(m);
			}
			return {
				method: methods.join(" "),
				path: r.path,
			};
		});

		switch(type){
			case "manual" : 
				return {
					manual: _APP.routeList,
				};
				break; 

			case "express": 
				return {
					express: routes,
				};
				break; 

			case "both"   : 
				// TODO: unmatched
				return {
					manual   : _APP.routeList,
					express : routes,
					unmatched: [],
				};
				break; 

			default: break; 
		}

		if(type=="manual"){
		}
	},

	// Adds a manual route entry to the routeList.
	addToRouteList : function(obj){
		let file = path.basename(obj.file);
		if(!_APP.routeList[file]){ _APP.routeList[file] = []; }
		_APP.routeList[file].push({
			path  : obj.path, 
			method: obj.method, 
			args  : obj.args,
			desc  : obj.desc,
		});
	},
};

// Save app and express to _APP and then return _APP.
module.exports = function(app, express, wss){
	_APP.app     = app;
	_APP.express = express;
	_APP.wss     = wss;
	return _APP;
};