_APP.debug = {
    wsClient_restart: function(sId, gId, cId){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send( "PROCESS_EXIT" );
    },

    debugInits: function(){
        // WS Auto-reconnect.
        let ws_autoReconnect = document.getElementById("ws_autoReconnect");
        ws_autoReconnect.addEventListener("click", function(){
            _APP.ws_control.autoReconnect = this.checked;
            if(!_APP.ws_control.autoReconnect){ console.log("*"); clearTimeout(_APP.ws_control.autoReconnect_id); }
        }, false);
        ws_autoReconnect.checked = _APP.ws_control.autoReconnect;
        ws_autoReconnect.dispatchEvent(new Event("click"));
        
        // WS Connect.
        let ws_connect    = document.getElementById("ws_connect");
        ws_connect.addEventListener("click", ()=>{ _APP.ws_control.ws_utilities.initWss(); }, false);
        
        // WS Disconnect.
        let ws_disconnect = document.getElementById("ws_disconnect");
        ws_disconnect.addEventListener("click", ()=>{ 
            if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); }
            _APP.ws_control.skipAutoReconnect = true;
            _APP.ws_control.ws_utilities.wsCloseAll(); 
        }, false);

        // WS Disconnect2. (test)
        let ws_disconnect2 = document.getElementById("ws_disconnect2");
        ws_disconnect2.addEventListener("click", ()=>{ 
            if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); }
            _APP.ws_control.ws_utilities.wsCloseAll(); 
        }, false);
    },

    configUpdater: {
        parent:null,
        DOM: {},

        reloadConfig: function(){
            this.DOM.updateRemoteConfig_textarea.value = JSON.stringify(this.parent.config.config,null,1);
        },
        updateConfig: function(){
            // Make sure that the JSON is parsable.
            try{ JSON.parse(this.DOM.updateRemoteConfig_textarea.value); }
            catch(e){ console.log("The text is not valid JSON text."); return;  }

            // Send the data.
            _APP.ws_control.activeWs.send( JSON.stringify( { mode:"UPDATE_CONFIG", data: this.DOM.updateRemoteConfig_textarea.value } ) );
        },
        init: function(parent, configObj){
            this.parent = parent;

            // Load from config.
            for(let key in configObj.DOM){ this.DOM[key] = configObj.DOM[key]; }

            // DOM.
            for(let key in this.DOM){
                if(typeof this.DOM[key] == "string"){
                    this.DOM[key] = document.getElementById( this.DOM[key] );
                }
            }

            // Event listeners.
            this.DOM.updateRemoteConfig_reset.addEventListener("click", ()=>{ this.reloadConfig(); }, false);
            this.DOM.updateRemoteConfig_save.addEventListener("click", ()=>{ this.updateConfig(); }, false);

            // console.log(this.DOM);
            this.reloadConfig();
        },
    },

    // TESTS1
    mainNav: {
        parent: null,
        nav: {
            parent: null,
            defaultTabKey: null,
            tabs: {},
            views: {},
            hideAllViews: function(){
                // Deactivate all tabs and views. 
                for(let key in this.tabs) { this.tabs[key].classList.remove("active"); }
                for(let key in this.views){ this.views[key].classList.remove("active"); }
            },
            showOneView: function(tabKey){
                // Deactivate all tabs and views. 
                this.hideAllViews();
    
                // Get the tab and the view.
                let tabElem  = this.tabs [ tabKey ];
                let viewElem = this.views[ tabKey ];
    
                // Set the active class for this tab and view. 
                tabElem .classList.add("active");
                viewElem.classList.add("active");
            },
            init : function(configObj){
                // Load from config.
                this.defaultTabKey = configObj.defaultTabKey;
                for(let key in configObj.tabs){ this.tabs[key] = configObj.tabs[key]; }

                // Save the tabs and views. 
                for(let key in this.tabs){
                    if(typeof this.tabs[key] == "string"){ 
                        this.tabs[key]  = document.getElementById( this.tabs[key] ); 
                        this.views[key] = document.getElementById( this.tabs[key].getAttribute("view") ); 
                    }
                }

                // Deactivate all tabs and views. 
                this.hideAllViews();
    
                // Add event listeners to the tabs.
                for(let key in this.tabs){
                    this.tabs[key].addEventListener("click", () => this.showOneView(key), false); 
                }
        
                // Show the default view.
                this.showOneView(this.defaultTabKey);
            },
        },

        init: function(parent, configObj){
            return new Promise(async (resolve,reject)=>{
                // Set the parent object of all the first-level objects within this object. 
                this.parent          = parent;
                this.nav.parent      = this;

                // Init the nav.
                this.nav.init(configObj);

                resolve();
            });
        },
    },
};

