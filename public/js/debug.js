let appView = "debug";
let DOM = {};
let config = {};
debug = {
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
};
let init = async function(){
    // Set the initial state of the Websocket connection.
    ws_control.status.setStatusColor('disconnected');

    // Get the config.
    config = await http.send("get_configs", {}, 5000 );
    console.log(config);
    
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

};

window.onload = async function(){
    window.onload = null;
    init();
};