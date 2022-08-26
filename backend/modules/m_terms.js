const os   = require('os');
const fs   = require('fs');
const Pty  = require('node-pty');
const getCurrentLine = require('get-current-line').default
// const EventEmitter=require('events');

// const path = require('path');

let _APP = null;

let _MOD = {
	//
	shell: null,
	ttyConfObj : null,
	checkActiveConnections_checkInterval        : 15 * 1000, // How often the active connections check should run.
	checkActiveConnections_disconnected_timeout : 70 * 1000, // 1 minute plus 10 seconds. Inactive browser tabs can check at most every 60 seconds. 

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to ledger.
			_APP = parent;
			
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);
		
			_MOD.shell = _APP.m_config.config_srv.shells[ os.platform() ] ;

			_MOD.ttyConfObj = _APP.m_config.config_terms;
			_MOD.clients = new Map();

			// WebSocket listeners
			_MOD.addWsListeners(_APP.app, _APP.express);

			// Check for disconnected clients. 
			await _MOD.checkActiveConnections();
			setInterval(_MOD.checkActiveConnections, _MOD.checkActiveConnections_checkInterval);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},

	addWsListeners(){
		_APP.addToRouteList({ path: "/INFO", method: "ws", args: [], file: __filename, desc: "Keeps track of clients." });
		_APP.addToRouteList({ path: "/TERM", method: "ws", args: [], file: __filename, desc: "Keeps track of terminals." });

		// This will be called whenever a new WebSocket client connects to the server:
		_APP.wss.on('connection', function connection(ws, res) {
			// Create an id for this websocket. 
			let id;
			let uuid;
			let termid;
			if(res.url == "/INFO"){ 
				id = _APP.m_utils.uuidv4();
				uuid = id;
				// console.log("-------------------");
				console.log("");
				console.log("-".repeat(56));
				console.log("NEW PAGE LOAD      ", id);
				console.log("-".repeat(56));
				lastCheckin = Date.now();
				_MOD.clients.set( ws, { id, uuid, lastCheckin } );
			}
			else{
				if(res.url.indexOf("?") != -1){
					let url  = res.url.split("?")[0];

					const urlSearchParams = new URLSearchParams(res.url.replace(url, ""));
					const params          = Object.fromEntries(urlSearchParams.entries());

					if(!params.uuid){
						console.log("ERROR: Missing uuid.");
						return;
					}
					if(!params.termid){
						console.log("ERROR: Missing termid.");
						return;
					}
					if(!params.type){
						console.log("ERROR: Missing type.");
						return;
					}
					
					id     =  params.uuid; 
					uuid   =  params.uuid; 
					termid =  params.termid; 
					type   =  params.type; 

					res.url = url;
					lastCheckin = Date.now();
					_MOD.clients.set( ws, { id, uuid, lastCheckin, termid, type } );
				}
			}
			// console.log(`OPEN  : url:${res.url}, uuid:${id}, termid:${termid}`);
			
			// let clientObj = _MOD.clients.get(ws);
			
			if(res.url == "/TERM"){ 
				console.log(`OPEN  : term, uuid: ${id}, termid: ${termid}`);
				_MOD.remoteTty(ws, res); 
			}
			else if(res.url == "/INFO"){ 
				console.log(`OPEN  : info, uuid: ${id}`);
				_MOD.remoteInfo(ws, res); 
			}
			else{
				console.log("Unknown URL");
			}
		});
	},

	ws_connections : async function(){
		let ret = [];
		_MOD.clients.forEach(function(key, val){
			ret.push({
				type        : key.type,
				id          : key.id, 
				lastCheckin : key.lastCheckin, 
			});
		});
		return ret;
	},

	removeAllInactiveConnections: async function(toRemove){
		return new Promise(async function(resolve,reject){
			// Remove the terms.
			toRemove.term.forEach(function(term){
				let clientObj = _MOD.clients.get(term.ws);
				// console.log(`removeAllInactiveConnections: termid: ${clientObj.termid} is about to be removed.`);
				clientObj.reason = "TIMEOUT: " + (Date.now() - clientObj.lastCheckin )/1000 + " seconds since last checkIn.";
				clientObj.closeThisTerm = true;
				_MOD.endTty(clientObj, null);
				// term.ws.close();
			});
			
			// Remove the info.
			toRemove.info.forEach(function(info){
				let clientObj = _MOD.clients.get(info.ws);
				clientObj.reason = "TIMEOUT: " + (Date.now() - clientObj.lastCheckin )/1000 + " seconds since last checkIn.";
				info.ws.close();
			});

			resolve();
		});
	},

	checkActiveConnections: async function(){
		return new Promise(async function(resolve,reject){
			// console.log("  --  checkActiveConnections");
			// Holds what may be closed.
			let toRemove = {
				"term": [],
				"info": [],
			};

			// Go through each client and look for an overdue checkin.
			_MOD.clients.forEach(function(key, val){
				if( Date.now() - key.lastCheckin > (_MOD.checkActiveConnections_disconnected_timeout) ){
					// console.log("Overdue!", key.type, key.id);
					// console.log(getCurrentLine().line, key.id, key.type);
					console.log(`About to close: ${key.type}, ${key.id}`);
					toRemove[key.type].push({
						ws  : val,
						id  : key.id,
						type: key.type,
						tty : key.tty,
					});
				}
			});

			// If there are any connections to remove then remove them.
			if(toRemove.term.length || toRemove.info.length){
				await _MOD.removeAllInactiveConnections(toRemove);
				resolve();
			}
			else{
				resolve();
			}

		});
	},

	getConnectionCounts : async function(clientObj){
		return new Promise(async function(resolve,reject){
			let counts = {
				"user": {
					"term": 0,
					"info": 0,
				},
				"others": {
					"term": 0,
					"info": 0,
				},
				"global":{
					"term": 0,
					"info": 0,
				},
				"pids":{
					"term": [],
					"info": [],
				}
			};
			
			_MOD.clients.forEach(function(key, val){
				// Updating count. 
				counts.global[key.type] += 1;
				
				// Break-out the keys.
				let key1 = key.id;
				let key2 = clientObj.id;

				// Updating count. 
				if(key1 == key2){
					counts.user[key.type] += 1;
					if(key.type == "term"){ counts.pids[key.type].push(key.tty._pid); }
				}
				else{
					counts.others[key.type] += 1;
					if(key.type == "term"){ counts.pids[key.type].push(key.tty._pid); }
				}
			});

			// Return the data.
			resolve({
				globalTerms : counts.global.term,
				globalInfos : counts.global.info,
				othersTerms : counts.others.term,
				othersInfos : counts.others.info,
				userTerms   : counts.user.term, 
				userInfos   : counts.user.info, 
				userId      : clientObj.id, 
				termPids    : counts.pids.term.sort().join(", "), 
			});
		});
	},
	getConnectionedClientData : async function(clientObj){
		return new Promise(async function(resolve,reject){
			let counts = {
				"user": {
					"term": 0,
					"info": 0,
				},
				"others": {
					"term": 0,
					"info": 0,
				},
				"global":{
					"term": 0,
					"info": 0,
				},
				"pids":{
					"term": [],
					"info": [],
				},
				"breakdown":{
					// [uuid] : {
					// 	"info":[],
					// 	"term":[],
					// }
				},
			};
			
			_MOD.clients.forEach(function(key, val){
				// Updating count. 
				counts.global[key.type] += 1;
				
				// Break-out the keys.
				let key1 = key.id;       // The uuid of the thing we are looking at.
				let key2 = clientObj.id; // The uuid of the client.

				if(!counts["breakdown"][key.id]){ counts["breakdown"][key.id] = { "info":[], "term":[] }; }
				if     (key.type == "info"){
					counts["breakdown"][key.id][key.type].push({
						"lastCheckin":  key.lastCheckin, 
					});
				}
				else if(key.type == "term"){
					counts["breakdown"][key.id][key.type].push({
						"lastCheckin":  key.lastCheckin, 
						"termid":       key.termid,
						"closeThisTerm":key.closeThisTerm,
						"termIsClosed": key.termIsClosed,
						"closeAttempts":key.closeAttempts,
						"_pid"         :key.tty._pid,
					});
				}

				// Updating count. 
				if(key1 == key2){
					counts.user[key.type] += 1;
					if(key.type == "term"){ 
						counts.pids[key.type].push(key.tty._pid); 
						// key.tty.termid
					}
				}
				else{
					counts.others[key.type] += 1;
					if(key.type == "term"){ 
						counts.pids[key.type].push(key.tty._pid); 
						// key.tty.termid
					}
				}
			});

			// Return the data.
			resolve({
				breakdown : counts.breakdown,
				globalTerms : counts.global.term,
				globalInfos : counts.global.info,
				othersTerms : counts.others.term,
				othersInfos : counts.others.info,
				userTerms   : counts.user.term, 
				userInfos   : counts.user.info, 
				userId      : clientObj.id, 
				termPids    : counts.pids.term.sort().join(", "), 
			});
		});
	},

	clientCheckIn : async function(clientObj){
		// Find all the clients that match the id and update their lastCheckin time. 
		return new Promise(async function(resolve,reject){
			_MOD.clients.forEach(function(key){
				// Break-out the keys.
				let key1 = key.id;
				let key2 = clientObj.id;

				if(key1 == key2){
					// Updating time. 
					// console.log(key.type, key.id, key.lastCheckin);
					key.lastCheckin = Date.now();
				}
			});

			// Return the data.
			// console.log(" -- clientCheckIn:  " + clientObj.id);
			// resolve(" -- clientCheckIn: " + clientObj.id);
			resolve(clientObj.id);
		});
	},

	endTty : function(clientObj, event){
		let closeFunc = function(){
			let sharedFunc = function(){
				// Stop the tty.
				if( os.platform() == "win32" ){ 
					try{ clientObj.tty.kill(); } catch(e){ console.log("xxxx e4:", os.platform(), e); }
				}
				else{ 
					try{ clientObj.tty.kill(9); } catch(e){ console.log("xxxx e4:", os.platform(), e); }
				}

				// Dispose the tty.
				// try{ clientObj.tty.onData.dispose(); } catch(e){ console.log("#### e5:", e); }

				// Remove the tty.
				try{ delete clientObj.tty; } catch(e){ console.log("____ e3:", e); }

				// Close the ws connection.
				try{ clientObj.ws.close();                } catch(e){ console.log("**** e1:", e); }

				// Delete from the clients. 
				try{ _MOD.clients.delete( clientObj.ws ); } catch(e){ console.log("---- e2:", e); }
			};
			clientObj.tty.onData( function(){ 
				clientObj.closeAttempts += 1;
				console.log(`YOU SHOULD NOT SEE THIS (${os.platform()})`, ", clientObj.closeAttempts:", clientObj.closeAttempts, "DATA:(", _data, ")"); 
				sharedFunc();
			} );
			
			clientObj.termIsClosed = true;
			clientObj.closeThisTerm = false;
			clientObj.closeAttempts += 1;
			console.log(`CLOSE : ${clientObj.type}, uuid: ${clientObj.id}, ${clientObj.reason}`, "_endTty_", new Date().toLocaleString(), `, termid: ${clientObj.termid}`);
			sharedFunc();
		};

		// Is the terminal in a state that can be closed?
		if (clientObj.tty && clientObj.closeThisTerm == true && !clientObj.termIsClosed) { 
			try{ 
				closeFunc();
			} 
			catch(e){ 
				console.log("error in closeFunc:", e);
			}
		}

		// No. 
		else{
			console.log(`WARNING: TERM: ${clientObj.id} attempted disconnect but was not ready. closeThisTerm: ${clientObj.closeThisTerm}, termIsClosed: ${clientObj.termIsClosed}`);
		}
	},

	remoteTty : function(ws, res){
		// Create a tty.
		let tty = Pty.spawn(_MOD.shell, [], _MOD.ttyConfObj );
		
		// Send data from the tty to the websocket. 
		tty.onData( function(data) { 
			if(ws) { ws.send(data); }
		} );
		
		// On tty exit, close the tty and close the websocket. 
		tty.onExit( function(event) { 
			let clientObj = _MOD.clients.get(ws);
			
			// Does the connection still exist in the list of clients?
			if(clientObj){
				// Is the term in a state that can be closed?
				if (clientObj.tty && !clientObj.termIsClosed) { 
					clientObj.closeThisTerm = true;
					if(!clientObj.reason) { clientObj.reason = "ttyExit occurred"; }
					// console.log(`tty.onExit: termid: ${clientObj.termid} is about to be removed.`);
					_MOD.endTty(clientObj, event);
				}
				// It is not. Don't try to close the terminal.
				else{
					console.log(`WARNING: tty.onExit: TERM: ${clientObj.id} attempted disconnect but was not ready. closeThisTerm: ${clientObj.closeThisTerm}, termIsClosed: ${clientObj.termIsClosed}`);
				}
			}

			// Client is missing. Term is likely already closed.
			else{
				// console.log("tty.onExit: Missing clientObj:", clientObj);
			}
		} );
		
		//.Add the client. 
		let clientObj = _MOD.clients.get(ws);
		
		ws.TERM = true;
		ws.UUID = clientObj.uuid;
		ws.TERMID = clientObj.termid;
		ws.TTY = tty;
		ws.TYPE = clientObj.type;

		clientObj.tty = tty;
		clientObj.closeThisTerm = false;
		clientObj.termIsClosed = false;
		clientObj.type = "term";
		clientObj.closeAttempts = 0;
		clientObj.ws = ws;
		
		// Handle messages from the websocket. 
		let f_message = function(event){
			// console.log("f_message:", event.data);
			// Get the data for this websocket.
			let clientObj = _MOD.clients.get(ws);
		
			// Send the data to the tty.
			clientObj.tty && clientObj.tty.write(event.data);
		};
		ws.addEventListener('message', f_message);
		
		// Handle the closing of the websocket. 
		let f_close   = function(event){
			// Get the data for this websocket.
			let clientObj = _MOD.clients.get(ws);
			
			// Close the tty if it exists. 
			if (clientObj && clientObj.tty && !clientObj.termIsClosed) { 
				clientObj.closeThisTerm = true;
				if(!clientObj.reason) { clientObj.reason = "websocket close"; }
				// console.log(`remoteTty: f_close: termid: ${clientObj.termid} is about to be removed.`);
				_MOD.endTty(clientObj, null);
			}
			else{
				// Delete from the clients. 
				try{ _MOD.clients.delete( ws ); } catch(e){ console.log("-/-/ e2:", e); }
			}
		
		};
		ws.addEventListener('close'  , f_close);
		
		// Handle errors of the websocket. 
		let f_error   = function(event){
			// let clientObj = _MOD.clients.get(ws);
			console.log("f_error:", event);
		};
		ws.addEventListener('error'  , f_error);
	},
	
	remoteInfo : async function(ws, res){
		let clientObj = _MOD.clients.get(ws);
		clientObj.type = "info";

		let vpnCheck = async function(event){
			return new Promise(async function(resolve,reject){
				let ret = {};
				
				// VPN STATUS
				let obj = _APP.m_config.config_srv.connectionCheck || {};
				if(obj && obj.active && obj.url){
					let result = await _APP.m_utils.pingCheck(obj.url, 1000);
					ret = {
						// vpnActive   : event.data,
						name        : obj.name,
						active      : obj.active,
						alive       : result.alive,
						time        : result.time,
						numeric_host: result.numeric_host,
						url         : obj.url,
					};
					resolve(ret);
				}
				// Config is set to not check this.
				else{
					ret = {
						name        : obj.name   || false,
						active      : obj.active || false,
						alive       : false,
						time        : false,
						numeric_host: "",
						url         : obj.url,
					};
					resolve(ret);
				}
			});
		};
	
		ws.addEventListener('message', async function(event){
			let retObj = {
				"request": event.data,
				"updated": new Date().getTime(),
			};

			switch(event.data){
				case "all"            : { 
					let clientObj = _MOD.clients.get(ws);
					retObj.vpnCheck = await vpnCheck(event);
					retObj.ws_connections = await _MOD.getConnectionedClientData(clientObj);
					if(ws){ ws.send( JSON.stringify(retObj,null,1) ); }
					break; 
				};
				case "clientCheckIn" : { 
					let clientObj = _MOD.clients.get(ws);
					let resp = await _MOD.clientCheckIn(clientObj);
					if(ws){ ws.send( JSON.stringify({"event": "clientCheckIn", "data": resp},null,1) ); }
					break; 
				};
				case "get_uuid" : { 
					let clientObj = _MOD.clients.get(ws);
					if(ws){ ws.send( JSON.stringify(clientObj.id,null,1) ); }
					break; 
				};
				default: { 
					if(ws){ ws.send( JSON.stringify(retObj,null,1) ); }
					break; 
				}
			};

		});

		ws.addEventListener('close'  , function(){
			// Get the data for this websocket.
			let clientObj = _MOD.clients.get(ws);
			console.log(`CLOSE : ${clientObj.type}, uuid: ${clientObj.id},`, clientObj.reason, "ws_close", new Date().toLocaleString());

			_MOD.clients.delete(ws);
		} );
	},
};


module.exports = _MOD;