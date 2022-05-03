const os   = require('os');
const fs   = require('fs');
const Pty  = require('node-pty');
// const EventEmitter=require('events');

// const path = require('path');

let _APP = null;

let _MOD = {
	//
	shell: null,
	ttyConfObj : null,
	checkActiveConnections_timeout : 90 * 1000,

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
			setInterval(_MOD.checkActiveConnections, _MOD.checkActiveConnections_timeout);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},

	addWsListeners(){
		_APP.addToRouteList({ path: "/TERM", method: "ws", args: [], file: __filename, desc: "" });
		_APP.addToRouteList({ path: "/INFO", method: "ws", args: [], file: __filename, desc: "" });

		// This will be called whenever a new WebSocket client connects to the server:
		_APP.wss.on('connection', function connection(ws, res) {
			// Create an id for this websocket. 
			let id ;
			if(res.url == "/INFO"){ 
				id = _APP.m_utils.uuidv4();
				// console.log("-------------------");
				console.log("");
				console.log("-".repeat(56));
				console.log("NEW PAGE LOAD      ", id);
				console.log("-".repeat(56));
				lastCheckin = Date.now();
				_MOD.clients.set( ws, { id, lastCheckin } );
			}
			else{
				if(res.url.indexOf("?") != -1){
					let url  = res.url.split("?")[0];
					id = res.url.split("?")[1];
					res.url = url;
					lastCheckin = Date.now();
					_MOD.clients.set( ws, { id, lastCheckin } );
				}
			}
			console.log(`OPEN  : ${res.url}, ID:, ${id}`);
			
			// let clientObj = _MOD.clients.get(ws);

			if(res.url == "/TERM"){ 
				_MOD.remoteTty(ws, res); 
			}
			else if(res.url == "/INFO"){ 
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
				clientObj.reason = "TIMEOUT";
				clientObj.closeThisTerm = true;
				_MOD.endTty(clientObj, null);
				term.ws.close();
			});
			
			// Remove the info.
			toRemove.info.forEach(function(info){
				let clientObj = _MOD.clients.get(info.ws);
				clientObj.reason = "TIMEOUT";
				info.ws.close();
			});

			resolve();
		});
	},

	checkActiveConnections: async function(){
		return new Promise(async function(resolve,reject){
			console.log("  --  checkActiveConnections");
			// Holds what may be closed.
			let toRemove = {
				"term": [],
				"info": [],
			};

			// Go through each client and look for an overdue checkin.
			_MOD.clients.forEach(function(key, val){
				if( Date.now() - key.lastCheckin > (15 * 1000) ){
					// console.log("Overdue!", key.type, key.id);
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

	clientCheckIn : async function(clientObj){
		// Find all the clients that match the id and update their lastCheckin time. 
		return new Promise(async function(resolve,reject){
			_MOD.clients.forEach(function(key, val){
				// Break-out the keys.
				let key1 = key.id;
				let key2 = clientObj.id;

				if(key1 == key2){
					// Updating time. 
					key.lastCheckin = Date.now();
				}
			});

			// Return the data.
			console.log(" -- clientCheckIn:  " + clientObj.id);
			resolve(" -- clientCheckIn: " + clientObj.id);
			resolve(clientObj.id);
		});
	},

	endTty : function(clientObj, event){
		// console.log("  " + "Terminal closed.", _tty ? "active" : "inactive");
		// console.log(`Terminal exit: EVENT: ${JSON.stringify(event)}`);
		if (clientObj.tty && clientObj.closeThisTerm == true && !clientObj.termIsClosed) { 
			try{ 
				if( os.platform() == "win32" ){
					// console.log("close tty: windows", clientObj.tty._isReady, clientObj.tty._pid, Object.keys(clientObj.tty));
					console.log("  close tty: windows", clientObj.tty._isReady, clientObj.tty._pid);
					// clientObj.tty.onData = null;
					clientObj.tty.onData( function(){ console.log("YOU SHOULD NOT SEE THIS"); } );
					// clientObj.tty._close();
					// clientObj.tty.dispose(); 
					// clientObj.tty.destroy();
					clientObj.tty.kill(); 
					// clientObj.tty = null;
					clientObj.termIsClosed = true;
				}
				else{
					console.log("  close tty: non-windows");
					// clientObj.tty.onData = null;
					clientObj.tty.onData( function(){ console.log("YOU SHOULD NOT SEE THIS"); } );
					// clientObj.tty._close();
					// clientObj.tty.dispose(); 
					// clientObj.tty.destroy();
					_tty.kill(9); 
					// clientObj.tty = null;
					clientObj.termIsClosed = true;
				}
			} 
			catch(e){ }
		}
		else{
			// console.log(`Terminal having id: ${clientObj.id} attempted disconnect but was not ready`);
			// console.log(`  ${clientObj.closeThisTerm} ${clientObj.termIsClosed}`);
		}
	},

	remoteTty : function(ws, res){
		// Create a tty.
		let tty = Pty.spawn(_MOD.shell, [], _MOD.ttyConfObj );
		
		// Send data from the tty to the websocket. 
		tty.onData( function(data) { 
			if(ws) { ws.send(data); }
		} );
		
		// On tty exist, close the tty and close the websocket. 
		tty.onExit( function(event) { 
			let clientObj = _MOD.clients.get(ws);
			// console.log(`CLOSE : ${res.url}, ID:, ${clientObj.id},`, clientObj.reason ? clientObj.reason : "-");

			if(clientObj){
				clientObj.closeThisTerm = true;
				_MOD.endTty(clientObj, event);
			}
			
			if(ws){ ws.close(); }
		} );
		
		//.Add the client. 
		let clientObj = _MOD.clients.get(ws);
		clientObj.tty = tty;
		clientObj.closeThisTerm = false;
		clientObj.termIsClosed = false;
		clientObj.type = "term";
		
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
			console.log(`CLOSE : ${res.url}, ID:, ${clientObj.id},`, clientObj.reason ? clientObj.reason : "-");
		
			// Close the tty if it exists. 
			if (clientObj.tty) {
				clientObj.closeThisTerm = true;
				_MOD.endTty(clientObj, null);
			}
		
			// Remove the ws from the clients. 
			_MOD.clients.delete(ws);
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
					retObj.vpnCheck = await vpnCheck(event);
					retObj.ws_connections = await _MOD.getConnectionCounts(clientObj);
					if(ws){ ws.send( JSON.stringify(retObj,null,1) ); }
					break; 
				};
				case "clientCheckIn" : { 
					let clientObj = _MOD.clients.get(ws);
					let resp = await _MOD.clientCheckIn(clientObj);
					if(ws){ ws.send( JSON.stringify(resp,null,1) ); }
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
			console.log(`CLOSE : ${res.url}, ID:, ${clientObj.id},`, clientObj.reason ? clientObj.reason : "-");

			_MOD.clients.delete(ws);
		} );
	},
};


module.exports = _MOD;