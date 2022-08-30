let debug = {
    wsClient_count: function(){
        if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        ws_control.activeWs.send("CLIENT_COUNT");
    },
    wsClient_sectionsList: function(){
        if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        ws_control.activeWs.send("SECTIONS_LIST");
    },
    wsClient_groupsList: function(){
        if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        ws_control.activeWs.send("GROUPS_LIST");
    },
    wsClient_commandsList: function(){
        if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        ws_control.activeWs.send("COMMANDS_LIST");
    },
    wsClient_getDbAsJSON: function(){
        if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        ws_control.activeWs.send("GET_DB_AS_JSON");
    },
    wsClient_getOneCommand: function(sId, gId, cId){
        if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        ws_control.activeWs.send( JSON.stringify( { mode:"GET_ONE_CMD", data: { sId:sId, gId:gId, cId:cId } } ) );
    },

    editor: {
        nav: {
            parent: null,
            tabs:[],
            views:[],
    
            hideAllViews: function(){
                // Deactivate all tabs and views. 
                this.tabs.forEach(d=>{ d.classList.remove("active"); })
                this.views.forEach(d=>{ d.classList.remove("active"); })
            },
            showOneView: function(tabElem){
                // Deactivate all tabs and views. 
                this.hideAllViews();
    
                // Get the view.
                let viewElem = document.getElementById( tabElem.getAttribute("view") ); 
    
                // Set the active class for this tab and view. 
                tabElem.classList.add("active");
                viewElem.classList.add("active");
            },
            init : function(){
                // Save the tabs and views. 
                this.tabs =   document.querySelectorAll(`.nav_tab[group='editor']`);
                this.views =  document.querySelectorAll(`.view[group='editor']`);
    
                // Deactivate all tabs and views. 
                this.hideAllViews();
    
                // Add event listeners to the tabs.
                this.tabs.forEach( (tab) => tab.addEventListener("click", () => this.showOneView(tab), false) ); 
        
                // Show the first tab and view. 
                this.showOneView( this.tabs[0] );
            },
        },
        selects: {
            parent:null,
            DOM:{},
            populate_sections: function(){
                let frag = document.createDocumentFragment();
                let option;
                for(let i=0; i<commands.sections.length; i+=1){
                    let rec = commands.sections[i];
                    option = document.createElement("option");
                    option.value = `${rec.sId}`;
                    option.innerText = `${rec.name}`;
                    option.setAttribute("order", `${rec.order}`);
                    frag.append(option);
                }
                this.DOM.commandEditor["section1_select"].options.length = 1;  
                this.DOM.commandEditor["section1_select"].append(frag);
            },
            populate_groups: function(sId){
                let frag = document.createDocumentFragment();
                let option;
                for(let i=0; i<commands.groups.length; i+=1){
                    let rec = commands.groups[i];
                    if(rec.sId != sId){ continue; }

                    option = document.createElement("option");
                    option.value = `${rec.gId}`;
                    option.innerText = `${rec.name}`;
                    option.setAttribute("order", `${rec.order}`);
                    frag.append(option);
                }
                this.DOM.commandEditor["group1_select"].options.length = 1;  
                this.DOM.commandEditor["group1_select"].append(frag);
            },
            populate_commands: function(gId){
                let frag = document.createDocumentFragment();
                let option;
                for(let i=0; i<commands.commands.length; i+=1){
                    let rec = commands.commands[i];
                    if(rec.gId != gId){ continue; }

                    option = document.createElement("option");
                    option.value = `${rec.cId}`;
                    option.innerText = `${rec.title}`;
                    option.setAttribute("order", `${rec.order}`);
                    frag.append(option);
                }
                this.DOM.commandEditor["command1_select"].options.length = 1;  
                this.DOM.commandEditor["command1_select"].append(frag);
            },
            populate_command: function(cId){
                console.log("populate_command:", cId);
                let cmd = commands.commands.find(d=>d.cId == cId);
                console.log(cmd);
            },
            init: function(){
                // Add objects for each section.
                this.DOM.sectionEditor = {};
                this.DOM.groupEditor   = {};
                this.DOM.commandEditor = {};
                                
                // Command Editor
                this.DOM.commandEditor["section1_select"] = document.getElementById("commandEditor_section1_select");
                this.DOM.commandEditor["group1_select"]   = document.getElementById("commandEditor_group1_select");
                this.DOM.commandEditor["command1_select"] = document.getElementById("commandEditor_command1_select");

                this.populate_sections();

                // When changing section:
                this.DOM.commandEditor["section1_select"].addEventListener("change", (ev)=>{
                    // Clear/reset group select.
                    this.DOM.commandEditor["group1_select"].length = 1;
                    this.DOM.commandEditor["group1_select"].selectedIndex = 0;
                    
                    // Clear/reset command select.
                    this.DOM.commandEditor["command1_select"].length = 1;
                    this.DOM.commandEditor["command1_select"].selectedIndex = 0;

                    this.populate_groups(ev.target.value);
                }, false);
                
                // When changing group:
                this.DOM.commandEditor["group1_select"].addEventListener("change", (ev)=>{
                    // Clear/reset command select.
                    this.DOM.commandEditor["command1_select"].length = 1;
                    this.DOM.commandEditor["command1_select"].selectedIndex = 0;

                    this.populate_commands(ev.target.value);
                }, false);
                
                // When changing command:
                this.DOM.commandEditor["command1_select"].addEventListener("change", (ev)=>{
                    // Display command.
                    this.populate_command(ev.target.value);
                }, false);

                // setTimeout(()=>{
                //     this.DOM.commandEditor["section1_select"].selectedIndex = 1;
                //     this.DOM.commandEditor["section1_select"].dispatchEvent(new Event("change"));
                // }, 2000);
            },
        },

        // TODO
        sections: {
            parent: null,
            update: async function(){},
            add   : async function(){},
            remove: async function(){},
            display: async function(){},
        },
        // TODO
        groups: {
            parent: null,
            update: async function(){},
            add   : async function(){},
            remove: async function(){},
            display: async function(){},
        },
        commands: {
            parent: null,
            update: async function(){
                // Updates require Websockets. 
                if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
    
                // Request the server to update the command. 
                // Server will send new commands list.
                // Repopulate the selects.
                // Try to find the command that was edited by cId (it may be in another section or group now.)
                // Set the section, group, and command selects to match the command and reload the command. 
            },
            add   : async function(){
                // Updates require Websockets. 
                if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
    
                // Ignore existing loaded command. Make a blank command other than having a matching sId and gId and new cId.
                // Requesting the add should automatically display the new command.
                // After that, use the normal update function.
            },
            remove: async function(){
                // Updates require Websockets. 
                if(!ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
    
                // Confirm.
    
                // Request the server to remove the command.
                // Requesting the removal should automatically display the command at the previous selectedIndex unless it was 0.
                // In that case, select 0.
            },
            display: async function(){},
        },

        init: function(){
            // Set the parent object of all the first-level objects within this object. 
            this.nav.parent      = this;
            this.selects.parent  = this;
            this.sections.parent = this;
            this.groups.parent   = this;
            this.commands.parent = this;

            // Init the nav.
            debug.editor.nav.init();
            
            // Init the selects.
            debug.editor.selects.init();
        },
    },

    // 
    // TYPE_CMD_TO_TERM
    // UPDATE_ONE_SECTION
    // UPDATE_ONE_GROUP
    // UPDATE_ONE_COMMAND
    // GET_DB_AS_JSON
};
let init = async function(){
    // Set the initial state of the Websocket connection.
    ws_control.status.setStatusColor('disconnected');

    // Get the configs.
    config = await http.send("get_configs", {}, 5000 );
    console.log(config);

    // Get the DB.
    commands = await http.send("/GET_DB_AS_JSON", {}, 5000 );
    console.log(commands);

    // WS Auto-reconnect.
    let ws_autoReconnect = document.getElementById("ws_autoReconnect");
    ws_autoReconnect.addEventListener("click", function(){
        ws_control.autoReconnect = this.checked;
        if(!ws_control.autoReconnect){ console.log("*"); clearTimeout(ws_control.autoReconnect_id); }
    }, false);
    ws_autoReconnect.checked = ws_control.autoReconnect;
    ws_autoReconnect.dispatchEvent(new Event("click"));
    
    // WS Connect.
    let ws_connect    = document.getElementById("ws_connect");
    ws_connect.addEventListener("click", ()=>{ ws_control.ws_utilities.initWss() }, false);
    
    // WS Disconnect.
    let ws_disconnect = document.getElementById("ws_disconnect");
    ws_disconnect.addEventListener("click", ()=>{ 
        ws_control.skipAutoReconnect = true;
        // ws_control.autoReconnect=false;
        // ws_autoReconnect.checked = false;
        ws_control.ws_utilities.wsCloseAll(); 
    }, false);

    // WS Disconnect2. (test)
    let ws_disconnect2 = document.getElementById("ws_disconnect2");
    ws_disconnect2.addEventListener("click", ()=>{ 
        // ws_control.skipAutoReconnect = true;
        // ws_control.autoReconnect=false;
        // ws_autoReconnect.checked = false;
        ws_control.ws_utilities.wsCloseAll(); 
    }, false);

    debug.editor.init();

};

window.onload = async function(){
    window.onload = null;
    appView = "debug";
    init();
};