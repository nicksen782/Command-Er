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
			setInterval(_MOD.checkActiveConnections, 10000);
			// await _MOD.checkActiveConnections();

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
				_MOD.endTty(term.tty);
				term.ws.close();
			});
			
			// Remove the info.
			toRemove.info.forEach(function(info){
				info.ws.close();
			});

			resolve();
		});
	},

	checkActiveConnections: async function(){
		return new Promise(async function(resolve,reject){
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
				}
				else{
					counts.others[key.type] += 1;
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
			// resolve("Thanks for checking in: " + clientObj.id );
			resolve(clientObj.id);
		});
	},

	endTty : function(_tty){
		if (_tty) { 
			try{ 
				if( os.platform() == "win32" ){
					// console.log("close tty: windows", _tty.destroy);
					tty.onData = null;
					// _tty._close();
					// _tty.dispose(); 
					// _tty.destroy();
					_tty.kill(); 
					_tty = null;
				}
				else{
					// console.log("close tty: non-windows");
					// _tty._close();
					// _tty.dispose(); 
					// _tty.destroy();
					_tty.kill(9); 
					_tty = null;
				}
			} 
			catch(e){ }
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
			console.log(`Terminal exit: EVENT: ${JSON.stringify(event)}`);
			_MOD.endTty(tty);
			
			if(ws){ ws.close(); }
		} );
		
		//.Add the client. 
		let clientObj = _MOD.clients.get(ws);
		clientObj.tty = tty;
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
		
			console.log(`CLOSE : ${res.url}, ID:, ${clientObj.id}`);
		
			// Close the tty if it exists. 
			if (clientObj.tty) {
				_MOD.endTty(clientObj.tty);
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
		
			console.log(`CLOSE : ${res.url}, ID:, ${clientObj.id}`);

			_MOD.clients.delete(ws);
		} );
	},
};


module.exports = _MOD;