let debug = {
    wsClient_count: function(){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send("CLIENT_COUNT");
    },
    wsClient_sectionsList: function(){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send("SECTIONS_LIST");
    },
    wsClient_groupsList: function(){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send("GROUPS_LIST");
    },
    wsClient_commandsList: function(){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send("COMMANDS_LIST");
    },
    wsClient_getDbAsJSON: function(){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send("GET_DB_AS_JSON");
    },
    wsClient_getOneCommand: function(sId, gId, cId){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send( JSON.stringify( { mode:"GET_ONE_CMD", data: { sId:sId, gId:gId, cId:cId } } ) );
    },
    wsClient_restart: function(sId, gId, cId){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.activeWs.send( "PROCESS_EXIT" );
    },
    wsClient_connectivity_status_update: function(){
        if(!_APP.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
        _APP.ws_control.connectivity_status_update.requestUpdate();
    },
    
    remove_disabled_fromAll: function(){
        let disabledElems = document.querySelectorAll(".disabled");
        // console.log(disabledElems);
        for(let i=0; i<disabledElems.length; i+=1){
            disabledElems[i].classList.remove("disabled");
        }
    },

    // TESTS1
    tests1: {
        parent: null,

        nav: {
            parent:null,
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
                this.tabs =   document.querySelectorAll(`.nav_tab[group='top_nav']`);
                this.views =  document.querySelectorAll(`.view[group='top_nav']`);
    
                // Deactivate all tabs and views. 
                this.hideAllViews();
    
                // Add event listeners to the tabs.
                this.tabs.forEach( (tab) => tab.addEventListener("click", () => this.showOneView(tab), false) ); 
        
                // Show the Tests1 tab and view. 
                // this.showOneView( this.tabs[0] );

                // Show the Command Editor tab and view. 
                // this.showOneView( this.tabs[1] );

                // Show the Terminals tab and view. 
                this.showOneView( this.tabs[2] );
            },
        },
        init: function(parent){
            return new Promise(async (resolve,reject)=>{
                // Set the parent object of all the first-level objects within this object. 
                this.parent          = parent;
                this.nav.parent      = this;

                // Init the nav.
                this.nav.init();

                resolve();
            });
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
    return new Promise(async (resolve,reject)=>{
        // Init: http and websockets.
        await _APP.ws_control.init(_APP);
        await _APP.http.init(_APP);

        // Get the config and DB.
        _APP.config   = await _APP.http.send("get_configs", {}, 5000 );
        _APP.commands = await _APP.http.send("/GET_DB_AS_JSON", {}, 5000 );

        // Init the other modules.
        await debug.tests1.init(_APP);
        await _APP.editor.init(_APP);
        await _APP.terminals.init(_APP);
        
        // Set the initial status.
        _APP.ws_control.status.setStatusColor('disconnected');

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

        // Show initial connectivity status.
        _APP.ws_control.connectivity_status_update.display();

        // Remove the darken class.
        document.body.classList.remove("darken");

        // Force a short wait.
        await new Promise(async (res,rej)=>{ setTimeout(function(){ res(); }, 1000); });
        
        // Start the web socket connection. 
        _APP.ws_control.ws_utilities.initWss();

        // console.log("debug init is done.");

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