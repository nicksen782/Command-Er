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
	
	// COMMANDS (json and text)
	config_cmds_filename:"configs/config_cmds.json",
	config_cmds_filename_EX:"configs/examples/config_cmds.json.example",
	config_cmds:{},
	config_cmdsText_filename:"configs/config_cmds.text.json",
	config_cmdsText:"",
	
	// TERMINAL
	config_terms_filename:"configs/config_terms.json",
	config_terms_filename_EX:"configs/examples/config_terms.json.example",
	config_terms:{},

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Use the example files as defaults if files are missing.
			await _MOD.createDefaultsFromExamples();

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
		// _APP.addToRouteList({ path: "/update_srvCmds.json", method: "get", args: ['json'], file: __filename, desc: "Updates srvCmds.json" });
		// app.post('/update_srvCmds.json'    ,express.json(), async (req, res) => {
		// 	// console.log(req.body);
		// 	// console.log(req.query);
		// 	res.send("NOT IMPLEMENTED YET");
		// 	// res.json(_MOD.update_cmdConf(req.body.json));
		// });

		_APP.addToRouteList({ path: "/getConfigs", method: "get", args: [], file: __filename, desc: "Returns config_cmds.json" });
		app.get('/getConfigs'    ,express.json(), async (req, res) => {
			// Don't include certain keys.
			let skips = ['env', 'cwd'];
			let filteredTerms = {};
			for(let key in _APP.m_config.config_terms){
				if(skips.indexOf(key) == -1){ filteredTerms[key] = _APP.m_config.config_terms[key]; }
			}

			// Reload the command list if specified.
			if(req.query.reread_cmds == "true"){
				_APP.m_config.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
			}

			// Return the data.
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
				res.json(result);
			}
			catch(e){
				res.json(e);
			}
		});
	},

	create_config_cmdsText : function(srcJson){
		// Indentation.
		let tab = 4;
		let sectionIndent     = " ".repeat(tab * 1);
		let groupIndent       = " ".repeat(tab * 2);
		let cmdIndent         = " ".repeat(tab * 3);
		let cmdObjIndent      = " ".repeat(tab * 4);
		let cmdObjMultiIndent = " ".repeat(tab * 5);

		// Convert config_cmds to formatted JSON text.
		let text = "{\n";
		
		// Get the section keys. 
		let sectionKeys = Object.keys(srcJson);

		// For each section key...
		for(let sKey_i=0; sKey_i<sectionKeys.length; sKey_i+=1){
			// Get the section key.
			let sectionKey = sectionKeys[sKey_i];

			// Start the section key object.
			text += `${sectionIndent}"${sectionKey}": {\n`;

			// Get the groupKeys within this section.
			let groupKeys = Object.keys( srcJson[sectionKey] );

			// For each group key...
			for(let gKey_i=0; gKey_i<groupKeys.length; gKey_i+=1){
				// Get the groupKey.
				let groupKey = groupKeys[gKey_i];

				// Start the group key object.
				text += `${groupIndent}"${groupKey}": [\n`;

				// Get a handle to the list of commands.
				let commands = srcJson[sectionKey][groupKey];

				// For each command...
				for(let cmd_i=0; cmd_i<commands.length; cmd_i+=1){
					// Get a handle to this command.
					let cmd = commands[cmd_i];

					// Start the command object.
					text += `${cmdIndent}{\n`;

					// Fill in the command object.
					text += `${cmdObjIndent}`;
					text +=   `"title":`     + '"' + cmd['title']      + '"';
					text += `, "sendAs":`    + '"' + cmd['sendAs']     + '"';
					text += `, "hidden":`    + ''  + cmd['hidden']     + '' ;
					text += `, "pressCtrlC":`+ ''  + cmd['pressCtrlC'] + '' ;
					text += `, "pressEnter":`+ ''  + cmd['pressEnter'] + '' ;
					text += `, "cmdOrder":`  + '"' + cmd['cmdOrder']   + '"';
					text += `,\n`;

					// Format cmd array as line by line.
					if(Array.isArray(cmd.cmd)){
						text += `${cmdObjIndent}` + `"cmd"  :[\n`;
						cmd.cmd.forEach(function(d_d, d_i, d_a){
							text += `${cmdObjMultiIndent}`;
							text += `${JSON.stringify(d_d)}`;
							text += `${d_i+1==d_a.length ? `\n${cmdObjIndent}]`: ",\n"}`;
						});
					}
					// Format cmd single as one line.
					else{
						text += `${cmdObjIndent}`;
						text += `"cmd"  : ${JSON.stringify(cmd['cmd'])}`;
					}
					text += `\n`;
					text += `${cmdIndent}}${cmd_i+1==commands.length ? "\n": ",\n"}`;
				}
				text += `${groupIndent}]${gKey_i+1==groupKeys.length ? "\n": ",\n"}`;
			}
			text += `${sectionIndent}}${sKey_i+1==sectionKeys.length ? "\n": ",\n"}`;
		}
		text += "}\n";

		return text;
	},

	createDefaultsFromExamples: async function(){
		// If a file is missing then create it from it's example file. 

		// config_srv.json
		if (!fs.existsSync(_MOD.config_srv_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_srv_filename_EX, 'utf8'));
			fs.writeFileSync(_MOD.config_srv_filename, JSON.stringify(data,null,1));
		}

		// config_srv_extra.json.example
		if (!fs.existsSync(_MOD.config_srv_extra_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_srv_extra_filename_EX, 'utf8'));
			fs.writeFileSync(_MOD.config_srv_extra_filename, JSON.stringify(data,null,1));
		}

		// config_cmds.json
		if (!fs.existsSync(_MOD.config_cmds_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename_EX, 'utf8'));
			fs.writeFileSync(_MOD.config_cmds_filename, JSON.stringify(data,null,1));
		}

		// config_cmds.text.json
		if (!fs.existsSync(_MOD.config_cmdsText_filename)) {
			let data = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
			fs.writeFileSync(_MOD.config_cmdsText_filename, _MOD.create_config_cmdsText(data));
		}

		// config_terms.json
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
		// Read/Store the JSON. 
		_MOD.config_cmds = JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8') );

		// Read/Store the JSON text conversion.
		_APP.m_config.config_cmdsText = fs.readFileSync(_MOD.config_cmdsText_filename, 'utf8');
	},
	
	update_config_cmds: async function(body){
		// _MOD.config_cmds = await JSON.parse( fs.readFileSync(_MOD.config_cmds_filename, 'utf8'));
		return new Promise(async function(resolve,reject){
			// Is the JSON parsable?
			try{
				// Re-write the JSON to be more human-editable (fewer lines.)
				let srcJson = body;
				let newJsonText = _MOD.create_config_cmdsText(srcJson);

				// Write the file (JSON and text.).
				fs.writeFileSync(_MOD.config_cmds_filename, JSON.stringify(srcJson,null,1));
				fs.writeFileSync(_MOD.config_cmdsText_filename, newJsonText);

				// Update the in memory copies.
				_APP.m_config.config_cmds = srcJson;
				_APP.m_config.config_cmdsText = newJsonText;
				
				resolve({
					// "config_cmds"    : _APP.m_config.config_cmds,
					// "config_cmdsText": _APP.m_config.config_cmdsText,
					"data"           : "UPDATED"
				});
				// res.json("UPDATED");
			}
			catch(e){
				reject("ERROR: update_config_cmds: " + e);
				console.log("ERROR: update_config_cmds", e);
			}
		});
	},

	read_termsConf: async function(){
		// Read/create config_terms.
		_MOD.config_terms = await JSON.parse( fs.readFileSync(_MOD.config_terms_filename, 'utf8'));
		_MOD.config_terms["cwd"] = process.env.PWD;
		_MOD.config_terms["env"] = process.env;
		
		if( os.platform() == "win32" ){
			_MOD.config_terms["useConpty"] = true;
		}
	},

};

module.exports = _MOD;