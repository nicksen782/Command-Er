const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		//
		_APP.addToRouteList({ path: "/getAll", method: "post", args: [], file: __filename, desc: "Get all records." });
		app.post('/getAll'    ,express.json(), async (req, res) => {
			let resp = await _MOD.getAll();
			res.json(resp);
		});
		
		//
		_APP.addToRouteList({ path: "/updateOneSection", method: "post", args: ["sId", "name", "order"], file: __filename, desc: "Update a section." });
		app.post('/updateOneSection'    ,express.json(), async (req, res) => {
			let resp = await _MOD.updateOneSection(req.body);
			res.json(resp);
		});

		//
		_APP.addToRouteList({ path: "/updateOneGroup", method: "post", args: ["sId", "gId", "name", "order"], file: __filename, desc: "Update a group" });
		app.post('/updateOneGroup'    ,express.json(), async (req, res) => {
			let resp = await _MOD.updateOneGroup(req.body);
			res.json(resp);
		});

		//
		_APP.addToRouteList({ path: "/updateOneCommand", method: "post", args: ["cId", "sId", "gId", "sectionName", "groupName", "title", "cmd", "f_ctrlc", "f_enter", "f_hidden", "order"], file: __filename, desc: "Update a command." });
		app.post('/updateOneCommand'    ,express.json(), async (req, res) => {
			let resp = await _MOD.updateOneCommand(req.body);
			res.json(resp);
		});

		//
		_APP.addToRouteList({ path: "/updateMultiGroups", method: "post", args: ["sId", "gId", "name", "order"], file: __filename, desc: "" });
		app.post('/updateMultiGroups'    ,express.json(), async (req, res) => {
			let resp = await _MOD.updateMultiGroups(req.body);
			res.json(resp);
		});

		//
		_APP.addToRouteList({ path: "/MINI/GETUNIQUEUUIDS", method: "post", args: ["cmd"], file: __filename, desc: "" });
		app.post('/MINI/GETUNIQUEUUIDS'    ,express.json(), async (req, res) => {
			let uuids = [];
			// TERM
			// TERMID
			// TTY
			// TYPE

			_APP.wss.clients.forEach(function each(ws) { 
				if (ws.readyState === 1 && ws.TERM && ws.TYPE == "MINI") {
					if(uuids.indexOf(ws.UUID) == -1){ uuids.push(ws.UUID); }
				}
			});
			res.json(uuids);
		});

		// /MINI/getStatus
		_APP.addToRouteList({ path: "/getStatus", method: "post", args: [], file: __filename, desc: "" });
		app.post('/getStatus'    ,express.json(), async (req, res) => {
			let availableClients = [];

			_APP.wss.clients.forEach(function each(ws) { 
				if (
					ws.readyState === 1 
					&& ws.TERM 
					&& ws.TYPE == "MINI"
				) {
					availableClients.push(ws.UUID);
				}
			});

			console.log("availableClients:", availableClients);
			res.json(availableClients);
			// let uuids = [];
			// // TERM
			// // TERMID
			// // TTY
			// // TYPE

			// _APP.wss.clients.forEach(function each(ws) { 
			// 	if (ws.readyState === 1 && ws.TERM && ws.TYPE == "MINI") {
			// 		if(uuids.indexOf(ws.UUID) == -1){ uuids.push(ws.UUID); }
			// 	}
			// });
			// res.json(uuids);
		});

		//
		_APP.addToRouteList({ path: "/MINI/RUNCMD", method: "post", args: ["cmd"], file: __filename, desc: "" });
		app.post('/MINI/RUNCMD'    ,express.json(), async (req, res) => {
			let target;
			_APP.wss.clients.forEach(function each(ws) { 
				if(target){ return; }
				if (
					ws.readyState === 1 
					&& ws.TERM 
					&& ws.UUID == req.body.uuid
					&& ws.TYPE == "MINI"
				) {
					target = ws;
					return;
				}
			});
			if(target){
				target.TTY.write(` ${req.body.cmd}\r\n`);
				res.json([`*SUCCESS* RUNCMD: uuid: ${req.body.uuid}, termid: ${target.TERMID}, cmd: ${req.body.cmd}`]);
			}
			else{
				res.json([`*FAILURE* RUNCMD: termid: ${req.body.termid}, cmd: ${req.body.cmd}`]);
			}
		});
	},

	// SELECTS
	getAll: function(){
		return new Promise(async function(resolve,reject){
			let q;
			let q1 = {
				"sql" : `
					SELECT
						sections.'sId', 
						sections.name,
						sections.'order'
					FROM sections
					-- ORDER BY sections.name ASC
					ORDER BY sections.sId ASC
					;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
				"params" : {},
				"type": "SELECT",
			};
			let q2 = {
				"sql" : `
					SELECT
						groups.'gId', 
						groups.'sId', 
						sections.name AS sectionName,
						groups.'gId', 
						groups.'name', 
						groups.'order'
					FROM groups
					LEFT JOIN sections ON sections.sId = groups.sId
					-- ORDER BY sections.name ASC
					ORDER BY sections.sId ASC
					;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
				"params" : {},
				"type": "SELECT",
			};
			let q3 = {
				"sql" : `
					SELECT
						commands.'cId', 
						commands.'sId', 
						commands.'gId', 
						sections.name AS sectionName,
						groups.name   AS groupName,
						commands.'title', 
						commands.'cmd', 
						commands.'f_ctrlc', 
						commands.'f_enter', 
						commands.'f_hidden',
						commands.'order'
					FROM commands
					LEFT JOIN sections ON sections.sId = commands.sId
					LEFT JOIN groups   ON groups.gId   = commands.gId
					-- ORDER BY sections.name ASC, groups.name ASC
					--ORDER BY commands.'sId' ASC, commands.'gId' ASC
					;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
				"params" : {},
				"type": "SELECT",
			};
	
			let results1 = await _APP.m_db.query(q1.sql, q1.params, q1.type); if(results1.err){ console.log(results1); reject(); return; }
			let results2 = await _APP.m_db.query(q2.sql, q2.params, q2.type); if(results2.err){ console.log(results2); reject(); return; }
			let results3 = await _APP.m_db.query(q3.sql, q3.params, q3.type); if(results3.err){ console.log(results3); reject(); return; }

			results1 = results1.rows;
			results2 = results2.rows;
			results3 = results3.rows;

			resolve({
				sections : results1,
				groups   : results2,
				commands : results3,
			});
		});
	},

 	// UPDATES
	updateOneSection: function(data){
		return new Promise(async function(resolve,reject){
			if(!data){ reject("Missing data."); return; }

			let q = {
				"sql" : `
					UPDATE 'sections'
					SET
						"name"  = :name,
						"order" = :order
					WHERE 
						"sId" = :sId 
					;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
				"params" : {
					":sId"   : data.sId,
					":name"  : data.name,
					":order" : data.order,
				},
				"type": "UPDATE",
			};
			let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
			resolve();
		});
	},
	updateOneGroup: function(data){
		return new Promise(async function(resolve,reject){
			if(!data){ reject("Missing data."); return; }
			
			let q = {
				"sql" : `
					UPDATE 'groups'
					SET
						"sId"   = :sId,
						"name"  = :name,
						"order" = :order
					WHERE 
						"gId" = :gId 
					;`.replace(/\t/g, " ").replace(/  +/g, "  ").replace(/\n/g, " "), 
				"params" : {
					":gId"   : data.gId,
					":sId"   : data.sId,
					":name"  : data.name,
					":order" : data.order,
				},
				"type": "UPDATE",
			};
			let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
			resolve(results);
		});
	},
	updateOneCommand: function(data){
		return new Promise(async function(resolve,reject){
			if(!data){ reject("Missing data."); return; }
			
			let q = {
				"sql" : `
					UPDATE 'commands'
					SET
						"sId"      = :sId,
						"gId"      = :gId,
						"title"    = :title,
						"cmd"      = :cmd,
						"f_ctrlc"  = :f_ctrlc,
						"f_enter"  = :f_enter,
						"f_hidden" = :f_hidden,
						"order"    = :order
					WHERE 
						commands.'cId' = :cId 
					;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
				"params" : {
					":cId"     : data.cid,
					":sId"     : data.sId,
					":gId"     : data.gId,
					":title"   : data.title,
					":cmd"     : data.cmd,
					":f_ctrlc" : data.f_ctrlc,
					":f_enter" : data.f_enter,
					":f_hidden": data.f_hidden,
					":order"   : data.order,
				},
				"type": "UPDATE",
			};
			let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
			resolve();
		});
	},

	updateMultiGroups: function(data){
		return new Promise(async function(resolve,reject){
			if(!data){ reject("Missing data."); return; }
			
			let proms = [];
			for(let i=0; i<data.length; i+=1){
				proms.push( 
					new Promise(async function(res,rej){ 
						let resp = await _MOD.updateOneGroup(data[i]); 
						// let resp = true; 
						// console.log( JSON.stringify(data[i]));
						res(resp); 
					}) 
				);
			}
			await Promise.all(proms);
			resolve(proms);
		});
	},

	// INSERTS

	// DELETES

	// FIND ORPHANS

	// ADMIN - conversion/backup/restore.
	convertJSONtoDB : function(){
		return new Promise(async function(resolve,reject){
			let src = _APP.m_config.config_cmds;
			
			let sections      = [];
			let section_index = 1;
			let sectionOrder  = 1;

			let groups      = [];
			let group_index = 1;
			let groupOrder  = 1;
			
			let commands = [];
			let commands_index = 1;
			let commandsOrder  = 1;

			for(let sectionKey in src){
				sections.push( 
					{ 
						"sId"   : section_index, 
						"name"  : sectionKey, 
						"order" : sectionOrder 
					}
				);
				
				groupOrder = 1;
				for(groupKey in src[sectionKey]){
					groups.push( 
						{ 
							"gId"   : group_index, 
							"sId"   : section_index, 
							"name"  : groupKey, 
							"order" : groupOrder 
						} 
					);

					commandsOrder = 0;
					for(let cmd_i=0; cmd_i < src[sectionKey][groupKey].length; cmd_i+=1){
						commands.push(
							{
								"cId"         : commands_index,
								"sId"         : section_index,
								"gId"         : group_index,
								"sectionName" : sectionKey,
								"groupName"   : groupKey,
								"title"       : src[sectionKey][groupKey][cmd_i].title,
								"cmd"         : src[sectionKey][groupKey][cmd_i].cmd,
								"f_ctrlc"     : src[sectionKey][groupKey][cmd_i].pressCtrlC ? true : false,
								"f_enter"     : src[sectionKey][groupKey][cmd_i].pressEnter ? true : false,
								"f_hidden"    : src[sectionKey][groupKey][cmd_i].hidden     ? true : false,
								"order"       : commandsOrder
							}
						);
						commands_index++;
						commandsOrder++;
					}

					group_index++;
					groupOrder++;
				}

				sectionOrder++;
				section_index++;
			}

			// console.log("sections:", sections);
			// console.log("groups  :", groups);
			// console.log("commands:", commands);

			let proms = [];
			for(let i = 0; i < sections.length; i += 1){
				proms.push( new Promise(async function(res,rej){ 
					let q = {
						"sql" : `
						INSERT INTO 'sections' ('sId', 'name', 'order')
						VALUES                 (:sId, :name, :order)
							;`.replace(/\t/g, " ").replace(/  +/g, "  "),
						"params" : {
							":sId"  : sections[i].sId,
							":name" : sections[i].name,
							":order": sections[i].order,
						},
						"type": "INSERT"
					}
					await _APP.m_db.query(q.sql, q.params, q.type); 
					res(); 
				}) );
			}

			for(let i = 0; i < groups.length; i += 1){
				proms.push( new Promise(async function(res,rej){ 
					let q = {
						"sql" : `
						INSERT INTO 'groups' ('gId', 'sId', 'name', 'order')
						VALUES               (:gId, :sId, :name, :order)
							;`.replace(/\t/g, " ").replace(/  +/g, "  "),
						"params" : {
							":gId"   : groups[i].gId,
							":sId"   : groups[i].sId,
							":name"  : groups[i].name,
							":order" : groups[i].order,
						},
						"type": "INSERT"
					}
					await _APP.m_db.query(q.sql, q.params, q.type); 
					res(); 
				}) );
			}

			for(let i = 0; i < commands.length; i += 1){
				proms.push( new Promise(async function(res,rej){ 
					let q = {
						"sql" : `
						INSERT INTO 'commands' ('cId', 'sId', 'gId', 'title', 'cmd', 'f_ctrlc', 'f_enter', 'f_hidden', 'order')
						VALUES                 (:cId , :sId , :gId , :title , :cmd , :f_ctrlc , :f_enter , :f_hidden , :order)
							;`.replace(/\t/g, " ").replace(/  +/g, "  "),
						"params" : {
							":cId"      : commands[i].cId,
							":sId"      : commands[i].sId,
							":gId"      : commands[i].gId,
							":title"    : commands[i].title,
							":cmd"      : commands[i].cmd,
							":f_ctrlc"  : commands[i].f_ctrlc,
							":f_enter"  : commands[i].f_enter,
							":f_hidden" : commands[i].f_hidden,
							":order"    : commands[i].order,
						},
						"type": "INSERT"
					}
					await _APP.m_db.query(q.sql, q.params, q.type); 
					res(); 
				}) );
			}

			await Promise.all(proms);
			resolve();
		});
	},
	convertDBtoJSONFile : function(){
		return new Promise(async function(resolve,reject){
			let resp = await _MOD.getAll();
			let dest = "configs/NEW_config_cmds.json";
			fs.writeFileSync(dest, JSON.stringify(resp,null,1));
			resolve();
		});
	},	
};

module.exports = _MOD;