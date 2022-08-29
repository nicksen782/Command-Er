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
            console.log("el_message:", event.data); 
            
            // Send the data to the tty.
            if( ws.CONFIG.tty && !ws.CONFIG.isClosing){
                ws.CONFIG.tty.write(event.data);
            }
        },
        el_close  : function(ws, event){ 
            console.log("el_close  :", event.data); 

            // Close the terminal.
            _MOD.endRemoteTty(ws);

        },
        el_error  : function(ws, event){ 
            console.log("el_error  :", event.data); 

            // Close the terminal.
            // _MOD.endRemoteTty(ws);
        },
    },

    startRemoteTty: function(ws, res){
        // Create a tty.
        let ttyConf  = _APP.m_config.config.terms;
        let ttyShell = ttyConf.shells["shellType"];
        let tty      = Pty.spawn(ttyShell, [], ttyConf );
    
        // Send data from the tty to the websocket. 
        tty.onData( function(data) { if(ws) { ws.send(data); } } );

        // On tty exit, close the tty and close the websocket. 
		tty.onExit( function(event) { 
            _MOD.endRemoteTty(ws);
        });

        // Save to the ws object.
        ws.CONFIG.tty = tty;

        // ADD EVENT LISTENERS.
        ws.addEventListener('message', (event)=>_MOD.ws_events.el_message(ws, event) );
        ws.addEventListener('close'  , (event)=>_MOD.ws_events.el_close  (ws, event) );
        ws.addEventListener('error'  , (event)=>_MOD.ws_events.el_error  (ws, event) );
        
    },
    endRemoteTty: function(ws){
        // Set the debugLine since it may be used multiple times. 
        let debugLine;
        try{
            debugLine = `platform: ${os.platform()}, uuid: ${ws.CONFIG.uuid}, type: ${ws.CONFIG.type}, termId: ${ws.CONFIG.termId}, isClosing: ${ws.CONFIG.isClosing}`;
        }
        catch(e){
            console.log(`ERROR: endRemoteTty: `, e);
        }

        // Check for the closing flag. Do not continue if it is already set.
        if(ws.CONFIG.isClosing) { 
            console.log("ERROR: endRemoteTty: This terminal is already in a closing state.", debugLine); 
            return; 
        }
        
        // Set the isClosing flag;
        ws.CONFIG.isClosing = true;

        // Replace the onData and exit functions. 
        ws.CONFIG.tty.onData( function(data) { console.log("ERROR: onData: This should not be seen.", debugLine, "data:", data); } );
        ws.CONFIG.tty.onExit( function(data) { console.log("ERROR: onExit: This should not be seen.", debugLine, "data:", data); } );

        // Close the terminal.
        if(os.platform == "win32"){ try{ ws.CONFIG.tty.kill() ; } catch(e){ console.log("ERROR: endRemoteTty: (close terminal)", debugLine, e); } }
        else                      { try{ ws.CONFIG.tty.kill(9); } catch(e){ console.log("ERROR: endRemoteTty: (close terminal)", debugLine, e); } }

        // Remove the tty from the ws object.
        try{ ws.CONFIG.tty = null; delete ws.CONFIG.tty; } 
        catch(e){ console.log("ERROR: endRemoteTty: (remove terminal)", os.platform(), e); }
        
        // Close the ws connection.
        try{ ws.close(); } catch(e){ console.log("ERROR: endRemoteTty: (close ws connection)", os.platform(), e); }

        // Terminal is closed.
        console.log("endRemoteTty: (Terminal is closed)", debugLine);

    },

};

module.exports = _MOD;