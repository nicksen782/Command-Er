const os   = require('os');
const fs   = require('fs');
const Pty  = require('node-pty');

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
			const id = _APP.m_utils.uuidv4();
			console.log("New WebSocket connection for URL:", res.url, ", ID:", id);
			_MOD.clients.set( ws, { id } );
			let clientObj = _MOD.clients.get(ws);

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
			if (tty) { 
				try{ tty.kill(9); } catch(e){ }
				// tty.destroy();
				tty = null;
			}
			
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
		
			console.log("WebSocket connection close for id:", clientObj.id);
		
			// Close the tty if it exists. 
			if (clientObj.tty) {
				// Use try/catch to avoid "Error: Signals not supported on windows."
				try{ clientObj.tty.kill(9); } catch(e){ }
				clientObj.tty.destroy();
				clientObj.tty = null;
			}
		
			// Remove the ws from the clients. 
			_MOD.clients.delete(ws);
			ws = null;
		};
		ws.addEventListener('close'  , f_close);
		
		// Handle errors of the websocket. 
		let f_error   = function(event){
			let clientObj = _MOD.clients.get(ws);
			console.log("f_error:", event);
		};
		ws.addEventListener('error'  , f_error);
	},
	
	
	remoteInfo : function(ws, res){
		let clientObj = _MOD.clients.get(ws);
		clientObj.type = "info";

		let ws_connections = async function(){
			let ret = [];
			_MOD.clients.forEach(function(key, val){
				ret.push({
					type : key.type,
					id   : key.id, 
				});
			});
			return ret;
		};
		let vpnCheck = async function(event){
			return new Promise(async function(resolve,reject){
				let ret = {};
				
				// VPN STATUS
				let obj = _APP.m_config.config_srv.connectionCheck;
				if(obj && obj.active && obj.url){
					let result = await _APP.m_utils.pingCheck(obj.url, 1000);
					ret = {
						// vpnActive   : event.data,
						name        : obj.name,
						active      : obj.active,
						alive       : result.alive,
						time        : result.time,
						numeric_host: result.numeric_host,
					};
					resolve(ret);
				}
				// Config is set to not check this.
				else{
					ret = {
						name        : obj.name,
						active      : obj.active,
						alive       : false,
						time        : false,
						numeric_host: "",
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
					retObj.ws_connections = ws_connections();
					if(ws){ ws.send( JSON.stringify(retObj,null,1) ); }
					break; 
				};
				case "vpnCheck"      : { 
					retObj.vpnCheck = await vpnCheck(event);
					if(ws){ ws.send( JSON.stringify(retObj,null,1) ); }
					break; 
				};
				case "ws_connections" : { 
					retObj.ws_connections = ws_connections();
					if(ws){ ws.send( JSON.stringify(retObj,null,1) ); }
					break; 
				};
				default: { 
					if(ws){ ws.send( JSON.stringify(retObj,null,1) ); }
					break; 
				}
			};

		});
		ws.addEventListener('close'  , function(){
			_MOD.clients.delete(ws);
			ws = null;
		} );
	},
};


module.exports = _MOD;