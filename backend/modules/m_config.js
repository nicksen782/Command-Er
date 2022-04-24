const fs = require('fs');
// const path = require('path');

let _APP = null;

let _MOD = {
	config_srv_filename:"configs/config_srv.json",
	config_srv_extra_filename:"configs/config_srv_extra.json",
	config_srv:{},

	config_cmds_filename:"configs/config_cmds.json",
	config_cmds:{},

	config_terms_filename:"configs/config_terms.json",
	config_terms:{},

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to ledger.
			_APP = parent;
	
			// Get the config files. 
			await _MOD.read_srvConf();
			await _MOD.read_cmdConf();
			await _MOD.read_termsConf();
			
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		// 
		_APP.addToRouteList({ path: "/update_srvCmds.json", method: "get", args: ['json'], file: __filename, desc: "Updates srvCmds.json" });
		app.post('/update_srvCmds.json'    ,express.json(), async (req, res) => {
			// console.log(req.body);
			// console.log(req.query);
			res.send("NOT IMPLEMENTED YET");
			// res.json(_MOD.update_cmdConf(req.body.json));
		});

		_APP.addToRouteList({ path: "/getConfigs", method: "get", args: [], file: __filename, desc: "" });
		app.get('/getConfigs'    ,express.json(), async (req, res) => {
			let skips = ['env', 'cwd'];
			let filteredTerms = {};
			for(let key in _APP.m_config.config_terms){
				if(skips.indexOf(key) == -1){ filteredTerms[key] = _APP.m_config.config_terms[key]; }
			}

			res.json({
				"config_terms" : filteredTerms,
				"config_cmds"  : _APP.m_config.config_cmds,
			});
		});
	},

	read_srvConf: async function(){
		// Get the config file. 
		_MOD.config_srv = await JSON.parse( fs.readFileSync(_MOD.config_srv_filename, 'utf8'));
		
		// Add extra data.
		_MOD.config_srv["_serverFilePath"] = process.cwd() 
		_MOD.config_srv["_ppid"]           = process.ppid ;
		_MOD.config_srv["_pid" ]           = process.pid;
		_MOD.config_srv["_serverStarted"]  = `${new Date().toString().split(" GMT")[0]} `; // Thu Sep 30 2021 17:04:35
		
		// Is there an extra file? If so then add that file's contents also.
		if (fs.existsSync(_MOD.config_srv_extra_filename)) {
			// Get the config extra file. 
			let tmp = await JSON.parse( fs.readFileSync(_MOD.config_srv_extra_filename, 'utf8'));
			
			// Add the data.
			for(let key in tmp){ _MOD.config_srv[key]  = tmp[key]; }
		}
	},
	read_cmdConf: async function(){
		// If the file does not exist then use the example and write create the missing file. 
		if (!fs.existsSync(_MOD.config_cmds_filename)) {
			_MOD.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename + ".example", 'utf8'));
			fs.writeFileSync("_MOD.config_cmds_filename", JSON.stringify(_MOD.config_cmds,null,1));
		}
		// Return the file. 
		else{
			_MOD.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
		}
	},
	
	update_cmdConf: async function(){
		// _MOD.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
		console.log("NOT IMPLEMENTED YET");
	},

	read_termsConf: async function(){
		_MOD.config_terms = await JSON.parse( fs.readFileSync(_MOD.config_terms_filename, 'utf8'));
		_MOD.config_terms["cwd"] = process.env.PWD;
		_MOD.config_terms["env"] = process.env;
	},

};

module.exports = _MOD;