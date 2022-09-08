// WEBSOCKETS FOR THE CONTROL CONNECTION.
_APP.ws_control = {
    parent: null,

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
    forcedDelay_ms            : 100,
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
    ws_event_handlers_JSON:{
        parent: null,

        // OPENING A NEW CONNECTION.
        NEWCONNECTION: function(data){
            // console.log(`mode: ${data.mode}, data:`, data.data);

            this.parent.connectivity_status_update.data.uuid = data.data;
            this.parent.activeWs.send( "CONNECTIVITY_STATUS_UPDATE" );

            // Open the first terminal.
            let terms = this.parent.parent.terminals;
            if(!terms.terms.length){ terms.createNewTerminal(terms.nextTermId, _APP.config.config.terms, 'TERM'); }
        },
        WELCOMEMESSAGE: function(data){
            console.log(`mode: ${data.mode}, data:`, data.data);
        },
        CONNECTIVITY_STATUS_UPDATE: function(data){
            // console.log(`mode: ${data.mode}, data:`, data.data);
            try{
                this.parent.connectivity_status_update.data.local.controls  = data.data.local.controls;
                this.parent.connectivity_status_update.data.local.terms     = data.data.local.terms;
                this.parent.connectivity_status_update.data.local.termPids  = data.data.local.termPids;
                this.parent.connectivity_status_update.data.global.controls = data.data.global.controls;
                this.parent.connectivity_status_update.data.global.terms    = data.data.global.terms;
                this.parent.connectivity_status_update.data.global.termPids = data.data.global.termPids;
                this.parent.connectivity_status_update.data.vpnStatus       = data.data.vpnCheck;
                this.parent.connectivity_status_update.display();
            }
            catch(e){
                this.parent.connectivity_status_update.data.uuid            = 0;
                this.parent.connectivity_status_update.data.local.controls  = 0;
                this.parent.connectivity_status_update.data.local.terms     = 0;
                this.parent.connectivity_status_update.data.global.controls = 0;
                this.parent.connectivity_status_update.data.global.terms    = 0;
                this.parent.connectivity_status_update.data.vpnStatus       = {};
                this.parent.connectivity_status_update.display();
            }
        },

        SUBSCRIBE: function(data){
            console.log(`mode: ${data.mode}, data:`, data.data);
        },
        UNSUBSCRIBE: function(data){
            console.log(`mode: ${data.mode}, data:`, data.data);
        },

        // DEBUG
        UPDATE_CONFIG:function(data){
            // console.log("UPDATE_CONFIG:", this.parent.parent.config.config);
            // console.log("UPDATE_CONFIG:", data.data);
            
            // Save the updated data.
            this.parent.parent.config.config = data.data;

            // Display the updated data.
            this.parent.parent.configUpdater.DOM.updateRemoteConfig_textarea.value = JSON.stringify(data.data,null,1);
        },
        
        // SECTIONS 

        UPDATE_ONE_SECTION: function(data){
            // console.log("UPDATE_ONE_SECTION:", data);

            // Replace the existing section record.
            let index = this.parent.parent.editor.sections.findSectionIndexBy_sId(data.data.updatedRec.sId);
            this.parent.parent.commands.sections[index] = data.data.updatedRec;

            // Replace the updated group records.
            for(let i=0; i<data.data.updatedGrps.length; i+=1){
                // Find the existing record's index by gId.
                let index = this.parent.parent.editor.groups.findGroupIndexBy_gId(data.data.updatedGrps[i].gId);

                // Update the old record with the updated record. 
                this.parent.parent.commands.groups[index] = data.data.updatedGrps[i];
            }

            // Replace the updated command records.
            for(let i=0; i<data.data.updatedCmds.length; i+=1){
                // Find the existing record's index by cId.
                let index = this.parent.parent.editor.commands.findCommandIndexBy_cId(data.data.updatedCmds[i].cId);

                // Update the old record with the updated record. 
                this.parent.parent.commands.commands[index] = data.data.updatedCmds[i];
            }

            // Save the previous select values. 
            let loaded_sId = Number(this.parent.parent.editor.selects.DOM["section_select"].value);
            let loaded_gId = Number(this.parent.parent.editor.selects.DOM["group_select"].value);
            let loaded_cId = Number(this.parent.parent.editor.selects.DOM["command_select"].value);

            // Populate sections, reload the section.
            this.parent.parent.editor.selects.populate_sections();
            this.parent.parent.editor.selects.DOM["section_select"].value = loaded_sId;
            this.parent.parent.editor.selects.sectionChange(loaded_sId);
            
            // Select the previous group and run groupChange.
            this.parent.parent.editor.selects.populate_groups(loaded_sId);
            this.parent.parent.editor.selects.DOM["group_select"]  .value = loaded_gId;
            this.parent.parent.editor.selects.groupChange(loaded_gId); 
            
            // Select the previous command and run commandChange. 
            this.parent.parent.editor.selects.populate_commands(loaded_gId);
            this.parent.parent.editor.selects.DOM["command_select"].value = loaded_cId;
            this.parent.parent.editor.selects.commandChange(loaded_cId); 
        },
        ADD_ONE_SECTION:function(data){
            // Server will send updated command record.
            console.log("ADD_ONE_SECTION:", data, this.parent.parent.commands.sections);
            
            // Add the new record to the sections list. 
            this.parent.parent.commands.sections.push(data.data.newRec);

            // Repopulate the sections. 
            this.parent.parent.editor.selects.populate_sections();

            // Set the section to be the new section and trigger the change event. This will reset the other selects too.
            this.parent.parent.editor.selects.DOM["section_select"].value = Number(data.data.newRec.sId);
            this.parent.parent.editor.selects.DOM["section_select"].dispatchEvent(new Event("change")); 
        },
        REMOVE_ONE_SECTION:function(data){
            // Server will send updated command record.
            console.log("REMOVE_ONE_SECTION:", data);
            
            // Find the existing record's index by gId.
            let index = this.parent.parent.editor.sections.findSectionIndexBy_sId(data.data.removedRec.sId);
            
            // Remove the group from the groups list.
            this.parent.parent.commands.sections.splice(index, 1);

            // Repopulate the sections select, populate groups, clear commands. 
            this.parent.parent.editor.selects.sectionChange();
        },


        // GROUPS

        UPDATE_ONE_GROUP: function(data){
            // Server will send updated group record and updated command records.
            // console.log("UPDATE_ONE_GROUP:", data);
            
            // Find the existing record's index by gId.
            let index = this.parent.parent.editor.groups.findGroupIndexBy_gId(data.data.updatedRec.gId);

            // Update the old record with the updated record. 
            this.parent.parent.commands.groups[index] = data.data.updatedRec;

            // Update all the commands in this group locally.
            for(let i=0; i<data.data.updatedCmds.length; i+=1){
                // Find the existing record's index by cId.
                let index = this.parent.parent.editor.commands.findCommandIndexBy_cId(data.data.updatedCmds[i].cId);

                // Update the old record with the updated record. 
                this.parent.parent.commands.commands[index] = data.data.updatedCmds[i];
            }

            // Save the loaded cId before it gets cleared.
            let loaded_cId = Number(this.parent.parent.editor.selects.DOM["command_select"].value);
            
            // Repopulate the group select.
            this.parent.parent.editor.selects.populate_groups( data.data.updatedRec.sId );

            // Reload the group.
            this.parent.parent.editor.selects.DOM["group_select"].value = data.data.updatedRec.gId;
            this.parent.parent.editor.selects.DOM["group_select"].dispatchEvent(new Event("change")); 
            
            // Reload the command editor with the current loaded command.
            this.parent.parent.editor.selects.DOM["command_select"].value = loaded_cId;
            this.parent.parent.editor.selects.DOM["command_select"].dispatchEvent(new Event("change")); 
    },
        ADD_ONE_GROUP:function(data){
            // Server will send updated command record.
            console.log("ADD_ONE_GROUP:", data);
            
            // Add the new record to the commands list. 
            this.parent.parent.commands.groups.push(data.data.newRec);

            // Repopulate the group select.
            this.parent.parent.editor.selects.populate_groups( data.data.newRec.sId );

            // Reload the group.
            this.parent.parent.editor.selects.DOM["group_select"].value = data.data.newRec.gId;
            this.parent.parent.editor.selects.DOM["group_select"].dispatchEvent(new Event("change")); 
            
            // Reload the command editor nothing.
            this.parent.parent.editor.selects.DOM["command_select"].value = "";
            this.parent.parent.editor.selects.DOM["command_select"].dispatchEvent(new Event("change")); 
        },
        REMOVE_ONE_GROUP: function(data){
            // Server will send updated command record.
            console.log("REMOVE_ONE_GROUP:", data);
            
            // Find the existing record's index by gId.
            let index = this.parent.parent.editor.groups.findGroupIndexBy_gId(data.data.removedRec.gId);
            
            // Remove the group from the groups list.
            this.parent.parent.commands.groups.splice(index, 1);

            // Repopulate the sections select, populate groups, clear commands. 
            this.parent.parent.editor.selects.sectionChange( Number(this.parent.parent.editor.selects.DOM["section_select"].value) );
        },

        // COMMANDS
        UPDATE_ONE_COMMAND: function(data){
            // Server will send updated command record.
            // console.log("UPDATE_ONE_COMMAND:", data);
            
            // Find the existing record's index by cId.
            let index = this.parent.parent.editor.commands.findCommandIndexBy_cId(data.data.updatedRec.cId);

            // Update the old record with the updated record. 
            this.parent.parent.commands.commands[index] = data.data.updatedRec;

            // Load the recently edited command.
            this.parent.parent.editor.selects.populateSelectsBy_cId(data.data.updatedRec.cId);
        },
        ADD_ONE_COMMAND: function(data){
            // Server will send updated command record.
            console.log("ADD_ONE_COMMAND:", data);
            
            // Add the new record to the commands list. 
            this.parent.parent.commands.commands.push(data.data.newRec);

            // Load the recently edited command.
            this.parent.parent.editor.selects.populateSelectsBy_cId(data.data.newRec.cId);
        },
        REMOVE_ONE_COMMAND: function(data){
            // Server will send updated command record.
            console.log("REMOVE_ONE_COMMAND:", data);
            
            // Find the existing record's index by cId.
            let index = this.parent.parent.editor.commands.findCommandIndexBy_cId(data.data.removedRec.cId);
            
            // Remove the command from the commands list.
            this.parent.parent.commands.commands.splice(index, 1);

            // Clear the command editor table. 
            this.parent.parent.editor.commands.clearEditorTable();

            // Repopulate the commands select. 
            this.parent.parent.editor.selects.populate_commands(data.data.removedRec.gId);
        },
    },
    ws_event_handlers_TEXT:{
        parent: null,
        PONG: function(data){
            console.log("PONG:", data);
        },
    },
    // UTILITIES
    ws_utilities: {
        parent: null,

        // Start the WebSocket connection.
        initWss: async function(){
            return new Promise(async (resolve,reject)=>{
                if(this.parent.connecting){ console.log("WS connection attempt already in progress."); resolve(false); return; }

                // GENERATE THE WEBSOCKET URL.
                let prePath = window.location.pathname.split("/");
                prePath.pop(); 
                prePath = prePath.join("/");
                prePath = prePath.indexOf("/") != 0 ? ("/") : (prePath + "/");
                let locUrl = `` +
                `${window.location.protocol == "https:" ? "wss" : "ws"}://` +
                `${window.location.hostname}` + 
                `${window.location.port ? ':'+window.location.port : ''}` +
                `${prePath}` +
                `CONTROL`
                ;

                // Make sure that the server is up.
                let isServerUp = await this.parent.parent.http.pingServer();
                if(isServerUp === false) {
                    console.log("Server is unavailable");
                    resolve(false);
                    return; 
                };

                // Set the connection indicator.
                this.parent.status.setStatusColor("connecting");

                // Close any existing connections. 
                this.parent.ws_utilities.wsCloseAll();

                // Create new WebSocket connection. 
                this.parent.connecting = true;

                // Force a short wait.
                await new Promise(async (res,rej)=>{ setTimeout(()=>{ res(); }, this.parent.forcedDelay_ms); });
                
                let ws = new WebSocket(locUrl);
                ws.addEventListener("open",    (ev)=>this.parent.ws_events.el_open(ev), false)   ;
                ws.addEventListener("message", (ev)=>this.parent.ws_events.el_message(ev), false);
                ws.addEventListener("close",   (ev)=>this.parent.ws_events.el_close(ev), false)  ;
                ws.addEventListener("error",   (ev)=>this.parent.ws_events.el_error(ev), false)  ;
                ws.binaryType = 'arraybuffer';
                this.parent.activeWs = ws;

                // Add new to array of ws.
                this.parent.wsArr.push(ws);

                resolve(true);
                return; 
            });
        },
        // Close all WebSocket connections. 
        wsCloseAll: function(){
            // Close existing. 
            if(this.parent.activeWs){
                this.parent.activeWs.close();
            }

            // Close/reclose previous ws connections. 
            for(let i=0; i<this.parent.wsArr.length; i+=1){
                if(this.parent.wsArr[i] && this.parent.wsArr[i].close){
                    this.parent.wsArr[i].close();
                }
            }
        },
        
        // Timeout function for automatically reconnecting after a connection loss.
        autoReconnect_func: async function(){
            // Is autoReconnect disabled?
            if(!this.parent.autoReconnect){
                this.parent.autoReconnect_counter = 0;
                clearTimeout(this.parent.autoReconnect_id);
                return; 
            }

            // Have we reached the max number of attempts? 
            if(this.parent.autoReconnect_counter > this.parent.autoReconnect_counter_max){
                console.log(`  Reconntion has failed. Max number of attempts (${this.parent.autoReconnect_counter_max}) was reached. ((${(( (this.parent.autoReconnect_counter-1)*this.parent.autoReconnect_ms)/1000).toFixed(1)})) seconds`);
                this.parent.autoReconnect_counter = 0;
                clearTimeout(this.parent.autoReconnect_id);
            }

            // No. Try to connect.
            else{
                // Increment the counter by 1.
                this.parent.autoReconnect_counter += 1;

                console.log(`  Reconnection attempt ${this.parent.autoReconnect_counter} of ${this.parent.autoReconnect_counter_max}`);
                let resp = await this.parent.ws_utilities.initWss();

                // Did the connection fail?
                if(resp === false){
                    // If this was the last attempt then set the timeout delay to a smaller number.
                    if(this.parent.autoReconnect_counter >= this.parent.autoReconnect_counter_max){
                        this.parent.autoReconnect_id = setTimeout(()=>this.parent.ws_utilities.autoReconnect_func(), 100);
                    }
                    // Set the next attempt timeout.
                    else{
                        this.parent.autoReconnect_id = setTimeout(()=>this.parent.ws_utilities.autoReconnect_func(), this.parent.autoReconnect_ms);
                    }
                }
                // The connection was successful.
                else{
                    console.log(`  Reconnection successful (${((this.parent.autoReconnect_counter*this.parent.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
                    this.parent.autoReconnect_counter = 0;
                    clearTimeout(this.parent.autoReconnect_id);
                }
            }

        },

        //
        isWsConnected: function(){
            if(this.parent.activeWs){ return true; }
            return false;
        },
    },
    // EVENT HANDLERS.
    ws_events:{
        parent: null,
        el_open:function(event){
            // console.log("Web WebSockets Client: OPEN:", event); 

            // Green icon.
            this.parent.status.setStatusColor("connected");

            // Remove disconnected, add connected.
            // let wsElems = document.querySelectorAll(".ws");
            // wsElems.forEach(function(d){ d.classList.add("connected"); d.classList.remove("disconnected"); });

            if(this.parent.autoReconnect){
                autoReconnect_counter = 0;
                clearTimeout(this.parent.autoReconnect_id);
            }
            this.parent.connecting = false;
        },
        el_message:function(event){
            let data;
            let tests = { isJson: false, isText: false, isArrayBuffer: false, isBlob: false };

            // Is event.data populated? (OPEN triggers message with no event data.)
            try{ if(undefined == event.data || null == event.data){ console.log("event was not set."); return; } }
            catch(e){ console.log("catch: event undefined?", event, e); return; }

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
                if(this.parent.ws_event_handlers_JSON[data.mode]){ this.parent.ws_event_handlers_JSON[data.mode](data); return; }
                else{ console.log("JSON: Unknown handler for:", data.mode, event); return;  }
            }

            else if(tests.isText){
                if(this.parent.ws_event_handlers_TEXT[data]){ this.parent.ws_event_handlers_TEXT[data](data); }
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

            this.parent.connectivity_status_update.data.uuid            = 0;
            this.parent.connectivity_status_update.data.local.controls  = 0;
            this.parent.connectivity_status_update.data.local.terms     = 0;
            this.parent.connectivity_status_update.data.global.controls = 0;
            this.parent.connectivity_status_update.data.global.terms    = 0;
            this.parent.connectivity_status_update.data.vpnStatus       = {};
            this.parent.connectivity_status_update.display();

            // Yellow icon.
            this.parent.status.setStatusColor("disconnecting");

            this.parent.connectivity_status_update.data.uuid = 0;
            this.parent.activeWs = null;

            // Remove connected, add disconnected.
            // let wsElems = document.querySelectorAll(".ws");
            // wsElems.forEach(function(d){ d.classList.add("disconnected"); d.classList.remove("connected"); });

            // Skip autoReconnect if the skipAutoReconnect flag is set.
            if(!this.parent.skipAutoReconnect){
                setTimeout(()=>{
                    // Gray icon.
                    this.parent.status.setStatusColor("disconnected");
                    
                    this.parent.connecting = false;

                    if(this.parent.autoReconnect){
                        this.parent.autoReconnect_counter = 0;
                        console.log(`'autoReconnect' is active. Will try to reconnect ${this.parent.autoReconnect_counter_max} times at ${this.parent.autoReconnect_ms} ms intervals. (${((this.parent.autoReconnect_counter_max*this.parent.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
                        this.parent.autoReconnect_id = setTimeout(()=>this.parent.ws_utilities.autoReconnect_func(), this.parent.autoReconnect_ms);
                    }

                }, this.parent.forcedDelay_ms);
            }
            else{
                console.log("skipAutoReconnect was set. AutoReconnect has been skipped.");

                // Force a short wait.
                await new Promise(async (res,rej)=>{ setTimeout(()=>{ res(); }, this.parent.forcedDelay_ms); });

                // Gray icon.
                this.parent.status.setStatusColor("disconnected");
                
                // Clear the skipAutoReconnect flag.
                this.parent.skipAutoReconnect = false;
            }

        },
        // Connection closed unexpectedly. 
        el_error:function(ws, event){
            console.log("Web WebSockets Client: ERROR:", event); 
            
            this.parent.connectivity_status_update.data.uuid            = 0;
            this.parent.connectivity_status_update.data.local.controls  = 0;
            this.parent.connectivity_status_update.data.local.terms     = 0;
            this.parent.connectivity_status_update.data.global.controls = 0;
            this.parent.connectivity_status_update.data.global.terms    = 0;
            this.parent.connectivity_status_update.data.vpnStatus       = {};
            this.parent.connectivity_status_update.display();

            // If not CLOSING or CLOSED.
            if(ws.readyState != 2 || ws.readyState != 3){
                // Red icon.
                this.parent.status.setStatusColor("disconnecting");
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
        parent: null,
        inited: false,
        coloredElems: {
            main         : { elem:null, id:"main" },
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
        parent: null,
        inited:false,
        data: {
            uuid: 0,
            local:{
                controls: 0,
                terms: 0,
                termPids: [],
            },
            global:{
                controls: 0,
                terms: 0,
                termPids: [],
            },
            vpnStatus: {}
        },
        elems: {},
        display:function(){
            // VPN
            if(this.parent.parent.config.config.connectionCheck.active){
                // VPN setting is active so show this div. 
                this.elems.vpnStatus.classList.add("active");
                // host
                // alive
                if(this.data.vpnStatus.alive == true){
                    this.elems.vpn_indicator.classList.add("active");
                    this.elems.vpn_indicator.innerText = "VPN:  ONLINE";
                    this.elems.vpn_indicator.title = `HOST: ${this.data.vpnStatus.host}, ALIVE: ${this.data.vpnStatus.alive}`;
                }
                else{
                    this.elems.vpn_indicator.classList.remove("active");
                    this.elems.vpn_indicator.innerText = "VPN: OFFLINE";
                    this.elems.vpn_indicator.title = `HOST: ${this.data.vpnStatus.host}, ALIVE: ${this.data.vpnStatus.alive}`;
                }
            }

            // Show data if the UUID is populated.
            if(this.data.uuid !== 0){
                // Update UUID.
                this.elems["uuid"].innerText = this.data.uuid.toUpperCase();
                
                // Update LOCAL.
                this.elems["local"].innerText = `Controls: ${this.data.local.controls}, Terminals: ${this.data.local.terms}`;
                
                // Update GLOBAL.
                this.elems["global"].innerText = `Controls: ${this.data.global.controls}, Terminals: ${this.data.global.terms}`;
            }
            
            // If the UUID is NOT populated then just display "<Not Connected>".
            else{
                this.elems["uuid"].innerText   = "<Not Connected>";
                this.elems["local"].innerText  = "<Not Connected>";
                this.elems["global"].innerText = "<Not Connected>";
            }

            // Show localGlobalStatus data.
            // Get the current text.
            let oldText = this.elems.localGlobalStatus.innerHTML;

            // Create new text.
            let newText = ``;
            // newText += `\n`;
            newText += "  LOCAL  Terminal PIDS: " + (this.data.local .termPids.length ? `[ <span class="terms_info_localGlobalStatus_pids">${this.data.local.termPids.join(", ") }</span> ]\n` : `[]\n`);
            newText += "  GLOBAL Terminal PIDS: " + (this.data.global.termPids.length ? `[ <span class="terms_info_localGlobalStatus_pids">${this.data.global.termPids.join(", ")}</span> ]\n` : `[]\n`);

            // Only update the DOM if the oldText and the newText are different.
            if(oldText != newText){
                // console.log("Updating PID list");
                this.elems.localGlobalStatus.innerHTML = newText;
            }

        },
        requestUpdate: function(){
            if(!this.parent.ws_utilities.isWsConnected()){ return; }
            this.parent.activeWs.send( "CONNECTIVITY_STATUS_UPDATE" );
        },
        init: function(configObj){
            return new Promise(async (resolve,reject)=>{
                // Load from config.
                for(let key in configObj.elems){ this.elems[key] = configObj.elems[key]; }
                for(let key in this.elems){
                    if(typeof this.elems[key] == "string"){ 
                        this.elems[key] = document.getElementById( this.elems[key] ); 
                    }
                }

                // Do maintenance tasks based on a timer. 
                this.parent.parent.timedTasks.addTask(
                    {
                        name: "connectivity_status_update",
                        delay_ms: 5000,
                        lastRun: performance.now(),
                        func: ()=>{ this.requestUpdate(); }
                    }
                );

                this.inited = true; 
                resolve();
            });
        },
    },

    init: async function(parent, configObj){
        return new Promise(async (resolve,reject)=>{
            this.parent                            = parent;
            this.connectivity_status_update.parent = this;
            this.status                    .parent = this;
            this.ws_events                 .parent = this;
            this.ws_utilities              .parent = this;
            this.ws_event_handlers_JSON    .parent = this;
            this.ws_event_handlers_TEXT    .parent = this;
            
            await this.connectivity_status_update.init(configObj.connectivity_status_update);
            await this.status.init();
            resolve();
        });
    },
};
