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
        // ******************
        // Websockets routes.
        // ******************

        _APP.addToRouteList({ path: "SUBSCRIBE"                 , method: "ws", args: [], file: __filename, desc: "(JSON): Subscript to event." });
        _APP.addToRouteList({ path: "UNSUBSCRIBE"               , method: "ws", args: [], file: __filename, desc: "(JSON): Unsubscribe from event." });
        _APP.addToRouteList({ path: "GET_SUBSCRIPTIONS"         , method: "ws", args: [], file: __filename, desc: "(JSON): Get list of active subscriptions." });
        _APP.addToRouteList({ path: "GET_ONE_CMD"               , method: "ws", args: [], file: __filename, desc: "(JSON): GET_ONE_CMD." });
        _APP.addToRouteList({ path: "TYPE_CMD_TO_TERM"          , method: "ws", args: [], file: __filename, desc: "(JSON): TYPE_CMD_TO_TERM." });
        _APP.addToRouteList({ path: "UPDATE_ONE_SECTION"        , method: "ws", args: [], file: __filename, desc: "(JSON): UPDATE_ONE_SECTION." });
        _APP.addToRouteList({ path: "UPDATE_ONE_GROUP"          , method: "ws", args: [], file: __filename, desc: "(JSON): UPDATE_ONE_GROUP." });
        _APP.addToRouteList({ path: "UPDATE_ONE_COMMAND"        , method: "ws", args: [], file: __filename, desc: "(JSON): UPDATE_ONE_COMMAND." });
        _APP.addToRouteList({ path: "PING"                      , method: "ws", args: [], file: __filename, desc: "(TEXT): PING." });
        _APP.addToRouteList({ path: "PROCESS_EXIT"              , method: "ws", args: [], file: __filename, desc: "(TEXT): PROCESS_EXIT." });
        _APP.addToRouteList({ path: "CLIENT_COUNT"              , method: "ws", args: [], file: __filename, desc: "(TEXT): CLIENT_COUNT." });
        _APP.addToRouteList({ path: "SECTIONS_LIST"             , method: "ws", args: [], file: __filename, desc: "(TEXT): SECTIONS_LIST." });
        _APP.addToRouteList({ path: "CONNECTIVITY_STATUS_UPDATE", method: "ws", args: [], file: __filename, desc: "(TEXT): CONNECTIVITY_STATUS_UPDATE." });
        _APP.addToRouteList({ path: "GROUPS_LIST"               , method: "ws", args: [], file: __filename, desc: "(TEXT): GROUPS_LIST." });
        _APP.addToRouteList({ path: "COMMANDS_LIST"             , method: "ws", args: [], file: __filename, desc: "(TEXT): COMMANDS_LIST." });
        _APP.addToRouteList({ path: "GET_DB_AS_JSON"            , method: "ws", args: [], file: __filename, desc: "(TEXT): GET_DB_AS_JSON." });
        
        // ********************************************
        // HTTP routes. (Command-Er or Command-Er MINI.
        // ********************************************

        // /GET_DB_AS_JSON : Get DB as JSON.
        _APP.addToRouteList({ path: "/GET_DB_AS_JSON", method: "post", args: [], file: __filename, desc: "Get DB as JSON." });
        app.post('/GET_DB_AS_JSON'    ,express.json(), async (req, res) => {
            // Object to store the results. 
            let obj = {
                "sections" : [],
                "groups"   : [],
                "commands" : [],
            };

            // Get the data.
            let proms = [
                new Promise(async function(res,rej){ let resp = await _MOD.queries.SECTIONS_LIST(); obj.sections = resp; res(); }),
                new Promise(async function(res,rej){ let resp = await _MOD.queries.GROUPS_LIST();   obj.groups   = resp; res(); }),
                new Promise(async function(res,rej){ let resp = await _MOD.queries.COMMANDS_LIST(); obj.commands = resp; res(); }),
            ];

            // Wait for the data request to complete. 
            await Promise.all(proms);

            res.json(obj);
        });

        // ********************************************
        // HTTP routes. (Intended for Command-Er MINI).
        // ********************************************

        // /MINI/GET_UNIQUE_UUIDS : Clients connected to this Command-Er server.
        _APP.addToRouteList({ path: "/MINI/GET_UNIQUE_UUIDS", method: "post", args: [], file: __filename, desc: "Get clients connected to this Command-Er server." });
        app.post('/MINI/GET_UNIQUE_UUIDS'    ,express.json(), async (req, res) => {
            let uuids = [];
           _MOD.ws.clients.forEach(function each(ws) { 
                if (ws.readyState === 1 && ws.CONFIG.isTerm && ws.CONFIG.type == "MINI") {
                    if(uuids.indexOf(ws.CONFIG.uuid) == -1){ uuids.push(ws.CONFIG.uuid); }
                }
            });
            res.json(uuids);
        });
        
        // /MINI/GET_MINI_TERMS   : Get MINI terms connected to this Command-Er server.
        _APP.addToRouteList({ path: "/MINI/GET_MINI_TERMS", method: "post", args: [], file: __filename, desc: "Get MINI terms connected to this Command-Er server." });
        app.post('/MINI/GET_MINI_TERMS'    ,express.json(), async (req, res) => {
            let availableClients = [];

            _MOD.ws.clients.forEach(function each(ws) { 
                if (
                    ws.readyState === 1 
                    && ws.CONFIG.isTerm 
                    && ws.CONFIG.type == "MINI"
                ) {
                    availableClients.push(ws.CONFIG.uuid);
                }
            });

            res.json(availableClients);
        });
        
        // /MINI/RUNCMD           : Allows Command-Er MINI to request a command to be sent to a specific MINI term.
        _APP.addToRouteList({ path: "/MINI/RUNCMD", method: "post", args: [], file: __filename, desc: "Allows Command-Er MINI to request a command to be sent to a specific MINI term." });
        app.post('/MINI/RUNCMD'    ,express.json(), async (req, res) => {
            let target;
            let msg = ``;
            let infoLine;
            let r;

            // Look through each Websocket connect to find the target.
            _MOD.ws.clients.forEach(function each(ws) { 
                // If the target was already found then quit looking. 
                if(target){ return; }

                // Try to find the matching target.
                if (
                    ws.readyState === 1         // Is open.
                    && ws.CONFIG.isTerm                  // Is a term.
                    && ws.CONFIG.uuid == req.body.uuid // Matching UUID.
                    && ws.CONFIG.type == "MINI"        // Terminal type of "MINI".
                ) {
                    // Save the target. Stop looking. 
                    target = ws; return;
                }
            });

            // Was the matching target found? 
            if(target){
                infoLine = `RUNCMD: type: ${req.body.type}, uuid: ${req.body.uuid}, sId: ${req.body.sId}, gId: ${req.body.gId}, cId: ${req.body.cId}`;

                // Use ids to get from the database?
                if(req.body.type == "FROMCONFIG"){
                    // Use the sId, gId, and cId to get the actual command from the database.
                    r = await _MOD.queries.GET_ONE_CMD(req.body.sId, req.body.gId, req.body.cId);
                    if(r){
                        // Send the command. 
                        target.CONFIG.tty.write(` ${r.f_ctrlc ? "\u0003" : ""}${r.cmd}${r.f_enter ? "\r\n" : ""}`);
    
                        // Return a response.
                        msg = `*SUCCESS* ${infoLine}, cmd: ${r.cmd}`;
                        console.log(msg); 
                        res.json(msg);
                    }
                    else{
                        // Return a response.
                        msg = `*FAILURE* ${JSON.stringify(results)}, ${infoLine}`;
                        console.log(msg); 
                        res.json(msg);
                    }
                }

                // Raw command ("\r\n" (enter) must also be included if needed.)
                else if(req.body.type == "RAW"){
                    // Send the command. 
                    target.CONFIG.tty.write(` ${req.body.cmd}`);

                    // Return a response.
                    msg = `*SUCCESS* ${infoLine}, cmd: ${req.body.cmd}`;
                    console.log(msg); 
                    res.json(msg);
                }
                
                // FAIL. Not a known type. 
                else { 
                    msg = `INVALID TYPE: ${infoLine}`;
                    console.log(msg); 
                    res.json(msg);
                }
            }

            // FAIL. Target was NOT found.
            else{
                msg = `*FAILURE* TARGET NOT FOUND: RUNCMD: ${req.body.type}, uuid: ${req.body.uuid}, cId: ${req.body.cId}, cmd: ${req.body.cmd}`;
                console.log(msg); 
                res.json(msg);
            }
        });
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
            SUBSCRIBE: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                _MOD.ws_utilities.addSubscription(ws, data.data);
            },
            UNSUBSCRIBE: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                _MOD.ws_utilities.removeSubscription(ws, data.data);
            },
            GET_SUBSCRIPTIONS: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                
                // Send the client's current subscription list. 
                ws.send(JSON.stringify({"mode":"GET_SUBSCRIPTIONS", "data":ws.subscriptions}));
            },

            // TODO
            GET_ONE_CMD: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                let resp = await _MOD.queries.GET_ONE_CMD(data.data.sId, data.data.gId, data.data.cId);
                ws.send( JSON.stringify( { "mode":"GET_ONE_CMD", "data":resp } ) );
            },
            // TODO:
            TYPE_CMD_TO_TERM: async function(ws, data){
                console.log(`mode: ${data.mode}, data:`, data.data);
            },
            // TODO:
            UPDATE_ONE_SECTION: async function(ws, data){
                console.log(`mode: ${data.mode}, data:`, data.data);
                let obj = {
                    sId   : data.sId  ,
                    name  : data.name ,
                    order : data.order,
                };
                let resp = await _MOD.queries.UPDATE_ONE_SECTION(obj);
                ws.send( JSON.stringify( { "mode":"UPDATE_ONE_SECTION", "data":resp } ) );
            },
            // TODO:
            UPDATE_ONE_GROUP: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                
                // Break-out the data.
                let obj = {
                    gId   : data.data.gId  ,
                    sId   : data.data.updated.sId  ,
                    name  : data.data.updated.name ,
                    order : data.data.updated.order,
                };

                // Update the group in the database. 
                let resp = await _MOD.queries.UPDATE_ONE_GROUP(obj);

                // Get updated commands related to this group.
                let updatedCmds = await _MOD.queries.GET_CMDS_IN_GROUP(obj.gId);
                
                // Send back the status of the request and the updated group and related commands.
                ws.send( JSON.stringify( { 
                    "mode":"UPDATE_ONE_GROUP", 
                    "data":{
                        updatedRec : await _MOD.queries.GET_ONE_GROUP(obj.gId), 
                        updatedCmds: updatedCmds,
                        _err: resp.err ? resp.err : false
                    } 
                } ) );
            },

            // COMMAND UPDATE/ADD/REMOVE.
            UPDATE_ONE_COMMAND: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                
                // Break-out the data.
                let obj = {
                    "cId"     : data.data.cId,
                    "sId"     : data.data.updated.sId,
                    "gId"     : data.data.updated.gId,
                    "title"   : data.data.updated.title,
                    "cmd"     : data.data.updated.cmd,
                    "f_ctrlc" : data.data.updated.f_ctrlc,
                    "f_enter" : data.data.updated.f_enter,
                    "f_hidden": data.data.updated.f_hidden,
                    "order"   : data.data.updated.order,
                };

                // Update the command in the database. 
                let resp = await _MOD.queries.UPDATE_ONE_COMMAND(obj);

                // Send back the status of the request and the updated command.
                ws.send( JSON.stringify( { 
                    "mode":"UPDATE_ONE_COMMAND", 
                    "data":{
                        updatedRec : await _MOD.queries.GET_ONE_CMD(obj.sId, obj.gId, obj.cId), 
                        _err: resp.err ? resp.err : false
                    } 
                } ) );
            },
            ADD_ONE_COMMAND: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                
                // Break-out the data.
                let obj = {
                    "cId"     : data.data.added.cId,
                    "sId"     : data.data.added.sId,
                    "gId"     : data.data.added.gId,
                    "title"   : data.data.added.title,
                    "cmd"     : data.data.added.cmd,
                    "f_ctrlc" : data.data.added.f_ctrlc,
                    "f_enter" : data.data.added.f_enter,
                    "f_hidden": data.data.added.f_hidden,
                    "order"   : data.data.added.order,
                };

                // Add the command to the database. 
                let resp = await _MOD.queries.ADD_ONE_COMMAND(obj);

                // Send back the status of the request and the new record. 
                ws.send( JSON.stringify( { 
                    "mode":"ADD_ONE_COMMAND", 
                    "data":{
                        newRec : await _MOD.queries.GET_ONE_CMD(obj.sId, obj.gId, resp.lastID), 
                        _err: resp.err ? resp.err : false
                    } 
                } ) );
            },
            REMOVE_ONE_COMMAND: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                
                // Break-out the data.
                let obj = {
                    "cId"     : data.data.removed.cId,
                    "sId"     : data.data.removed.sId,
                    "gId"     : data.data.removed.gId,
                };

                // Remove the command from the database. 
                let resp = await _MOD.queries.REMOVE_ONE_COMMAND(obj);

                // Send back the status of the request.
                ws.send( JSON.stringify( { 
                    "mode":"REMOVE_ONE_COMMAND", 
                    "data":{
                        removedRec : obj, 
                        _err: resp.err ? resp.err : false
                    } 
                } ) );
            },
        },
        TEXT:{
            PING: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                ws.send("PONG");
            },

            PROCESS_EXIT: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                console.log(":: PROCESS_EXIT ::");
                process.exit(0);
            },
            
            CLIENT_COUNT:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                ws.send( JSON.stringify( { "mode":"CLIENT_COUNT", "data":_MOD.ws_utilities.getClientCount() } ) );
            },

            GET_DB_AS_JSON:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);

                // Object to store the results. 
                let obj = {
                    "sections" : [],
                    "groups"   : [],
                    "commands" : [],
                };

                // Get the data.
                let proms = [
                    new Promise(async function(res,rej){ let resp = await _MOD.queries.SECTIONS_LIST(); obj.sections = resp; res(); }),
                    new Promise(async function(res,rej){ let resp = await _MOD.queries.GROUPS_LIST();   obj.groups   = resp; res(); }),
                    new Promise(async function(res,rej){ let resp = await _MOD.queries.COMMANDS_LIST(); obj.commands = resp; res(); }),
                ];

                // Wait for the data request to complete. 
                await Promise.all(proms);

                // Return the data.
                ws.send( JSON.stringify( { "mode":"GET_DB_AS_JSON", "data":obj } ) );
            },

            CONNECTIVITY_STATUS_UPDATE: async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                ws.send(JSON.stringify({"mode":"CONNECTIVITY_STATUS_UPDATE", "data":_MOD.ws_utilities.getGlobalClientCounts(ws.CONFIG.uuid) }));
            },

            // DEBUG
            SECTIONS_LIST:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                let resp = await _MOD.queries.SECTIONS_LIST();
                ws.send( JSON.stringify( { "mode":"SECTIONS_LIST", "data":resp } ) );
            },
            GROUPS_LIST:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                let resp = await _MOD.queries.GROUPS_LIST();
                ws.send( JSON.stringify( { "mode":"GROUPS_LIST", "data":resp } ) );
            },
            COMMANDS_LIST:      async function(ws, data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                let resp = await _MOD.queries.COMMANDS_LIST();
                ws.send( JSON.stringify( { "mode":"COMMANDS_LIST", "data":resp } ) );
            },
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

        getGlobalClientCounts: function(localUuid){
            // Hold each ws connection.
            let wsClients = {
                local:{
                    controls: [],
                    terms   : [],
                },
                global:{
                    controls: [],
                    terms   : [],
                }
            };
            
            // Separate ws connections into controls and terms.
            _MOD.ws.clients.forEach(function each(ws) {
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    // Is this local? 
                    if(ws.CONFIG.uuid==localUuid){
                        if(ws.CONFIG.isTerm == false){ wsClients.local.controls.push(ws); }
                        else{ wsClients.local.terms.push(ws); }
                    }

                    // Always add to global.
                    if(ws.CONFIG.isTerm == false){ wsClients.global.controls.push(ws); }
                    else{ wsClients.global.terms.push(ws); }
                }
            });

            return {
                local:{
                    controls: wsClients.local.controls.length,
                    terms   : wsClients.local.terms.length,
                },
                global:{
                    controls: wsClients.global.controls.length,
                    terms   : wsClients.global.terms.length,
                }
            };
            // Create the count payload. 
            // let objText = JSON.stringify({
            //     "mode":"CONNECTIVITY_STATUS_UPDATE",
            //     "data":{
            //         local:{
            //             controls: wsClients.local.controls.length,
            //             terms   : wsClients.local.terms.length,
            //         },
            //         global:{
            //             controls: wsClients.global.controls.length,
            //             terms   : wsClients.global.terms.length,
            //         }
            //     },
            // });

            // Sent the count payload to the requested control. 
            // if(wsClients.local.controls.length){
            //     if(wsClients.local.controls.length != 1){
            //         console.log("ERROR: A client UUID should only have 1 control. This many were found:", wsClients.local.controls.length);
            //         return; 
            //     }
            //     wsClients.local.controls[0].send(objText);
            // }
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

            // TODO: Remove all terminal ws connections that have the matching UUID.
            // 

            // Make sure this ws connection is removed after a short delay. 
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

            // Make sure this ws connection is removed after a short delay. 
            // setTimeout(function(){
            //     ws.terminate(); 
            //     setTimeout(function(){
            //         ws=null; 
            //     }, 1000);
            // }, 1000);
        },
    },
    initWss: function(){
        // Run this for each new websocket connection. 
        _MOD.ws.on("connection", function connection(clientWs, res){
            // What type of connection is this? 
            
            // CONTROL
            if( res.url == "/CONTROL"){
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
                clientWs.CONFIG.uuid   = clientWs.id; 
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

        // Timed function to send CONNECTIVITY_STATUS_UPDATE.
        // setInterval(()=> _MOD.ws_utilities.getGlobalClientCounts(null) , 5000);
    },

    queries: {
        // VIA INTERNAL: SELECTS
        GET_ONE_GROUP: function(gId){
            return new Promise(async function(resolve,reject){
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
                        WHERE gId = :gId
                        ORDER BY sections.sId ASC
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : { 
                        ":gId": gId 
                    },
                    "type": "SELECT",
                };
                let results2 = await _APP.m_db.query(q2.sql, q2.params, q2.type); if(results2.err){ console.log(results2); reject(); return; }

                // There should only be one record.
                if(results2.rows.length){ 
                    results2 = results2.rows[0];
                    resolve(results2);
                }
                else{
                    reject(`NO RESULTS:" gId: ${gId}"`);
                }
            });
        },
        GET_CMDS_IN_GROUP: function(gId){
            return new Promise(async function(resolve,reject){
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
                        WHERE 
                            commands.gId = :gId
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":gId": gId,
                    },
                    "type": "SELECT",
                };
    
                let results3 = await _APP.m_db.query(q3.sql, q3.params, q3.type); if(results3.err){ console.log(results3); reject(); return; }
    
                // There should only be one record.
                if(results3.rows.length){ 
                    results3 = results3.rows;
                    resolve(results3);
                }
                else{
                    reject(`NO RESULTS:" gId: ${gId}"`);
                }
            })
        },
        GET_ONE_CMD: function(sId, gId, cId){
            return new Promise(async function(resolve,reject){
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
                        WHERE 
                            commands.sId     = :sId
                            AND commands.gId = :gId
                            AND commands.cId = :cId
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":sId": sId,
                        ":gId": gId,
                        ":cId": cId,
                    },
                    "type": "SELECT",
                };
    
                let results3 = await _APP.m_db.query(q3.sql, q3.params, q3.type); if(results3.err){ console.log(results3); reject(); return; }
    
                // There should only be one record.
                if(results3.rows.length){ 
                    results3 = results3.rows[0];
                    resolve(results3);
                }
                else{
                    reject(`NO RESULTS:" sId: ${sId}, gId: ${gId}, cId: ${cId}"`);
                }
            })
        },

        // VIA WS: SELECTS (DEBUG)

        SECTIONS_LIST : function(){
            return new Promise(async function(resolve,reject){
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
                let results1 = await _APP.m_db.query(q1.sql, q1.params, q1.type); if(results1.err){ console.log(results1); reject(); return; }
                results1 = results1.rows;
                resolve(results1);
            });
        },
        GROUPS_LIST   : function(){
            return new Promise(async function(resolve,reject){
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
                let results2 = await _APP.m_db.query(q2.sql, q2.params, q2.type); if(results2.err){ console.log(results2); reject(); return; }
                results2 = results2.rows;
                resolve(results2);
            });
        },
        COMMANDS_LIST : function(){
            return new Promise(async function(resolve,reject){
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
                let results3 = await _APP.m_db.query(q3.sql, q3.params, q3.type); if(results3.err){ console.log(results3); reject(); return; }
                results3 = results3.rows;
                resolve(results3);
            });
        },

        // VIA ws: ADD

        ADD_ONE_COMMAND: function(data){
            return new Promise(async function(resolve,reject){
                if(!data){ reject("Missing data."); return; }
                let q = {
                    "sql" : `
                        INSERT INTO 'commands' ( 'cId', 'sId', 'gId', 'title', 'cmd', 'f_ctrlc', 'f_enter', 'f_hidden', 'order' )
                        VALUES ( :cId, :sId, :gId, :title, :cmd, :f_ctrlc, :f_enter, :f_hidden, (SELECT MAX("order") + 1 FROM 'commands') )
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":cId"     : null,
                        ":sId"     : data.sId,
                        ":gId"     : data.gId,
                        ":title"   : data.title,
                        ":cmd"     : data.cmd,
                        ":f_ctrlc" : data.f_ctrlc,
                        ":f_enter" : data.f_enter,
                        ":f_hidden": data.f_hidden,
                    },
                    "type": "INSERT",
                };
                let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
                resolve(results);
            });
        },
        REMOVE_ONE_COMMAND: function(data){
            return new Promise(async function(resolve,reject){
                if(!data){ reject("Missing data."); return; }
                let q = {
                    "sql" : `
                        DELETE FROM 'commands'
                        WHERE 
                            cId = :cId
                            AND gId = :gId
                            AND sId = :sId
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":cId"     : data.cId,
                        ":sId"     : data.sId,
                        ":gId"     : data.gId,
                    },
                    "type": "DELETE",
                };
                let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
                resolve(results);
            });
        },

        // VIA WS: UPDATES

        // TODO
        UPDATE_ONE_SECTION: function(data){
            return new Promise(function(resolve, reject){
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
            });
        },
        // TODO
        UPDATE_ONE_GROUP: function(data){
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
        UPDATE_ONE_COMMAND: function(data){
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
                        ":cId"     : data.cId,
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
                resolve(results);
            });
        },
    },
};

module.exports = _MOD;