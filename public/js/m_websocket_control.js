// WEBSOCKETS FOR THE CONTROL CONNECTION.
_APP.ws_control = {
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
    forcedDelay_ms            : 500,
    connectivity_status_update_ms : 5000,

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
                // console.log(`mode: ${data.mode}, data:`, data.data);
                _APP.ws_control.connectivity_status_update.data.uuid = data.data;
                if(_APP.appView == "debug"){
                    _APP.ws_control.activeWs.send( "CONNECTIVITY_STATUS_UPDATE" );
                }
            },
            WELCOMEMESSAGE: function(data){
                console.log(`mode: ${data.mode}, data:`, data.data);
            },
            CONNECTIVITY_STATUS_UPDATE: function(data){
                // console.log(`mode: ${data.mode}, data:`, data.data);
                try{
                    _APP.ws_control.connectivity_status_update.data.local.controls  = data.data.local.controls;
                    _APP.ws_control.connectivity_status_update.data.local.terms     = data.data.local.terms;
                    _APP.ws_control.connectivity_status_update.data.global.controls = data.data.global.controls;
                    _APP.ws_control.connectivity_status_update.data.global.terms    = data.data.global.terms;
                    _APP.ws_control.connectivity_status_update.display();
                }
                catch(e){
                    _APP.ws_control.connectivity_status_update.data.uuid            = 0;
                    _APP.ws_control.connectivity_status_update.data.local.controls  = 0;
                    _APP.ws_control.connectivity_status_update.data.local.terms     = 0;
                    _APP.ws_control.connectivity_status_update.data.global.controls = 0;
                    _APP.ws_control.connectivity_status_update.data.global.terms    = 0;
                    _APP.ws_control.connectivity_status_update.display();
                }
            },

            SUBSCRIBE: function(data){
                console.log(`mode: ${data.mode}, data:`, data.data);
            },
            UNSUBSCRIBE: function(data){
                console.log(`mode: ${data.mode}, data:`, data.data);
            },
            CLIENT_COUNT: function(data){
                if(_APP.appView == "debug"){
                    console.log("CLIENT_COUNT:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },

            GET_DB_AS_JSON: function(data){
                if(_APP.appView == "debug"){
                    console.log("GET_DB_AS_JSON:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                    // _APP.commands = data;
                }
            },
            SECTIONS_LIST: function(data){
                if(_APP.appView == "debug"){
                    console.log("SECTIONS_LIST:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            GROUPS_LIST: function(data){
                if(_APP.appView == "debug"){
                    console.log("GROUPS_LIST:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            COMMANDS_LIST: function(data){
                if(_APP.appView == "debug"){
                    console.log("COMMANDS_LIST:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },

            
            // 
            GET_ONE_CMD: function(data){
                if(_APP.appView == "debug"){
                    console.log("GET_ONE_CMD:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            TYPE_CMD_TO_TERM: function(data){
                if(_APP.appView == "debug"){
                    console.log("TYPE_CMD_TO_TERM:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            UPDATE_ONE_SECTION: function(data){
                if(_APP.appView == "debug"){
                    console.log("UPDATE_ONE_SECTION:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            UPDATE_ONE_GROUP: function(data){
                if(_APP.appView == "debug"){
                    console.log("UPDATE_ONE_GROUP:", data);
                    document.getElementById("main_views_output").innerHTML = JSON.stringify(data,null,1);
                }
            },
            // TODO
            UPDATE_ONE_COMMAND: function(data){
                if(_APP.appView == "debug"){
                    // Server will send updated command record.
                    console.log("UPDATE_ONE_COMMAND:", data);
                    
                    // Find the existing record's index by cId.
                    let index = _APP.editor.commands.findCommandIndexBy_cId(data.data.updatedRec.cId);

                    // Update the old record with the updated record. 
                    _APP.commands.commands[index] = data.data.updatedRec;

                    // Load the recently edited command.
                    _APP.editor.selects.populateSelectsBy_cId(data.data.updatedRec.cId);
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
                if(_APP.ws_control.connecting){ console.log("WS connection attempt already in progress."); resolve(false); return; }

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
                let isServerUp = await _APP.http.pingServer();
                if(isServerUp === false) {
                    console.log("Server is unavailable");
                    resolve(false);
                    return; 
                };

                // Set the connection indicator.
                _APP.ws_control.status.setStatusColor("connecting");

                // Close any existing connections. 
                _APP.ws_control.ws_utilities.wsCloseAll();

                // Create new WebSocket connection. 
                _APP.ws_control.connecting = true;

                // Force a short wait.
                await new Promise(async (res,rej)=>{ setTimeout(function(){ res(); }, _APP.ws_control.forcedDelay_ms); });
                
                let ws = new WebSocket(locUrl);
                resolve(); true;
                ws.onopen   = _APP.ws_control.ws_events.el_open   ;
                ws.onmessage= _APP.ws_control.ws_events.el_message;
                ws.onclose  = _APP.ws_control.ws_events.el_close  ;
                ws.onerror  = _APP.ws_control.ws_events.el_error  ;
                ws.binaryType = 'arraybuffer';
                _APP.ws_control.activeWs = ws;

                // Add new to array of ws.
                _APP.ws_control.wsArr.push(ws);

                resolve(true);
                return; 
            });
        },
        // Close all WebSocket connections. 
        wsCloseAll: function(){
            // Close existing. 
            if(_APP.ws_control.activeWs){
                _APP.ws_control.activeWs.close();
            }

            // Close/reclose previous ws connections. 
            for(let i=0; i<_APP.ws_control.wsArr.length; i+=1){
                if(_APP.ws_control.wsArr[i] && _APP.ws_control.wsArr[i].close){
                    _APP.ws_control.wsArr[i].close();
                }
            }
        },
        
        // Timeout function for automatically reconnecting after a connection loss.
        autoReconnect_func: async function(){
            // Is autoReconnect disabled?
            if(!_APP.ws_control.autoReconnect){
                _APP.ws_control.autoReconnect_counter = 0;
                clearTimeout(_APP.ws_control.autoReconnect_id);
                return; 
            }

            // Have we reached the max number of attempts? 
            if(_APP.ws_control.autoReconnect_counter > _APP.ws_control.autoReconnect_counter_max){
                console.log(`  Reconntion has failed. Max number of attempts (${_APP.ws_control.autoReconnect_counter_max}) was reached. ((${(( (_APP.ws_control.autoReconnect_counter-1)*_APP.ws_control.autoReconnect_ms)/1000).toFixed(1)})) seconds`);
                _APP.ws_control.autoReconnect_counter = 0;
                clearTimeout(_APP.ws_control.autoReconnect_id);
            }

            // No. Try to connect.
            else{
                // Increment the counter by 1.
                _APP.ws_control.autoReconnect_counter += 1;

                console.log(`  Reconnection attempt ${_APP.ws_control.autoReconnect_counter} of ${_APP.ws_control.autoReconnect_counter_max}`);
                let resp = await _APP.ws_control.ws_utilities.initWss();

                // Did the connection fail?
                if(resp === false){
                    // If this was the last attempt then set the timeout delay to a smaller number.
                    if(_APP.ws_control.autoReconnect_counter >= _APP.ws_control.autoReconnect_counter_max){
                        _APP.ws_control.autoReconnect_id = setTimeout(_APP.ws_control.ws_utilities.autoReconnect_func, 100);
                    }
                    // Set the next attempt timeout.
                    else{
                        _APP.ws_control.autoReconnect_id = setTimeout(_APP.ws_control.ws_utilities.autoReconnect_func, _APP.ws_control.autoReconnect_ms);
                    }
                }
                // The connection was successful.
                else{
                    console.log(`  Reconnection successful (${((_APP.ws_control.autoReconnect_counter*_APP.ws_control.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
                    _APP.ws_control.autoReconnect_counter = 0;
                    clearTimeout(_APP.ws_control.autoReconnect_id);
                }
            }

        },

        //
        isWsConnected: function(){
            if(_APP.ws_control.activeWs){ return true; }
            return false;
        },
    },
    // EVENT HANDLERS.
    ws_events:{
        el_open:function(event){
            // console.log("Web WebSockets Client: OPEN:", event); 

            // Green icon.
            _APP.ws_control.status.setStatusColor("connected");

            // Remove disconnected, add connected.
            // let wsElems = document.querySelectorAll(".ws");
            // wsElems.forEach(function(d){ d.classList.add("connected"); d.classList.remove("disconnected"); });

            if(_APP.ws_control.autoReconnect){
                autoReconnect_counter = 0;
                clearTimeout(_APP.ws_control.autoReconnect_id);
            }
            _APP.ws_control.connecting = false;
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
                if(_APP.ws_control.ws_event_handlers.JSON[data.mode]){ _APP.ws_control.ws_event_handlers.JSON[data.mode](data); return; }
                else{ console.log("JSON: Unknown handler for:", data.mode, event); return;  }
            }

            else if(tests.isText){
                if(_APP.ws_control.ws_event_handlers.TEXT[data]){ _APP.ws_control.ws_event_handlers.TEXT[data](data); }
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
        el_close: async function(event){
            // console.log("Web WebSockets Client: CLOSE:", event); 

            if(_APP.appView == "debug"){
                _APP.ws_control.connectivity_status_update.data.uuid            = 0;
                _APP.ws_control.connectivity_status_update.data.local.controls  = 0;
                _APP.ws_control.connectivity_status_update.data.local.terms     = 0;
                _APP.ws_control.connectivity_status_update.data.global.controls = 0;
                _APP.ws_control.connectivity_status_update.data.global.terms    = 0;
                _APP.ws_control.connectivity_status_update.display();
            }

            // Yellow icon.
            _APP.ws_control.status.setStatusColor("disconnecting");

            _APP.ws_control.connectivity_status_update.data.uuid = 0;
            _APP.ws_control.activeWs = null;

            // Remove connected, add disconnected.
            // let wsElems = document.querySelectorAll(".ws");
            // wsElems.forEach(function(d){ d.classList.add("disconnected"); d.classList.remove("connected"); });

            // Skip autoReconnect if the skipAutoReconnect flag is set.
            if(!_APP.ws_control.skipAutoReconnect){
                setTimeout(function(){
                    // Gray icon.
                    _APP.ws_control.status.setStatusColor("disconnected");
                    
                    _APP.ws_control.connecting = false;

                    if(_APP.ws_control.autoReconnect){
                        _APP.ws_control.autoReconnect_counter = 0;
                        console.log(`'autoReconnect' is active. Will try to reconnect ${_APP.ws_control.autoReconnect_counter_max} times at ${_APP.ws_control.autoReconnect_ms} ms intervals. (${((_APP.ws_control.autoReconnect_counter_max*_APP.ws_control.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
                        _APP.ws_control.autoReconnect_id = setTimeout(_APP.ws_control.ws_utilities.autoReconnect_func, _APP.ws_control.autoReconnect_ms);
                    }

                }, _APP.ws_control.forcedDelay_ms);
            }
            else{
                console.log("skipAutoReconnect was set. AutoReconnect has been skipped.");

                // Force a short wait.
                await new Promise(async (res,rej)=>{ setTimeout(function(){ res(); }, _APP.ws_control.forcedDelay_ms); });

                // Gray icon.
                _APP.ws_control.status.setStatusColor("disconnected");
                
                // Clear the skipAutoReconnect flag.
                _APP.ws_control.skipAutoReconnect = false;
            }

        },
        // Connection closed unexpectedly. 
        el_error:function(ws, event){
            console.log("Web WebSockets Client: ERROR:", event); 
            
            if(_APP.appView == "debug"){
                _APP.ws_control.connectivity_status_update.data.uuid            = 0;
                _APP.ws_control.connectivity_status_update.data.local.controls  = 0;
                _APP.ws_control.connectivity_status_update.data.local.terms     = 0;
                _APP.ws_control.connectivity_status_update.data.global.controls = 0;
                _APP.ws_control.connectivity_status_update.data.global.terms    = 0;
                _APP.ws_control.connectivity_status_update.display();
            }

            // If not CLOSING or CLOSED.
            if(ws.readyState != 2 || ws.readyState != 3){
                // Red icon.
                _APP.ws_control.status.setStatusColor("disconnecting");
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
        inited: false,
        coloredElems: {
            // top          : { elem:null, id:"top" },
            main         : { elem:null, id:"main" },
            // bottom       : { elem:null, id:"bottom" },
            statusSquare : { elem:null, id:"top_connected_status" },
        },
        elems: {
            statusText   : { elem:null, id:"top_connected_status_text" },
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
            // Remove the classes.
            let keys = Object.keys(this.coloredElems);
            for(let i=0; i<this.classes.length; i+=1){
                for(let j=0; j<keys.length; j+=1){
                    this.coloredElems[keys[j]].classList.remove( this.classes[i] );
                }
            }

            // Remove the text.
            this.elems.statusText.innerText = "";
        },
        getStatusColor: function(){
            // Get the active classes that are within the classes list.
            // NOTE: only check "statusSquare" because the other colored elems should have the same class anyway.
            let classes =  Array.from(this.coloredElems.statusSquare.classList).sort().filter(c => this.classes.indexOf(c) != -1 );
            
            // Return the classes. (there should only be one.)
            return classes[0];
        },
        setStatusColor: function(newClass=""){
            // Is this a valid class?
            if(this.classes.indexOf(newClass) == -1){
                console.log("Not a valid class", newClass, "Valid classes are:", this.classes);
                return; 
            }

            // Update the previous class.
            this.previousClass = this.getStatusColor();

            // Remove all classes on the elem first.
            this.removeStatus();

            // Set the new status.
            let keys = Object.keys(this.coloredElems);
            for(let j=0; j<keys.length; j+=1){
                this.coloredElems[keys[j]].classList.add( newClass );
            }

            // Set the status text.
            this.elems.statusText.innerText = this.classes_text[this.classes.indexOf(newClass)];
        },
        restorePrevStatusColor:function(){
            // Record the current class.
            let currentClass = this.getStatusColor();
            
            // Set the status indicator color back to it's previous value.
            this.setStatusColor(this.previousClass);

            // Update the previous class.
            this.previousClass = currentClass;
        },

        init: function(){
            return new Promise(async (resolve,reject)=>{
                if(this.inited){ console.log("status object has already been inited."); return; }
                
                // Generate the DOM cache for each element.
                let keys = Object.keys(this.coloredElems);
                for(let i=0; i<keys.length; i+=1){
                    this.coloredElems[ keys[i] ] = document.getElementById( this.coloredElems[ keys[i] ].id );
                }
                keys = Object.keys(this.elems);
                for(let i=0; i<keys.length; i+=1){
                    this.elems[ keys[i] ] = document.getElementById( this.elems[ keys[i] ].id );
                }
                this.inited = true; 

                resolve();
            });
        },
    },

    // Displays uuid, control/term counts for both local and global.
    connectivity_status_update: {
        inited:false,
        intervalId:null,
        data: {
            uuid: 0,
            local:{
                controls: 0,
                terms: 0,
            },
            global:{
                controls: 0,
                terms: 0,
            },
        },
        elems: {
            uuid  : "bottom_status2_connectionDetails_uuid",
            local : "bottom_status2_connectionDetails_local",
            global: "bottom_status2_connectionDetails_global",
        },
        display:function(){
            // DOM cache.
            if(typeof this.elems["uuid"]   == "string"){ this.elems["uuid"]   = document.getElementById(this.elems["uuid"]);   }
            if(typeof this.elems["local"]  == "string"){ this.elems["local"]  = document.getElementById(this.elems["local"]);  }
            if(typeof this.elems["global"] == "string"){ this.elems["global"] = document.getElementById(this.elems["global"]); }

            // if(!_APP.ws_control.activeWs){
            //     this.elems["uuid"].innerText = "<Not Connected>";
            //     this.elems["local"].innerText = "<Not Connected>";
            //     this.elems["global"].innerText = "<Not Connected>";
            //     return;
            // }
            // return;

            if(this.data.uuid !== 0){
                // Update UUID.
                this.elems["uuid"].innerText = this.data.uuid.toUpperCase();
                
                // Update LOCAL.
                this.elems["local"].innerText = `Controls: ${this.data.local.controls}, Terminals: ${this.data.local.terms}`;
                
                // Update GLOBAL.
                this.elems["global"].innerText = `Controls: ${this.data.global.controls}, Terminals: ${this.data.global.terms}`;
            }
            else{
                this.elems["uuid"].innerText   = "<Not Connected>";
                this.elems["local"].innerText  = "<Not Connected>";
                this.elems["global"].innerText = "<Not Connected>";
            }
        },
        requestUpdate: function(){
            if(!_APP.ws_control.ws_utilities.isWsConnected()){ return; }
            _APP.ws_control.activeWs.send( "CONNECTIVITY_STATUS_UPDATE" );
        },
        clearInterval: function(){
            console.log("WARN: 'connectivity_status_update.clearInterval' ran.");
            clearInterval(this.intervalId);
            this.inited = false; 
        },
        init: function(){
            setInterval(()=> this.intervalId = this.requestUpdate(), 5000);
            this.inited = true; 
        },
    },
};
