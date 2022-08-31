// Shared variables.
let commands = [];
let appView  = "";
let DOM      = {};
let config   = {};

// HTTP REQUESTS USING POST.
let http = {
    // Can use either "GET" or "POST" and type of either "json" or "text".
    send: async function(url, userOptions, timeoutMs=5000){
        return new Promise(async function(resolve,reject){
            // Set default values if the value is missing.
            if(!userOptions || typeof userOptions != "object"){ userOptions = {}; }
            if(!userOptions.method){ userOptions.method = "POST"; }
            if(!userOptions.type)  { userOptions.type = "json"; }

            method = userOptions.method.toUpperCase();
            let options = {
                method: userOptions.method, 
                headers: {},
            };

            // Set body?
            switch(userOptions.method){
                case "GET": { break; }
                case "POST": { if(userOptions.body) { options.body = JSON.stringify(userOptions.body); } break; }
                default : { throw "ERROR: INVALID METHOD: " + method; resolve(false); return; break; }
            }

            // Set headers.
            switch(userOptions.type){
                case "json": { 
                    options.headers = { 
                        'Accept': 'application/json', 
                        'Content-Type': 'application/json' 
                    };
                    break; 
                }
                case "text": { 
                    options.headers = { 
                        'Accept': 'text/plain', 
                        'Content-Type': 'text/plain' 
                    };
                    break;
                }
                default : { throw "ERROR: INVALID TYPE: " + userOptions.type; resolve(false); return; break; }
            };

            // Make the request.
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            options.signal = controller.signal;
            let aborted = false;
            
            let resp;
            try{
                resp = await fetch(url, options )
                .catch(e=>{ 
                    clearTimeout(id);
                    if(e.type=="aborted"){ resolve(e.type); return; }
                    throw e; 
                });

                if(!aborted){
                    clearTimeout(id);
                    if     (userOptions.type=="json"){ resp = await resp.json(); }
                    else if(userOptions.type=="text"){ resp = await resp.text(); }
                    resolve(resp); return;
                }
                
            }
            catch(e){
                // console.log(`http.get ERROR: ${url}, ${userOptions.type}:`, e);
                resolve(false); return;
            }
        });
    },

    // Ping the server.
    pingServer: async function(){
        return new Promise(async function(resolve,reject){
            // console.log( await http.pingServer() );
            
            // Set the blue icon.
            ws_control.status.setStatusColor("pinging");

            let serverUrl = `` +
                `${window.location.protocol == "https:" ? "https" : "http"}://` +
                `${location.hostname}` + 
                `${location.port ? ':'+location.port : ''}`
            ;
            let options = { type:"text", method:"GET" };
            let resp = await http.send(serverUrl, options, 5000);
            resp = resp === false ? false : true;

            // Reset to the previous connection icon.
            ws_control.status.restorePrevStatusColor();

            // End.
            resolve(resp);
        });
    },
};

