const fs = require('fs');
// const path = require('path');
const os   = require('os');
const WSServer = require('ws').WebSocketServer;
const ping = require("ping");

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
        
                _APP.consolelog("WebSockets Server", 2);
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
        // ********************
        // Websockets "routes".
        // ********************

        _APP.addToRouteList({ path: "SUBSCRIBE"                  , method: "ws", args: [], file: __filename, desc: "JSON: subscriptions    : Subscribe to event." });
        _APP.addToRouteList({ path: "UNSUBSCRIBE"                , method: "ws", args: [], file: __filename, desc: "JSON: subscriptions    : Unsubscribe from event." });
        _APP.addToRouteList({ path: "GET_SUBSCRIPTIONS"          , method: "ws", args: [], file: __filename, desc: "TEXT: subscriptions    : Get list of active subscriptions." });

        _APP.addToRouteList({ path: "UPDATE_CONFIG"              , method: "ws", args: [], file: __filename, desc: "JSON: config           : Updates config.json." });
        _APP.addToRouteList({ path: "GET_DB_AS_JSON"             , method: "ws", args: [], file: __filename, desc: "TEXT: config           : Returns the database as JSON." });
        
        _APP.addToRouteList({ path: "UPDATE_ONE_SECTION"         , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_sections: Updates one section." });
        _APP.addToRouteList({ path: "ADD_ONE_SECTION"            , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_sections: Adds one section." });
        _APP.addToRouteList({ path: "REMOVE_ONE_SECTION"         , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_sections: Removes one section." });
        
        _APP.addToRouteList({ path: "UPDATE_ONE_GROUP"           , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_groups  : Updates one group." });
        _APP.addToRouteList({ path: "ADD_ONE_GROUP"              , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_groups  : Adds one group." });
        _APP.addToRouteList({ path: "REMOVE_ONE_GROUP"           , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_groups  : Removes one group." });
        
        _APP.addToRouteList({ path: "UPDATE_ONE_COMMAND"         , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_commands: Updates one command." });
        _APP.addToRouteList({ path: "ADD_ONE_COMMAND"            , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_commands: Adds one command." });
        _APP.addToRouteList({ path: "REMOVE_ONE_COMMAND"         , method: "ws", args: [], file: __filename, desc: "JSON: dbEditor_commands: Removes one command." });
        
        _APP.addToRouteList({ path: "TYPE_CMD_TO_TERM"           , method: "ws", args: [], file: __filename, desc: "JSON: general          : TYPE_CMD_TO_TERM." });
        _APP.addToRouteList({ path: "PROCESS_EXIT"               , method: "ws", args: [], file: __filename, desc: "TEXT: general          : Tells node to exit (will restart with PM2.)" });
        _APP.addToRouteList({ path: "CONNECTIVITY_STATUS_UPDATE" , method: "ws", args: [], file: __filename, desc: "TEXT: general          : Get connectivity statuses." });

        // ************
        // HTTP routes. 
        // ************

        // /GET_DB_AS_JSON : Get DB as JSON.
        _APP.addToRouteList({ path: "/GET_DB_AS_JSON", method: "post", args: [], file: __filename, desc: "Returns the database as JSON." });
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

    },

    // **********
    createWebSocketsServer: function(){
        _MOD.ws = new WSServer({ server: _APP.server }); 
    },

    pingCheck: function(host, timeoutMs) {
        return new Promise(async function(resolve,reject){
            let timeoutSec = Math.floor(timeoutMs / 1000);
            let result = await ping.promise.probe(host, { timeout: timeoutSec, });
            resolve({
                host: host,
                alive: result.alive,
            });
        });
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
        // Subscription handler.
        subscriptions: {
            modes: {
                JSON:{
                    SUBSCRIBE  : async function(ws, data){ _MOD.ws_utilities.subscriptions.funcs.SUBSCRIBE(ws, data.data); },
                    UNSUBSCRIBE: async function(ws, data){ _MOD.ws_utilities.subscriptions.funcs.UNSUBSCRIBE(ws, data.data); },
                },
                TEXT:{
                    GET_SUBSCRIPTIONS: async function(ws, data){ _MOD.ws_utilities.subscriptions.funcs.GET_SUBSCRIPTIONS(ws, data.data); },
                },
            },
            funcs: {
                // TEXT
                GET_SUBSCRIPTIONS  : function(ws)   { 
                    // Send the client's current subscription list. 
                    ws.send(JSON.stringify({"mode":"GET_SUBSCRIPTIONS", "data":ws.subscriptions}));
                },
                // JSON
                SUBSCRIBE   : function(ws, eventType){ 
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
                // JSON
                UNSUBSCRIBE: function(ws, eventType){ 
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
        },

        // Config update and retrieval.
        config:{
            modes:{
                JSON:{
                    UPDATE_CONFIG: async function(ws, data){ _MOD.ws_event_handlers.config.funcs.UPDATE_CONFIG(ws, data); },
                },
                TEXT:{ 
                    GET_DB_AS_JSON: async function(ws, data){ _MOD.ws_event_handlers.config.funcs.GET_DB_AS_JSON(ws, data); },
                }
            },
            funcs:{
                // JSON
                UPDATE_CONFIG: async function(ws, data){
                    // Make sure that the JSON is valid. The client should have already verified this.
                    let parsed;
                    try{ parsed = JSON.parse(data.data); }
                    catch(e){
                        console.log("ERROR: Failure to parse the new config.json data.");
                        
                        // Send back an error.
                        ws.send( JSON.stringify( { 
                            "mode" :"UPDATE_CONFIG", 
                            "data" : "",
                            "error": true,
                        } ) );
                        return; 
                    }

                    // Write the updated config.json.
                    fs.writeFileSync(_APP.m_config.config_filename, data.data, {});
    
                    // Store the updated config.json.
                    _APP.m_config.config = parsed;
    
                     // Send back the updated config.json.
                     ws.send( JSON.stringify( { 
                        "mode":"UPDATE_CONFIG", 
                        "data":_APP.m_config.config,
                        "error": false,
                    } ) );
                },
                // TEXT
                GET_DB_AS_JSON: async function(ws, data){
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
            },
        },

        // DB editor: sections.
        dbEditor_sections:{
            modes:{
                JSON:{
                    UPDATE_ONE_SECTION: async function(ws, data){ _MOD.ws_event_handlers.dbEditor_sections.funcs.UPDATE_ONE_SECTION(ws, data);},
                    ADD_ONE_SECTION   : async function(ws, data){ _MOD.ws_event_handlers.dbEditor_sections.funcs.ADD_ONE_SECTION(ws, data); },
                    REMOVE_ONE_SECTION: async function(ws, data){ _MOD.ws_event_handlers.dbEditor_sections.funcs.REMOVE_ONE_SECTION(ws, data); },
                },
                TEXT:{},
            },
            funcs:{
                // JSON
                UPDATE_ONE_SECTION: async function(ws, data){
                    // Break-out the data.
                    let obj = {
                        sId   : data.data.sId  ,
                        name  : data.data.updated.name ,
                        order : data.data.updated.order,
                    };
                    
                    // Update the section in the database. 
                    let resp = await _MOD.queries.UPDATE_ONE_SECTION(obj);
                    
                    // Get updated groups related to this section.
                    let updatedGrps = await _MOD.queries.GET_GROUPS_IN_SECTION(obj.sId);
                    
                    // Get updated commands related to this section.
                    let updatedCmds = await _MOD.queries.GET_CMDS_IN_SECTION(obj.sId);
                    
                    // Send back the status of the request and the updated group and related commands.
                    ws.send( JSON.stringify( { 
                        "mode":"UPDATE_ONE_SECTION", 
                        "data":{
                            updatedRec : await _MOD.queries.GET_ONE_SECTION(obj.sId), 
                            updatedGrps: updatedGrps,
                            updatedCmds: updatedCmds,
                            _err: resp.err ? resp.err : false
                        } 
                    } ) );
                },
                // JSON
                ADD_ONE_SECTION: async function(ws, data){
                    // Break-out the data.
                    let obj = {
                        "name"    : data.data.added.name,
                    };
    
                    // Add the section to the database. 
                    let resp = await _MOD.queries.ADD_ONE_SECTION(obj);
                    
                    // Add the first group to the section.
                    let resp2 = await _MOD.queries.ADD_ONE_GROUP({
                        "sId"  : resp.lastID,
                        "name" : "GRP: NEW - CHANGE ME",
                    });

                    // Add the first command to the group.
                    let resp3 = await _MOD.queries.ADD_ONE_COMMAND({
                        "sId"     : resp.lastID,
                        "gId"     : resp2.lastID,
                        "title"   : "CMD: NEW - CHANGE ME",
                        "cmd"     : "whoami",
                        "f_ctrlc" : 0,
                        "f_enter" : 1,
                        "f_hidden": 0,

                    });
    
                    // Send back the status of the request and the new record. 
                    ws.send( JSON.stringify( { 
                        "mode":"ADD_ONE_SECTION", 
                        "data":{
                            newRec  : await _MOD.queries.GET_ONE_SECTION(resp.lastID), 
                            newRec2 : await _MOD.queries.GET_ONE_GROUP  (resp2.lastID),
                            newRec3 : await _MOD.queries.GET_ONE_CMD    (resp.lastID, resp2.lastID, resp3.lastID),
                            _err: resp.err ? resp.err : false
                        } 
                    } ) );
                },
                // JSON
                REMOVE_ONE_SECTION: async function(ws, data){
                    // Break-out the data.
                    let obj = {
                        "sId"     : data.data.removed.sId,
                    };
    
                    // Remove the section from the database. 
                    let resp = await _MOD.queries.REMOVE_ONE_SECTION(obj);
    
                    // Send back the status of the request.
                    ws.send( JSON.stringify( { 
                        "mode":"REMOVE_ONE_SECTION", 
                        "data":{
                            removedRec : obj, 
                            _err: resp.err ? resp.err : false
                        } 
                    } ) );
                },
            },
        },

        // DB editor: groups.
        dbEditor_groups:{
            modes:{
                JSON:{
                    UPDATE_ONE_GROUP: async function(ws, data){ _MOD.ws_event_handlers.dbEditor_groups.funcs.UPDATE_ONE_GROUP(ws, data); },
                    ADD_ONE_GROUP   : async function(ws, data){ _MOD.ws_event_handlers.dbEditor_groups.funcs.ADD_ONE_GROUP(ws, data); },
                    REMOVE_ONE_GROUP: async function(ws, data){ _MOD.ws_event_handlers.dbEditor_groups.funcs.REMOVE_ONE_GROUP(ws, data); },
                },
                TEXT:{},
            },
            funcs:{
                // JSON
                UPDATE_ONE_GROUP: async function(ws, data){
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
                // JSON
                ADD_ONE_GROUP: async function(ws, data){
                    // Break-out the data.
                    let obj = {
                        "sId"     : data.data.added.sId,
                        "gId"     : data.data.added.gId,
                        "name"    : data.data.added.name,
                    };
    
                    // Add the command to the database. 
                    let resp = await _MOD.queries.ADD_ONE_GROUP(obj);
    
                    // Send back the status of the request and the new record. 
                    ws.send( JSON.stringify( { 
                        "mode":"ADD_ONE_GROUP", 
                        "data":{
                            newRec : await _MOD.queries.GET_ONE_GROUP(resp.lastID), 
                            _err: resp.err ? resp.err : false
                        } 
                    } ) );
                },
                // JSON
                REMOVE_ONE_GROUP: async function(ws, data){
                    // Break-out the data.
                    let obj = {
                        "gId"     : data.data.removed.gId,
                    };
    
                    // Remove the command from the database. 
                    let resp = await _MOD.queries.REMOVE_ONE_GROUP(obj);
    
                    // Send back the status of the request.
                    ws.send( JSON.stringify( { 
                        "mode":"REMOVE_ONE_GROUP", 
                        "data":{
                            removedRec : obj, 
                            _err: resp.err ? resp.err : false
                        } 
                    } ) );
                },
            },
        },

        // DB editor: commands.
        dbEditor_commands:{
            modes:{
                JSON:{
                    UPDATE_ONE_COMMAND: async function(ws, data){ _MOD.ws_event_handlers.dbEditor_commands.funcs.UPDATE_ONE_COMMAND(ws, data); },
                    ADD_ONE_COMMAND   : async function(ws, data){ _MOD.ws_event_handlers.dbEditor_commands.funcs.ADD_ONE_COMMAND(ws, data); },
                    REMOVE_ONE_COMMAND: async function(ws, data){ _MOD.ws_event_handlers.dbEditor_commands.funcs.REMOVE_ONE_COMMAND(ws, data); },
                },
                TEXT:{
                },
            },
            funcs:{
                // JSON
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
                // JSON
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
                // JSON
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
        },

        // General
        general: {
            modes:{
                JSON:{
                    // TODO:
                    TYPE_CMD_TO_TERM: async function(ws, data){ _MOD.ws_event_handlers.general.funcs.TYPE_CMD_TO_TERM(ws, data); },
                },
                TEXT:{
                    PROCESS_EXIT              : async function(ws, data){ _MOD.ws_event_handlers.general.funcs.PROCESS_EXIT(ws, data); },
                    CONNECTIVITY_STATUS_UPDATE: async function(ws, data){ _MOD.ws_event_handlers.general.funcs.CONNECTIVITY_STATUS_UPDATE(ws, data); },
                },
            },
            funcs:{
                // TODO: JSON
                TYPE_CMD_TO_TERM: async function(ws, data){
                    // console.log(`mode: ${data.mode}, data:`, data.data);
                    console.log(`TODO: mode: ${data.mode}, data:`, data.data);
                },
                // TEXT
                PROCESS_EXIT: async function(ws, data){
                    console.log(":: PROCESS_EXIT ::");
                    process.exit(0);
                },
                // TEXT
                CONNECTIVITY_STATUS_UPDATE: async function(ws, data){
                    // Get local/global control/term counts and terminal PIDs.
                    let resp = _MOD.ws_utilities.getGlobalClientCounts(ws.CONFIG.uuid);

                    // Get the VPN status.
                    if(_APP.m_config.config.connectionCheck.active){
                        resp.vpnCheck = await _MOD.pingCheck(_APP.m_config.config.connectionCheck.url, 1000);
                    }

                    // Return the data.
                    ws.send(JSON.stringify({"mode":"CONNECTIVITY_STATUS_UPDATE", "data":resp }));
                },
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
        
        sendToAllSubscribers: function(data, eventType=""){
            _MOD.ws.clients.forEach(function each(ws) {
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    if(ws.subscriptions.indexOf(eventType) != -1){
                        ws.send(data); 
                    }
                }
            });
        },

        // Sends the specified data to ALL connected clients. 
        sendToAll: function(data){
            _MOD.ws.clients.forEach(function each(ws) { 
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    ws.send(data); 
                }
            });
        },

        getGlobalClientCounts: function(localUuid){
            // Hold each ws connection.
            let wsClients = {
                local:{
                    controls: [],
                    terms   : [],
                    termPids: [],
                },
                global:{
                    controls: [],
                    terms   : [],
                    termPids: [],
                }
            };
            
            // Separate ws connections into controls and terms.
            _MOD.ws.clients.forEach(function each(ws) {
                if (ws.readyState === _MOD.ws_readyStates.OPEN) {
                    // Is this local? 
                    if(ws.CONFIG.uuid==localUuid){
                        if(ws.CONFIG.isTerm == false){ wsClients.local.controls.push(ws); }
                        else{ 
                            wsClients.local.terms.push(ws); 
                            wsClients.local.termPids.push(ws.CONFIG.pid);
                        }
                    }

                    // Always add to global.
                    if(ws.CONFIG.isTerm == false){ wsClients.global.controls.push(ws); }
                    else{ 
                        wsClients.global.terms.push(ws); 
                        wsClients.global.termPids.push(ws.CONFIG.pid);
                    }

                }
            });

            return {
                local:{
                    controls: wsClients.local.controls.length,
                    terms   : wsClients.local.terms.length,
                    termPids: wsClients.local.termPids,
                },
                global:{
                    controls: wsClients.global.controls.length,
                    terms   : wsClients.global.terms.length,
                    termPids: wsClients.global.termPids,
                }
            };
        },

    },
    handlers: {
        JSON:{
            subscriptions    : ["SUBSCRIBE", "UNSUBSCRIBE"],
            config           : ["UPDATE_CONFIG", "GET_DB_AS_JSON"],
            dbEditor_sections: ["UPDATE_ONE_SECTION", "ADD_ONE_SECTION", "REMOVE_ONE_SECTION"],
            dbEditor_groups  : ["UPDATE_ONE_GROUP", "ADD_ONE_GROUP", "REMOVE_ONE_GROUP"],
            dbEditor_commands: ["UPDATE_ONE_COMMAND", "ADD_ONE_COMMAND", "REMOVE_ONE_COMMAND"],
            general          : ["TYPE_CMD_TO_TERM"],
        },
        TEXT:{
            subscriptions: ["GET_SUBSCRIPTIONS"],
            config       : ["GET_DB_AS_JSON"],
            general      : ["PROCESS_EXIT", "CONNECTIVITY_STATUS_UPDATE"],
        },
    },
    handlerLookup: function(mode, type){
        let keys = Object.keys(_MOD.handlers[type]);
        for(let i=0; i<keys.length; i+=1){ if(_MOD.handlers[type][keys[i]].indexOf(mode) != -1){ return keys[i]; } }
        return false;
    },
    ws_events:{
        el_message: function(ws, event){
            let data;
            let tests = { isJson: false, isText: false };

            // First, assume the data is JSON (verify this.)
            try{ data = JSON.parse(event.data); tests.isJson = true; }
            
            // Isn't JSON. Assume that it is text. 
            catch(e){ data = event.data; tests.isText = true; }

            // Handle JSON.
            if(tests.isJson){
                // Find the event handler key.
                let key = _MOD.handlerLookup(data.mode, "JSON");

                // Use the key if found.
                if(key){ _MOD.ws_event_handlers[key].modes.JSON[data.mode](ws, data); }

                // Unhandled.
                else{
                    console.log("UNKNOWN MODE:", "key:", key, "JSON");
                    ws.send(JSON.stringify({"mode":"ERROR", "data":"UNKNOWN MODE: " + data.mode}));
                    return; 
                }
            }

            // Handle TEXT.
            else if(tests.isText){
                // Find the event handler key.
                let key = _MOD.handlerLookup(data, "TEXT");

                // Use the key if found.
                if(key){ _MOD.ws_event_handlers[key].modes.TEXT[data](ws); }

                // Unhandled.
                else{
                    console.log("UNKNOWN MODE:", "key:", key, "TEXT");
                    ws.send(JSON.stringify({"mode":"ERROR", "data":"UNKNOWN MODE: " + data}));
                    return;
                }
            }
        },
        el_close  : function(ws, event){ 
            console.log("WebSockets Server: CLOSE  :", ws.CONFIG.type.padEnd(7, " "), ws.CONFIG.uuid);
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
            console.log("WebSockets Server: ERROR  :", ws.CONFIG.type.padEnd(7, " "), ws.CONFIG.uuid, event);
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
        _MOD.ws.on("connection", function connection(ws, res){
            // What type of connection is this? 
            
            // CONTROL
            if( res.url == "/CONTROL"){
                // GENERATE A UNIQUE ID FOR THIS CONNECTION. 
                ws.id = _MOD.ws_utilities.uuidv4();

                // Add the config object to this ws object. 
                ws.CONFIG = {};
                
                // ADD THE SUBSCRIPTIONS ARRAY TO THIS CONNECTION. 
                ws.subscriptions = [];

                // AUTO-ADD SOME SUBSCRIPTIONS. 
                // _MOD.ws_utilities.addSubscription(ws, "STATS1");
                // _MOD.ws_utilities.addSubscription(ws, "STATS2");

                // Save this data to the ws for future use.
                ws.CONFIG.uuid   = ws.id; 
                ws.CONFIG.type   = "CONTROL"; 
                ws.CONFIG.isTerm = false; 

                console.log("WebSockets Server: CONNECT:", ws.CONFIG.type.padEnd(7, " "), ws.CONFIG.uuid);

                // SEND THE UUID.
                ws.send(JSON.stringify( {"mode":"NEWCONNECTION", data:ws.id } ));
                
                // SEND THE NEW CONNECTION MESSAGE.
                ws.send(JSON.stringify( {"mode":"WELCOMEMESSAGE", data:`WELCOME TO COMMAND-ER (CONTROL).`} ));

                // ADD EVENT LISTENERS.
                ws.addEventListener('message', (event)=>_MOD.ws_events.el_message(ws, event) );
                ws.addEventListener('close'  , (event)=>_MOD.ws_events.el_close  (ws, event) );
                ws.addEventListener('error'  , (event)=>_MOD.ws_events.el_error  (ws, event) );
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
                    ws.CONFIG = {};
                
                    // ADD THE SUBSCRIPTIONS ARRAY TO THIS CONNECTION. 
                    // _MOD.ws_utilities.addSubscription(ws, "STATS1");
                    // _MOD.ws_utilities.addSubscription(ws, "STATS2");

                    // AUTO-ADD SOME SUBSCRIPTIONS. 
                    // _MOD.ws_utilities.addSubscription(ws, "TEST");

                    // Save this data to the ws for future use.
                    ws.CONFIG.isTerm    =  true; 
                    ws.CONFIG.uuid      =  params.uuid; 
                    ws.CONFIG.termId    =  params.termId; 
                    ws.CONFIG.type      =  params.type; 
                    ws.CONFIG.tty       =  null; 
                    ws.CONFIG.pid       =  null; 
                    ws.CONFIG.isClosing =  false; 
                    ws.CONFIG.isClosed  =  false; 

                    // Start the terminal. 
                    // console.log(`OPEN  : term, uuid: ${ws.CONFIG.uuid}, termId: ${ws.CONFIG.termId}`);
                    console.log("WebSockets Server: OPEN   :", ws.CONFIG.type.padEnd(7, " "), ws.CONFIG.uuid, ws.CONFIG.termId);
                    _APP.m_terminals.startRemoteTty(ws, res);
                }
            }
        });

    },

    queries: {
        // VIA INTERNAL: SELECTS

        GET_ONE_SECTION:function(sId){
            return new Promise(async function(resolve,reject){
                let q1 = {
                    "sql" : `
                        SELECT
                            sections.'sId', 
                            sections.name,
                            sections.'order'
                        FROM sections
                        WHERE sId = :sId
                        -- ORDER BY sections.name ASC
                        ORDER BY sections.sId ASC
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                        "params" : { 
                            ":sId": sId 
                        },
                    "type": "SELECT",
                };
                let results1 = await _APP.m_db.query(q1.sql, q1.params, q1.type); if(results1.err){ console.log(results1); reject(); return; }
                
                // There should only be one record.
                if(results1.rows.length){ 
                    results1 = results1.rows[0];
                    resolve(results1);
                }
                else{
                    reject(`GET_ONE_SECTION: NO RESULTS:" gId: ${sId}"`);
                }
            });
        },
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
                    reject(`GET_ONE_GROUP: NO RESULTS:" gId: ${gId}"`);
                }
            });
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
                    reject(`GET_ONE_CMD: NO RESULTS:" sId: ${sId}, gId: ${gId}, cId: ${cId}"`);
                }
            })
        },
        SECTIONS_LIST : function(){
            return new Promise(async function(resolve,reject){
                let q1 = {
                    "sql" : `
                        SELECT
                            sections.'sId', 
                            sections.'order',
                            sections.'name'
                        FROM sections
                        ORDER BY sections.'order' ASC
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
                            groups.'order',
                            groups.'name', 
                            sections.name AS sectionName
                        FROM groups
                        LEFT JOIN sections ON sections.sId = groups.sId
                        ORDER BY groups.'order' ASC
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
                        commands.'title', 
                        commands.'cmd', 
                        commands.'f_ctrlc', 
                        commands.'f_enter', 
                        commands.'f_hidden',
                        commands.'order',
                        sections.name AS 'sectionName',
                        groups.name   AS 'groupName'
                    FROM commands
                    LEFT JOIN sections ON sections.sId = commands.sId
                    LEFT JOIN groups   ON groups.gId   = commands.gId
                    ORDER BY sections.'order' ASC, groups.'order' ASC, commands.'order' ASC
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {},
                    "type": "SELECT",
                };
                let results3 = await _APP.m_db.query(q3.sql, q3.params, q3.type); if(results3.err){ console.log(results3); reject(); return; }
                results3 = results3.rows;
                resolve(results3);
            });
        },
        GET_GROUPS_IN_SECTION:function(sId){
            return new Promise(async function(resolve,reject){
                let grps = await _MOD.queries.GROUPS_LIST();
                grps = grps.filter(d=>d.sId==sId);
                resolve(grps);
            });
        },
        GET_CMDS_IN_SECTION:function(sId){
            return new Promise(async function(resolve,reject){
                let cmds = await _MOD.queries.COMMANDS_LIST();
                cmds = cmds.filter(d=>d.sId==sId);
                resolve(cmds);
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
                            commands.'title', 
                            commands.'cmd', 
                            commands.'f_ctrlc', 
                            commands.'f_enter', 
                            commands.'f_hidden',
                            commands.'order',
                            sections.name AS 'sectionName',
                            groups.name   AS 'groupName'
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
    
                // There may not be records.
                results3 = results3.rows;
                resolve(results3);
            })
        },

        // VIA ws: ADD

        ADD_ONE_SECTION: function(data){
            return new Promise(async function(resolve,reject){
                if(!data){ reject("Missing data."); return; }
                let q = {
                    "sql" : `
                        INSERT INTO 'sections' ( 'sId', 'name', 'order' )
                        VALUES ( :sId, :name, (SELECT MAX("order") + 1 FROM 'sections') )
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":sId"  : null,
                        ":name" : data.name,
                    },
                    "type": "INSERT",
                };
                let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
                resolve(results);
            });
        },
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
        ADD_ONE_GROUP: function(data){
            return new Promise(async function(resolve,reject){
                if(!data){ reject("Missing data."); return; }
                let q = {
                    "sql" : `
                        INSERT INTO 'groups' ( 'gId', 'sId', 'name', 'order' )
                        VALUES ( :gId, :sId, :name, (SELECT MAX("order") + 1 FROM 'groups') )
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":gId"  : null,
                        ":sId"  : data.sId,
                        ":name" : data.name,
                    },
                    "type": "INSERT",
                };
                let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
                resolve(results);
            });
        },
        
        // VIA ws: REMOVE
        
        REMOVE_ONE_SECTION: function(data){
            return new Promise(async function(resolve,reject){
                if(!data){ reject("Missing data."); return; }
                let q = {
                    "sql" : `
                        DELETE FROM 'sections'
                        WHERE 
                            sId = :sId
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":sId"     : data.sId,
                    },
                    "type": "DELETE",
                };
                let results = await _APP.m_db.query(q.sql, q.params, q.type); if(results.err){ console.log(results); reject(); return; }
                resolve(results);
            });
        },
        REMOVE_ONE_GROUP: function(data){
            return new Promise(async function(resolve,reject){
                if(!data){ reject("Missing data."); return; }
                let q = {
                    "sql" : `
                        DELETE FROM 'groups'
                        WHERE 
                            gId = :gId
                        ;`.replace(/\t/g, " ").replace(/  +/g, "  "), 
                    "params" : {
                        ":gId"     : data.gId,
                    },
                    "type": "DELETE",
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

        UPDATE_ONE_SECTION: function(data){
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
                resolve(results);
            });
        },
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