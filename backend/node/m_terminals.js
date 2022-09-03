const fs = require('fs');
const path = require('path');
const os   = require('os');
const Pty  = require('node-pty');

let _APP = null;

let _MOD = {
    moduleLoaded: false,

    // Init this module.
    module_init: async function(parent){
        return new Promise(async function(resolve,reject){
            if(!_MOD.moduleLoaded){
                // Save reference to the parent module.
                _APP = parent;
        
                // Add routes.
                _APP.consolelog("addRoutes", 2);
                _MOD.addRoutes(_APP.app, _APP.express);

                // Set the moduleLoaded flag.
                _MOD.moduleLoaded = true;
            }
            resolve();
        });
    },

    // Adds routes for this module.
    addRoutes: function(app, express){
    },

    // *****

    ws_events:{
        el_message: function(ws, event){ 
            // console.log("el_message:", event.data); 
            
            // Send the data to the tty.
            if( ws.CONFIG.tty && !ws.CONFIG.isClosing){
                ws.CONFIG.tty.write(event.data);
            }
        },
        el_close  : function(ws){ 
            // Close the terminal if it is still open.
            if(ws.CONFIG.tty && !ws.CONFIG.isClosing){
                console.log("WebSockets Server: CLOSE  :", ws.CONFIG.type.padEnd(7, " "), ws.CONFIG.uuid, ws.CONFIG.termId);

                // Set the isClosing flag;
                ws.CONFIG.isClosing = true;

                // End the tty and ws.
                _MOD.endRemoteTty(ws, "close");
            }

        },
        el_error  : function(ws, event){ 
            console.log("WebSockets Server: ERROR  :", ws.CONFIG.type.padEnd(7, " "), ws.CONFIG.uuid, ws.CONFIG.termId, event);

            // Close the terminal if it is still open.
            if(ws.CONFIG.tty && !ws.CONFIG.isClosing){
                // Set the isClosing flag;
                ws.CONFIG.isClosing = true;

                // End the tty and ws.
                _MOD.endRemoteTty(ws, "error");
            }
        },
    },

    startRemoteTty: function(ws, res){
        // Create a new tty.
        let cp_ttyConf  = Object.assign({}, _APP.m_config.config.terms);
        cp_ttyConf.env = process.env;
        let ttyShell = cp_ttyConf.shells[ cp_ttyConf["shellType"] ];

        // Set useConpty if on win32.
        if( os.platform() == "win32" ){ cp_ttyConf["useConpty"] = true; }

        let tty      = Pty.spawn(ttyShell, [], cp_ttyConf );
    
        // Send data from the tty to the websocket. 
        tty.onData( function(data) { if(ws) { ws.send(data); } } );

        // On tty exit, close the tty and close the websocket. 
		tty.onExit( function(event) { 
            console.log("exit was called", ws.readyState, ws.CONFIG.isClosing, ws.CONFIG.isClosed);
            // if(ws.CONFIG.tty && !ws.CONFIG.isClosing){
                // Set the isClosing flag;
                ws.CONFIG.isClosing = true;

                // End the tty and ws.
                _MOD.endRemoteTty(ws, "exit"); 
            // }
        });

        // Save to the ws object.
        ws.CONFIG.tty = tty;
        ws.CONFIG.pid = tty.pid;

        // ADD EVENT LISTENERS.
        ws.addEventListener('message', (event)=>_MOD.ws_events.el_message(ws, event) );
        ws.addEventListener('close'  , (event)=>_MOD.ws_events.el_close  (ws, event) );
        ws.addEventListener('error'  , (event)=>_MOD.ws_events.el_error  (ws, event) );
    },
    endRemoteTty: function(ws, type){
        // This function generates the debug line when called.
        // console.log("type:", type);
        let getDebugLine = function(){
            return `platform: ${os.platform()}, uuid: ${ws.CONFIG.uuid}, type: ${ws.CONFIG.type}, termId: ${ws.CONFIG.termId}, isClosing: ${ws.CONFIG.isClosing}`;
        };

        // Make sure that getDebugLine works. 
        try{ getDebugLine(); }
        catch(e){ console.log(`ERROR: endRemoteTty: getDebugLine:`, e); }
        
        // Check for the tty. If no tty then nothing to do. (el_close can be triggered twice. This prevents this function from running a second time for a given terminal/ws.)
        if(!ws.tty){
            // console.log("ERROR: endRemoteTty: This terminal is already closed.", getDebugLine()); 
            console.log(type);
            
            if(
                ws.readyState != _APP.m_websocket_node.ws_readyStates.CLOSING ||
                ws.readyState != _APP.m_websocket_node.ws_readyStates.CLOSED
            ){
                // Set the isClosed
                ws.CONFIG.isClosed=true;
                ws.close();
            }

            return;
        }

        // Replace the onData and exit functions. 
        ws.CONFIG.tty.onData( ()=>{} );
        ws.CONFIG.tty.onExit( ()=>{} );

        // Close the terminal (differently based on the server os).
        if(os.platform == "win32"){ try{ ws.CONFIG.tty.kill() ; } catch(e){ console.log("ERROR: endRemoteTty: (close terminal)", getDebugLine(), e); } }
        else                      { try{ ws.CONFIG.tty.kill(9); } catch(e){ console.log("ERROR: endRemoteTty: (close terminal)", getDebugLine(), e); } }

        // Clear the tty from the ws object.
        try{ ws.CONFIG.tty = null; } 
        catch(e){ console.log("ERROR: endRemoteTty: (remove terminal)", os.platform(), e); }
        
        // Close the ws connection.
        try{ 
            if(
                ws.readyState != _APP.m_websocket_node.ws_readyStates.CLOSING ||
                ws.readyState != _APP.m_websocket_node.ws_readyStates.CLOSED
            ){
                // console.log("Closing terminal websocket...");
                ws.close(); 
            }
        } 
        catch(e){ console.log("ERROR: endRemoteTty: (close ws connection)", os.platform(), e); }
        
        // Set the isClosed
        ws.CONFIG.isClosed=true;
        
        // Terminate the terminal's WebSocket connection.
        try{ ws.terminate(); }
        catch(e){ console.log("ERROR: endRemoteTty: (terminate ws connection)", os.platform(), e); }

        // Terminal is closed.
        console.log("WebSockets Server: CLOSE  :", ws.CONFIG.type.padEnd(7, " "), ws.CONFIG.uuid, ws.CONFIG.termId);
    },

};

module.exports = _MOD;