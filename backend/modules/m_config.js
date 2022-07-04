const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	// SERVER
	config_srv_filename:"configs/config_srv.json",
	config_srv_filename_EX:"configs/examples/config_srv.json.example",
	config_srv:{},
	
	// SERVER EXTRA
	config_srv_extra_filename:"configs/config_srv_extra.json",
	config_srv_extra_filename_EX:"configs/examples/config_srv_extra.json.example",
	
	// COMMANDS
	config_cmds_filename:"configs/config_cmds.json",
	config_cmds_filename_EX:"configs/examples/config_cmds.json.example",
	config_cmds:{},
	config_cmdsText:"",
	
	// TERMINAL
	config_terms_filename:"configs/config_terms.json",
	config_terms_filename_EX:"configs/examples/config_terms.json.example",
	config_terms:{},

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to ledger.
			_APP = parent;
	
			// Use the example files as defaults if files are missing.
			await _MOD.createDefaultsFromExamples();

			// Get the config files. 
			await _MOD.read_srvConf();
			await _MOD.read_cmdConf();
			await _MOD.read_termsConf();

			// Make JSON text conversion.
			_MOD.config_cmdsText = _MOD.create_config_cmdsText(_MOD.config_cmds);
			
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		// 
		// _APP.addToRouteList({ path: "/update_srvCmds.json", method: "get", args: ['json'], file: __filename, desc: "Updates srvCmds.json" });
		// app.post('/update_srvCmds.json'    ,express.json(), async (req, res) => {
		// 	// console.log(req.body);
		// 	// console.log(req.query);
		// 	res.send("NOT IMPLEMENTED YET");
		// 	// res.json(_MOD.update_cmdConf(req.body.json));
		// });

		_APP.addToRouteList({ path: "/getConfigs", method: "get", args: [], file: __filename, desc: "Returns config_cmds.json" });
		app.get('/getConfigs'    ,express.json(), async (req, res) => {
			let skips = ['env', 'cwd'];
			let filteredTerms = {};
			for(let key in _APP.m_config.config_terms){
				if(skips.indexOf(key) == -1){ filteredTerms[key] = _APP.m_config.config_terms[key]; }
			}

			// Reload the command list if specified.
			if(req.query.reread_cmds == "true"){
				_APP.m_config.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
			}

			res.json({
				"config_terms"    : filteredTerms,
				"config_cmds"     : _APP.m_config.config_cmds,
				"config_cmdsText" : _APP.m_config.config_cmdsText,
				"os"              : os.platform(),
			});
		});
		
		//
		_APP.addToRouteList({ path: "/update_config_cmds", method: "post", args: [], file: __filename, desc: "Updates config_cmds.json" });
		app.post('/update_config_cmds'    ,express.json(), async (req, res) => {
			try{ 
				let result = await _MOD.update_config_cmds(req.body); 
				console.log("result:", result);
				res.json(result);
			}
			catch(e){
				res.json(e);
			}
		});
	},

	create_config_cmdsText : function(srcJson){
		let newJsonText = "{\n";
		let sectionKeys = Object.keys(srcJson);
		for(let sKey_i=0; sKey_i<sectionKeys.length; sKey_i+=1){
			let sectionKey = sectionKeys[sKey_i];
			newJsonText += `  "${sectionKey}": {\n`;
			let groupKeys = Object.keys( srcJson[sectionKey] );
			for(let gKey_i=0; gKey_i<groupKeys.length; gKey_i+=1){
				let groupKey = groupKeys[gKey_i];
				let commands = srcJson[sectionKey][groupKey];
				newJsonText += `    "${groupKey}": [\n`;
				for(let cmd_i=0; cmd_i<commands.length; cmd_i+=1){
					newJsonText += `      {\n`;
					let cmd = commands[cmd_i];
					let cmd_keys = [
						"title",
						"sendAs",
						"hidden",
						"pressCtrlC",
						"pressEnter",
						"cmdOrder",
						"cmd",
					];
					newJsonText += `        `;
					newJsonText += `"title": "${    cmd['title']     }", `;
					newJsonText += `"sendAs":"${    cmd['sendAs']     }", `;
					newJsonText += `"hidden":${     cmd['hidden']     }, `;
					newJsonText += `"pressCtrlC":${ cmd['pressCtrlC'] }, `;
					newJsonText += `"pressEnter":${ cmd['pressEnter'] }, `;
					newJsonText += `"cmdOrder":"${  cmd['cmdOrder']  }", `;
					newJsonText += `\n`;
					newJsonText += `        `;
					if(Array.isArray(cmd.cmd)){
						newJsonText += `"cmd":[\n`;
						cmd.cmd.forEach(function(d_d, d_i, d_a){
							newJsonText += `           `;
							let thisCmd = d_d;
							newJsonText += `${JSON.stringify(thisCmd)}`;
							newJsonText += `${d_i+1==d_a.length ? "\n         ]": ",\n"}`;
						});
					}
					else{
						let thisCmd = cmd['cmd'];
						newJsonText += `"cmd"  : ${JSON.stringify(thisCmd)}`;
					}
					newJsonText += `\n`;

					newJsonText += `      }${cmd_i+1==commands.length ? "\n": ",\n"}`;
				}
				newJsonText += `    ]${gKey_i+1==groupKeys.length ? "\n": ",\n"}`;
			}
			newJsonText += `  }${sKey_i+1==sectionKeys.length ? "\n": ",\n"}`;
		}
		newJsonText += "}\n";

		return newJsonText;
	},

	createDefaultsFromExamples: async function(){
		// If a file is missing then create it from it's example file. 

		if (!fs.existsSync(_MOD.config_srv_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_srv_filename_EX, 'utf8'));
			fs.writeFileSync(_MOD.config_srv_filename, JSON.stringify(data,null,1));
		}
		if (!fs.existsSync(_MOD.config_srv_extra_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_srv_extra_filename_EX, 'utf8'));
			fs.writeFileSync(_MOD.config_srv_extra_filename, JSON.stringify(data,null,1));
		}
		if (!fs.existsSync(_MOD.config_cmds_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename_EX, 'utf8'));
			fs.writeFileSync(_MOD.config_cmds_filename, JSON.stringify(data,null,1));
		}
		if (!fs.existsSync(_MOD.config_terms_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_terms_filename_EX, 'utf8'));
			fs.writeFileSync(_MOD.config_terms_filename, JSON.stringify(data,null,1));
		}
	},

	read_srvConf: async function(){
		// Get the config file. 
		_MOD.config_srv = await JSON.parse( fs.readFileSync(_MOD.config_srv_filename, 'utf8'));
		
		// Add extra data.
		_MOD.config_srv["_serverFilePath"] = process.cwd() 
		_MOD.config_srv["_ppid"]           = process.ppid ;
		_MOD.config_srv["_pid" ]           = process.pid;
		_MOD.config_srv["_serverStarted"]  = `${new Date().toString().split(" GMT")[0]} `; // Thu Sep 30 2021 17:04:35
		
		// The config_srv_extra file can add new values and override existing ones. 

		// Get the config extra file. 
		let tmp = await JSON.parse( fs.readFileSync(_MOD.config_srv_extra_filename, 'utf8'));
		
		// Add the data.
		for(let key in tmp){ _MOD.config_srv[key]  = tmp[key]; }
	},
	read_cmdConf: async function(){
		// Return the file. 
		_MOD.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
	},
	
	update_config_cmds: async function(body){
		// _MOD.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
		return new Promise(async function(resolve,reject){
			// Is the JSON parsable?
			try{
				// Re-write the JSON to be more human-editable (fewer lines.)
				let srcJson = body;
				let newJsonText = _MOD.create_config_cmdsText(srcJson);

				// Write the file. 
				fs.writeFileSync(_MOD.config_cmds_filename, newJsonText);
				// fs.writeFileSync(_MOD.config_cmds_filename, JSON.stringify(srcJson,null,1));
				fs.writeFileSync(_MOD.config_cmds_filename+"_text.json", newJsonText);

				// Update the in memory copies.
				_APP.m_config.config_cmds = srcJson;
				_APP.m_config.config_cmdsText = newJsonText;
				resolve("UPDATED");
				// res.json("UPDATED");
			}
			catch(e){
				reject("Bad parse: " + e);
				console.log("Bad parse", e);
				// res.json("Bad parse");
			}
		});
	},

	read_termsConf: async function(){
		_MOD.config_terms = await JSON.parse( fs.readFileSync(_MOD.config_terms_filename, 'utf8'));
		_MOD.config_terms["cwd"] = process.env.PWD;
		_MOD.config_terms["env"] = process.env;
		
		if( os.platform() == "win32" ){
			_MOD.config_terms["useConpty"] = true;
		}
	},

};

module.exports = _MOD;