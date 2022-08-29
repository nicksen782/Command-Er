const fs = require('fs');
// const path = require('path');
const os   = require('os');
const WSServer = require('ws').WebSocketServer;

let _APP = null;

let _MOD = {
    moduleLoaded: false,

    ws:null,
    subscriptionKeys: [
        "TEST"
    ],

    // Init this module.
    module_init: async function(parent){
        return new Promise(async function(resolve,reject){
            if(!_MOD.moduleLoaded){
                // Save reference to the parent module.
                _APP = parent;
        
                _APP.consolelog("Node WebSockets Server", 2);
                if(_APP.m_config.config.toggles.isActive_nodeWsServer){
                    _APP.consolelog("Create Server", 4);
                    _MOD.createWebSocketsServer();

                    _APP.consolelog("Init Server", 4);
                    _MOD.initWss();
                }
                else{
                    _APP.consolelog("DISABLED IN CONFIG", 2);
                    _MOD.ws = null;
                }

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
        _APP.addToRouteList({ path: "SUBSCRIBE"        , method: "ws", args: [], file: __filename, desc: "(JSON): Subscript to event." });
        _APP.addToRouteList({ path: "UNSUBSCRIBE"      , method: "ws", args: [], file: __filename, desc: "(JSON): Unsubscribe from event." });
        _APP.addToRouteList({ path: "GET_SUBSCRIPTIONS", method: "ws", args: [], file: __filename, desc: "(JSON): Get list of active subscriptions." });
    },

    // **********
    createWebSocketsServer: function(){
        _MOD.ws = new WSServer({ server: _APP.server }); 
    },

    ws_statusCodes:{
        "1000": "Normal Closure",
        "1001": "Going Away",
        "1002": "Protocol error",
        "1003": "Unsupported Data",
        "1004": "Reserved",
        "1005": "No Status Rcvd",
        "1006": "Abnormal Closure",
        "1007": "Invalid frame payload data",
        "1008": "Policy Violation",
        "1009": "Message Too Big",
        "1010": "Mandatory Ext",
        "1011": "Internal Error",
        "1012": "Service Restart",
        "1013": "Try Again Later",
        "1014": "The server was acting as a gateway or proxy and received an invalid response from the upstream server. This is similar to 502 HTTP Status Code",
        "1015": "TLS handshake",
    },
    ws_readyStates:{
        "0":"CONNECTING",
        "1":"OPEN",
        "2":"CLOSING",
        "3":"CLOSED",
        "CONNECTING":0,
        "OPEN"      :1,
        "CLOSING"   :2,
        "CLOSED"    :3,
    },
    ws_event_handlers:{
        JSON:{
            SUBSCRIBE:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                _MOD.ws_utilities.addSubscription(ws, data.data);
            },
            UNSUBSCRIBE:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                _MOD.ws_utilities.removeSubscription(ws, data.data);
            },
            GET_SUBSCRIPTIONS:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);

                // Send the client's current subscription list. 
                ws.send(JSON.stringify({"mode":"GET_SUBSCRIPTIONS", "data":ws.subscriptions}));
            },

            // STATS1: async function(ws, data){
            //     console.log(`mode: ${data.mode}, data:`, data.data);
            // },
            // STATS2: async function(ws, data){
            //     console.log(`mode: ${data.mode}, data:`, data.data);
            // },
        },
        TEXT:{
        },
    },
    ws_utilities: {
        // Generate and return a uuid v4.
        uuidv4: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        // Returns a list of connected clients. 
        getClientCount: function(){
            // _APP.m_lcd.WebSocket.getClientCount();
            let i=0;
            _MOD.ws.clients.forEach(function each(ws) { 
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    i+=1 
                }
            });
            return i;
        },

        // Returns a list of connected clients that have the specified subscription. 
        getClientCount_bySubscription: function(eventType){
            // _APP.m_lcd.WebSocket.getClientCount_bySubscription("VRAM_CHANGES");
            let i=0;
            _MOD.ws.clients.forEach(function each(ws) { 
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    if(ws.subscriptions.indexOf(eventType) != -1){
                        i+=1 
                    }
                }
            });
            return i;
        },

        // Returns a list of connected client ids. 
        getClientIds: function(){
            // _APP.m_lcd.WebSocket.getClientIds();
            let arr={
                "connected":[],
                "disconnected":[],
            };
            _MOD.ws.clients.forEach(function each(ws) { 
                if (ws.readyState === _MOD.ws_readyStates.OPEN) { arr.connected.push(ws.id); }
                else{ arr.disconnected.push(ws.id) }
            });
            return arr;
        },
        
        // Sends the specified data to ALL connected clients. 
        sendToAll: function(data){
            // _APP.m_lcd.WebSocket.sendToAll("HEY EVERYONE!");
            _MOD.ws.clients.forEach(function each(ws) { 
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    ws.send(data); 
                }
            });
        },

        sendToAllSubscribers: function(data, eventType=""){
            // _APP.m_lcd.WebSocket.sendToAll("HEY EVERYONE!");
            _MOD.ws.clients.forEach(function each(ws) {
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    if(ws.subscriptions.indexOf(eventType) != -1){
                        ws.send(data); 
                    }
                }
            });
        },

        getSubscriptions  : function(ws)   { 
            // if(websocket.activeWs){ websocket.activeWs.send("GET_SUBSCRIPTIONS"); }
        },

        addSubscription   : function(ws, eventType){ 
            function conflictCheck(){
                switch(eventType){
                    //
                    // case "STATS1" : { break; }
                    // case "STATS2" : { break; }

                    //
                    default: { break; }
                }
            };

            // Only accept valid eventTypes.
            if(_MOD.subscriptionKeys.indexOf(eventType) != -1){
                // Add the eventType if it doesn't exist.
                if(ws.subscriptions.indexOf(eventType) == -1){
                    conflictCheck();
                    ws.subscriptions.push(eventType);
                }

                // Send the client's current subscription list. 
                ws.send(JSON.stringify({"mode":"SUBSCRIBE", "data":ws.subscriptions}));
            }
            else{
                console.log("Invalid subscription eventType provided:", eventType);
            }
        },
        
        removeSubscription: function(ws, eventType){ 
            // Only accept valid eventTypes.
            if(_MOD.subscriptionKeys.indexOf(eventType) != -1){
                // Remove the eventType if it exists.
                if(ws.subscriptions.indexOf(eventType) != -1){
                    ws.subscriptions = ws.subscriptions.filter(d=>d!=eventType);
                }

                // Send the client's current subscription list. 
                ws.send(JSON.stringify({"mode":"UNSUBSCRIBE", "data":ws.subscriptions}));
            }
            else{
                console.log("Invalid subscription eventType provided:", eventType);
            }
        },
    },
    ws_events:{
        el_message: function(ws, event){
            let data;
            let tests = { isJson: false, isText: false };

            // First, assume the data is JSON (verify this.)
            try{ data = JSON.parse(event.data); tests.isJson = true; }
            
            // Isn't JSON. Assume that it is text. 
            catch(e){ data = event.data; tests.isText = true; }

            if(tests.isJson){
                if(_MOD.ws_event_handlers.JSON[data.mode]){
                    _MOD.ws_event_handlers.JSON[data.mode](ws, data);
                }
                else{
                    ws.send(JSON.stringify({"mode":"ERROR", "data":"UNKNOWN MODE: " + data.mode}));
                    return; 
                }
            }
            else if(tests.isText){
                if(_MOD.ws_event_handlers.TEXT[data]){
                    _MOD.ws_event_handlers.TEXT[data](ws);
                }
                else{
                    ws.send(JSON.stringify({"mode":"ERROR", "data":"UNKNOWN MODE: " + data}));
                    return;
                }
            }
        },
        el_close  : function(ws, event){ 
            console.log("Node WebSockets Server: CLOSE  :", ws.id ); 
            ws.close(); 
            setTimeout(function(){
                ws.terminate(); 
                setTimeout(function(){
                    ws=null; 
                }, 1000);
            }, 1000);
        },
        el_error  : function(ws, event){ 
            console.log("Node WebSockets Server: ERROR  :", event); 
            ws.close(); 
            setTimeout(function(){
                ws.terminate(); 
                setTimeout(function(){
                    ws=null; 
                }, 1000);
            }, 1000);
        },
    },
    initWss: function(){
        _MOD.ws.on("connection", function connection(clientWs, res){
            // What type of connection is this? 
            
            // CONTROL
            if( res.url == "CONTROL"){
                // GENERATE A UNIQUE ID FOR THIS CONNECTION. 
                clientWs.id = _MOD.ws_utilities.uuidv4();

                // Add the config object to this ws object. 
                clientWs.CONFIG = {};
                
                // ADD THE SUBSCRIPTIONS ARRAY TO THIS CONNECTION. 
                clientWs.subscriptions = [];

                // AUTO-ADD SOME SUBSCRIPTIONS. 
                // _MOD.ws_utilities.addSubscription(clientWs, "STATS1");
                // _MOD.ws_utilities.addSubscription(clientWs, "STATS2");

                // Save this data to the clientWs for future use.
                clientWs.CONFIG.isTerm = false; 


                console.log("Node WebSockets Server: CONNECT:", clientWs.id);

                // SEND THE UUID.
                clientWs.send(JSON.stringify( {"mode":"NEWCONNECTION", data:clientWs.id } ));
                
                // SEND THE NEW CONNECTION MESSAGE.
                clientWs.send(JSON.stringify( {"mode":"WELCOMEMESSAGE", data:`WELCOME TO COMMAND-ER (CONTROL).`} ));

                // ADD EVENT LISTENERS.
                clientWs.addEventListener('message', (event)=>_MOD.ws_events.el_message(clientWs, event) );
                clientWs.addEventListener('close'  , (event)=>_MOD.ws_events.el_close  (clientWs, event) );
                clientWs.addEventListener('error'  , (event)=>_MOD.ws_events.el_error  (clientWs, event) );
            }

            // TERMINAL
            else {
                // Look at the url params.
                if(res.url.indexOf("?") != -1){
                    // Break-out the url params.
                    let url  = res.url.split("?")[0];
                    const urlSearchParams = new URLSearchParams(res.url.replace(url, ""));
                    const params          = Object.fromEntries(urlSearchParams.entries());

                    // These values are expected to be passed. Fail if any are missing.
                    if(!params.uuid  ){ console.log("ERROR: Missing uuid.");   return; }
                    if(!params.termId){ console.log("ERROR: Missing termId."); return; }
                    if(!params.type  ){ console.log("ERROR: Missing type.");   return; }

                    // Add the config object to this ws object. 
                    clientWs.CONFIG = {};
                
                    // ADD THE SUBSCRIPTIONS ARRAY TO THIS CONNECTION. 
                    // _MOD.ws_utilities.addSubscription(clientWs, "STATS1");
                    // _MOD.ws_utilities.addSubscription(clientWs, "STATS2");

                    // AUTO-ADD SOME SUBSCRIPTIONS. 
                    // _MOD.ws_utilities.addSubscription(clientWs, "TEST");

                    // Save this data to the clientWs for future use.
                    clientWs.CONFIG.isTerm    =  true; 
                    clientWs.CONFIG.uuid      =  params.uuid; 
                    clientWs.CONFIG.termId    =  params.termId; 
                    clientWs.CONFIG.type      =  params.type; 
                    clientWs.CONFIG.tty       =  null; 
                    clientWs.CONFIG.isClosing =  false; 

                    // Start the terminal. 
                    console.log(`OPEN  : term, uuid: ${uuid}, termId: ${termId}`);
                    _APP._m_terminals.startRemoteTty(clientWs, res);
                }
            }
        });
    },

};

module.exports = _MOD;