let init = async function(){
    return new Promise(async (resolve,reject)=>{
        // This is used for all the separate inits. Mostly DOM ids.
        let configObjs = {
            mainNav: {
                defaultTabKey: "terminals",
                tabs: {
                    tests1       : "top_nav_nav_tests1",
                    configUpdater: "top_nav_nav_configUpdater",
                    editor       : "top_nav_nav_editor",
                    terminals    : "top_nav_nav_terms",
                },
            },
            terminals:{
                DOM: {
                    terms_list          : "terms_list",
                    terms_list_select   : "terms_list_select",
                    terms_windows       : "terms_windows",
                    terms_info          : "terms_info",
                    addTerm             : "addTerm",
                    addMini             : "addMini",
                    terminalClose       : "terminalClose",
                },
                rolodex:{
                    DOM: {
                        terminalRolodex_btn            : "terminalRolodex_btn",
                        terminalRolodex                : "terminalRolodex",
                        terminalRolodex_section_select : "terminalRolodex_section_select",
                        terminalRolodex_group_select   : "terminalRolodex_group_select",
                        terminalRolodex_command_select : "terminalRolodex_command_select",
                        terminalRolodex_command        : "terminalRolodex_command",
                        terminalRolodex_command_edit   : "terminalRolodex_command_edit",
                        terminalRolodex_command_send   : "terminalRolodex_command_send",
                    },
                },
            },
            configUpdater:{
                DOM: {
                    updateRemoteConfig_table    : "updateRemoteConfig_table",
                    updateRemoteConfig_textarea : "updateRemoteConfig_textarea",
                    updateRemoteConfig_reset    : "updateRemoteConfig_reset",
                    updateRemoteConfig_save     : "updateRemoteConfig_save",
                },
            },
            editor: {
                nav:{
                    defaultTabKey: "section",
                    tabs: {
                        section : "commandEditor_tab_section",
                        group   : "commandEditor_tab_group",
                        command : "commandEditor_tab_command",
                    },
                },
                sections:{
                    editor_table:{
                        table : "sectionEditor_table",
                        id    : "sectionEditor_table_id",
                        name  : "sectionEditor_table_name",
                        order : "sectionEditor_table_order",
                    },
                    actions: {
                        add    : "sectionEditor_table_add",
                        reset  : "sectionEditor_table_reset",
                        remove : "sectionEditor_table_remove",
                        update : "sectionEditor_table_update",
                    },
                },
                groups:{
                    editor_table:{
                        table   : "groupEditor_table",
                        id      : "groupEditor_table_id",
                        section : "groupEditor_table_section",
                        name    : "groupEditor_table_name",
                        order   : "groupEditor_table_order",
                    },
                    actions: {
                        add    : "groupEditor_table_add",
                        reset  : "groupEditor_table_reset",
                        remove : "groupEditor_table_remove",
                        update : "groupEditor_table_update",
                    },
                },
                commands:{
                    editor_table:{
                        table       : "commandEditor_table",
                        ids         : "commandEditor_table_ids",
                        sectionGroup: "commandEditor_table_sectionGroup",
                        title       : "commandEditor_table_title",
                        cmd         : "commandEditor_table_cmd",
                        f_ctrlc     : "commandEditor_table_f_ctrlc",
                        f_enter     : "commandEditor_table_f_enter",
                        f_hidden    : "commandEditor_table_f_hidden",
                        order       : "commandEditor_table_order",
                    },
                    actions: {
                        add    : "commandEditor_table_add",
                        reset  : "commandEditor_table_reset",
                        remove : "commandEditor_table_remove",
                        update : "commandEditor_table_update",
                    },
                },
                selects:{
                    DOM:{
                        "section_select" : "commandEditor_section_select",
                        "group_select"   : "commandEditor_group_select",
                        "command_select" : "commandEditor_command_select",
                    },
                },
            },
        };

        // Init: http and websockets.
        await _APP.ws_control.init(_APP);
        await _APP.http.init(_APP);

        // Get the config and DB.
        _APP.config   = await _APP.http.send("get_configs", {}, 5000 );
        _APP.commands = await _APP.http.send("/GET_DB_AS_JSON", {}, 5000 );

        // Init mainNav.
        _APP.mainNav = _APP.debug.mainNav;
        await _APP.mainNav.init(_APP, configObjs.mainNav); 
        
        // Init the DB editor.
        await _APP.editor.init(_APP, configObjs.editor);
        
        // Start the web socket connection. 
        _APP.ws_control.ws_utilities.initWss();

        // Start the timed tasks.
        _APP.timedTasks.init(_APP);

        // Init the config updater.
        _APP.configUpdater = _APP.debug.configUpdater;
        _APP.configUpdater.init(_APP, configObjs.configUpdater); 

        // Init the terminals.
        await _APP.terminals.init(_APP, configObjs.terminals);
        
        // Set the initial status.
        _APP.ws_control.status.setStatusColor('disconnected');

        // Init the debug.
        _APP.debug.debugInits();

        // Show initial connectivity status.
        _APP.ws_control.connectivity_status_update.display();

        // Remove the darken class.
        document.body.classList.remove("darken");

        // Force a short wait.
        await new Promise(async (res,rej)=>{ setTimeout(function(){ res(); }, 1000); });
        
        resolve();
    });
};

window.onload = async function(){
    window.onload = null;

    // Set the appView.
    _APP.appView = "debug";

    // Run init.
    await init();

};