// WEBSOCKETS FOR THE CONTROL CONNECTION.
let ws_control = {
    connecting:false,
    uuid:null,
    activeWs:null,
    wsArr:[],

    skipAutoReconnect         : false,
    autoReconnect             : true,
    autoReconnect_counter     : 0,
    autoReconnect_counter_max : 30,
    autoReconnect_id          : false,
    autoReconnect_ms          : 2000,

    // STATUS CODES
    ws_statusCodes: {
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
    // READYSTATES
    ws_readyStates: {
        "0":"CONNECTING",
        "1":"OPEN",
        "2":"CLOSING",
        "3":"CLOSED",
        "CONNECTING":0,
        "OPEN"      :1,
        "CLOSING"   :2,
        "CLOSED"    :3,
    },
    // HANDLERS TO SPECIFIC TYPES OF EVENTS.
    ws_event_handlers:{
        JSON  : {
            // OPENING A NEW CONNECTION.
            NEWCONNECTION: function(data){
                console.log(`mode: ${data.mode}, data:`, data.data);
                ws_control.uuid = data.data;
                if(appView == "debug"){
                    document.getElementById("top_status2_uuid").innerText = ws_control.uuid.toUpperCase();
                }
            },
            WELCOMEMESSAGE: function(data){
                console.log(`mode: ${data.mode}, data:`, data.data);
            },

            SUBSCRIBE: function(data){
                console.log(`mode: ${data.mode}, data:`, data.data);
            },
            UNSUBSCRIBE: function(data){
                console.log(`mode: ${data.mode}, data:`, data.data);
            },
            CLIENT_COUNT: function(data){
                if(appView == "debug"){
                    console.log("CLIENT_COUNT:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },

            GET_DB_AS_JSON: function(data){
                if(appView == "debug"){
                    console.log("GET_DB_AS_JSON:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                    // commands = data;
                }
            },
            SECTIONS_LIST: function(data){
                if(appView == "debug"){
                    console.log("SECTIONS_LIST:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            GROUPS_LIST: function(data){
                if(appView == "debug"){
                    console.log("GROUPS_LIST:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            COMMANDS_LIST: function(data){
                if(appView == "debug"){
                    console.log("COMMANDS_LIST:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },

            
            // 
            GET_ONE_CMD: function(data){
                if(appView == "debug"){
                    console.log("GET_ONE_CMD:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            TYPE_CMD_TO_TERM: function(data){
                if(appView == "debug"){
                    console.log("TYPE_CMD_TO_TERM:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            UPDATE_ONE_SECTION: function(data){
                if(appView == "debug"){
                    console.log("UPDATE_ONE_SECTION:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            UPDATE_ONE_GROUP: function(data){
                if(appView == "debug"){
                    console.log("UPDATE_ONE_GROUP:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            UPDATE_ONE_COMMAND: function(data){
                if(appView == "debug"){
                    // Server will send updated command record.
                    console.log("UPDATE_ONE_COMMAND:", data);
                    
                    // Find the existing record's index by cId.
                    let index = debug.editor.commands.findCommandIndexBy_cId(data.data.updatedRec.cId);

                    // Update the old record with the updated record. 
                    commands.commands[index] = data.data.updatedRec;

                    // Load the recently edited command.
                    debug.editor.selects.populateSelectsBy_cId(data.data.updatedRec.cId);
                }
            },
        },
        TEXT  : {
            PONG: function(data){
                console.log("PONG:", data);
            },
        },
    },
    // UTILITIES
    ws_utilities: {
        // Start the WebSocket connection.
        initWss: async function(){
            return new Promise(async function(resolve,reject){
                if(ws_control.connecting){ console.log("WS connection attempt already in progress."); resolve(false); return; }

                // GENERATE THE WEBSOCKET URL.
                let locUrl = `` +
                    `${window.location.protocol == "https:" ? "wss" : "ws"}://` +
                    `${window.location.hostname}` + 
                    `${window.location.port ? ':'+window.location.port : ''}` +
                    // `${window.location.pathname != "/" ? ''+window.location.pathname : '/'}` +
                    `/` +
                    `CONTROL`
                ;
                // console.log("locUrl:", locUrl);

                // Make sure that the server is up.
                let isServerUp = await http.pingServer();
                if(isServerUp === false) {
                    console.log("Server is unavailable");
                    resolve(false);
                    return; 
                };

                // Set the connection indicator.
                ws_control.status.setStatusColor("connecting");

                // Close any existing connections. 
                ws_control.ws_utilities.wsCloseAll();

                // Create new WebSocket connection. 
                ws_control.connecting = true;
                let ws = new WebSocket(locUrl);
                resolve(); true;
                ws.onopen   = ws_control.ws_events.el_open   ;
                ws.onmessage= ws_control.ws_events.el_message;
                ws.onclose  = ws_control.ws_events.el_close  ;
                ws.onerror  = ws_control.ws_events.el_error  ;
                ws.binaryType = 'arraybuffer';
                ws_control.activeWs = ws;

                // Add new to array of ws.
                ws_control.wsArr.push(ws);

                resolve(true);
                return; 
            });
        },
        // Close all WebSocket connections. 
        wsCloseAll: function(){
            // Close existing. 
            if(ws_control.activeWs){
                ws_control.activeWs.close();
            }

            // Close/reclose previous ws connections. 
            for(let i=0; i<ws_control.wsArr.length; i+=1){
                if(ws_control.wsArr[i] && ws_control.wsArr[i].close){
                    ws_control.wsArr[i].close();
                }
            }
        },
        
        // Timeout function for automatically reconnecting after a connection loss.
        autoReconnect_func: async function(){
            // Is autoReconnect disabled?
            if(!ws_control.autoReconnect){
                ws_control.autoReconnect_counter = 0;
                clearTimeout(ws_control.autoReconnect_id);
                return; 
            }

            // Have we reached the max number of attempts? 
            if(ws_control.autoReconnect_counter > ws_control.autoReconnect_counter_max){
                console.log(`  Reconntion has failed. Max number of attempts (${ws_control.autoReconnect_counter_max}) was reached. ((${(( (ws_control.autoReconnect_counter-1)*ws_control.autoReconnect_ms)/1000).toFixed(1)})) seconds`);
                ws_control.autoReconnect_counter = 0;
                clearTimeout(ws_control.autoReconnect_id);
            }

            // No. Try to connect.
            else{
                // Increment the counter by 1.
                ws_control.autoReconnect_counter += 1;

                console.log(`  Reconnection attempt ${ws_control.autoReconnect_counter} of ${ws_control.autoReconnect_counter_max}`);
                let resp = await ws_control.ws_utilities.initWss();

                // Did the connection fail?
                if(resp === false){
                    // If this was the last attempt then set the timeout delay to a smaller number.
                    if(ws_control.autoReconnect_counter >= ws_control.autoReconnect_counter_max){
                        ws_control.autoReconnect_id = setTimeout(ws_control.ws_utilities.autoReconnect_func, 100);
                    }
                    // Set the next attempt timeout.
                    else{
                        ws_control.autoReconnect_id = setTimeout(ws_control.ws_utilities.autoReconnect_func, ws_control.autoReconnect_ms);
                    }
                }
                // The connection was successful.
                else{
                    console.log(`  Reconnection successful (${((ws_control.autoReconnect_counter*ws_control.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
                    ws_control.autoReconnect_counter = 0;
                    clearTimeout(ws_control.autoReconnect_id);
                }
            }

        },

        //
        isWsConnected: function(){
            if(ws_control.activeWs){ return true; }
            return false;
        },
    },
    // EVENT HANDLERS.
    ws_events:{
        el_open:function(event){
            // console.log("Web WebSockets Client: OPEN:", event); 

            // Green icon.
            ws_control.status.setStatusColor("connected");

            // Remove disconnected, add connected.
            // let wsElems = document.querySelectorAll(".ws");
            // wsElems.forEach(function(d){ d.classList.add("connected"); d.classList.remove("disconnected"); });

            if(ws_control.autoReconnect){
                autoReconnect_counter = 0;
                clearTimeout(ws_control.autoReconnect_id);
            }
            ws_control.connecting = false;
        },
        el_message:function(event){
            let data;
            let tests = { isJson: false, isText: false, isArrayBuffer: false, isBlob: false };

            // Is event.data populated? (OPEN triggers message with no event data.)
            try{ if(event.data == null){ return; } }
            catch(e){ return; }

            // First, assume the data is JSON (verify this.)
            try{ data = JSON.parse(event.data); tests.isJson = true; }
            
            // Isn't JSON. What type is it?
            catch(e){ 
                // Get the data.
                data = event.data;

                // ARRAYBUFFER
                if(data instanceof ArrayBuffer){ tests.isArrayBuffer = true; }

                // BLOB
                else if(data instanceof Blob){ tests.isBlob = true; }
                
                // TEXT
                else{ tests.isText = true; }
            }

            if(tests.isJson){
                if(ws_control.ws_event_handlers.JSON[data.mode]){ ws_control.ws_event_handlers.JSON[data.mode](data); return; }
                else{ console.log("JSON: Unknown handler for:", data.mode, event); return;  }
            }

            else if(tests.isText){
                if(ws_control.ws_event_handlers.TEXT[data]){ ws_control.ws_event_handlers.TEXT[data](data); }
                else{ console.log("TEXT: Unknown handler for:", data, event); return; }
            }
            
            // Expects VRAM in event.data.
            else if(tests.isArrayBuffer){
                	console.log("isArrayBuffer");
            }
            
            else if(tests.isBlob){
            	console.log("isBlob");
            }

            // Catch-all.
            else{
                console.log("Unknown data for event.data.", event.data, event);
                return;
            }
        },
        el_close:function(event){
            // console.log("Web WebSockets Client: CLOSE:", event); 

            if(appView == "debug"){
                document.getElementById("top_status2_uuid").innerText = "";
            }

            // Yellow icon.
            ws_control.status.setStatusColor("disconnecting");

            ws_control.uuid = null;
            ws_control.activeWs = null;

            // Remove connected, add disconnected.
            // let wsElems = document.querySelectorAll(".ws");
            // wsElems.forEach(function(d){ d.classList.add("disconnected"); d.classList.remove("connected"); });

            // Skip autoReconnect if the skipAutoReconnect flag is set.
            if(!ws_control.skipAutoReconnect){
                setTimeout(function(){
                    // Gray icon.
                    ws_control.status.setStatusColor("disconnected");
                    
                    ws_control.connecting = false;

                    if(ws_control.autoReconnect){
                        ws_control.autoReconnect_counter = 0;
                        console.log(`'autoReconnect' is active. Will try to reconnect ${ws_control.autoReconnect_counter_max} times at ${ws_control.autoReconnect_ms} ms intervals. (${((ws_control.autoReconnect_counter_max*ws_control.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
                        ws_control.autoReconnect_id = setTimeout(ws_control.ws_utilities.autoReconnect_func, ws_control.autoReconnect_ms);
                    }

                }, 500);
            }
            else{
                console.log("skipAutoReconnect was set. AutoReconnect has been skipped.");

                // Gray icon.
                ws_control.status.setStatusColor("disconnected");
                
                // Clear the skipAutoReconnect flag.
                ws_control.skipAutoReconnect = false;
            }

        },
        // Connection closed unexpectedly. 
        el_error:function(ws, event){
            console.log("Web WebSockets Client: ERROR:", event); 
            
            if(appView == "debug"){
                document.getElementById("top_status2_uuid").innerText = "";
            }

            // If not CLOSING or CLOSED.
            if(ws.readyState != 2 || ws.readyState != 3){
                // Red icon.
                ws_control.status.setStatusColor("disconnecting");
            }
            // Close on error if not already closing or closed.
            else{
                ws.close();
            }

            // draw.fps.updateDisplay();
        },
    },

    // Status changer for the Websocket status indicator.
    status:{
        elems: {
            top:null,
            top_connected_status:null
        },
        previousClass: "disconnected",
        classes: [
            "pinging",
            "connecting",
            "connected",
            "disconnecting",
            "disconnected",
        ],
        classes_text: [
            "Pinging",
            "Connecting",
            "Connected",
            "Disconnecting",
            "Disconnected",
        ],
        removeStatus: function(){
            // Find the element. 
            let { elem, elem2, text } = this.findStatusIndicator();
            if(elem  === false){ console.log("Status indicator was NOT found."); return; }
            if(elem2 === false){ console.log("Status indicator2 was NOT found."); return; }

            // Remove the classes.
            for(let i=0; i<this.classes.length; i+=1){
                elem.classList.remove(this.classes[i]);
                elem2.classList.remove(this.classes[i]);
            }

            // Remove the text.
            text.innerText = "top_connected_status_text";
        },
        findStatusIndicator: function(){
            // Find the element. 
            let elem = document.getElementById("top_connected_status");
            let elem2 = document.getElementById("top");
            let text = document.getElementById("top_connected_status_text");
            if(elem && elem2 && text){ 
                return {
                    elem:elem, 
                    elem2:elem2, 
                    text:text, 
                }; 
            }

            // Not found? Return false.
            return false;
        },
        getStatusColor: function(){
            // Find the element. 
            let { elem, elem2, text } = this.findStatusIndicator();
            if(elem  === false){ console.log("Status indicator was NOT found."); return; }
            if(elem2 === false){ console.log("Status indicator2 was NOT found."); return; }

            // Get the active classes that are within the classes list.
            let classes =  Array.from(elem.classList).sort().filter(c => this.classes.indexOf(c) != -1 );

            // Return the classes. (there should only be one.)
            return classes[0];
        },
        setStatusColor: function(newClass=""){
            // Is this a valid class?
            if(this.classes.indexOf(newClass) == -1){
                console.log("Not a valid class", newClass, this.classes);
                return; 
            }

            // Find the element. 
            let { elem, elem2, text } = this.findStatusIndicator();
            if(elem  === false){ console.log("Status indicator was NOT found."); return; }
            if(elem2 === false){ console.log("Status indicator2 was NOT found."); return; }
            
            // Update the previous class.
            this.previousClass = this.getStatusColor();

            // Remove all classes on the elem first.
            this.removeStatus();

            // Set the new status.
            elem.classList.add(newClass);
            elem2.classList.add(newClass);

            // Set the status text.
            text.innerText = this.classes_text[this.classes.indexOf(newClass)];
        },
        restorePrevStatusColor:function(){
            // Find the element. 
            let { elem, text } = this.findStatusIndicator();
            if(elem === false){ console.log("Status indicator was NOT found."); return; }
            
            // Record the current class.
            let currentClass = this.getStatusColor();
            
            // Set the status indicator color back to it's previous value.
            this.setStatusColor(this.previousClass);

            // Update the previous class.
            this.previousClass = currentClass;
        },
    },
};
