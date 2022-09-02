// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';

_APP.terminals = {
    parent: null, 

    terms: [],
    
    init: function(parent){
        return new Promise(async (resolve,reject)=>{
            this.parent = parent;
            // terminal.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')

            let type = "TERM";
            // let type = "MINI";
            let prefix1 = "term_";
            // let prefix2 = "TERM #";
            let termId = 1;
            let uuid = this.parent.ws_control.connectivity_status_update.data.uuid;

            // Create the WebSocket connection.
            let locUrl = `` +
            `${window.location.protocol == "https:" ? "wss" : "ws"}://` +
            `${location.hostname}` + 
            `${location.port ? ':'+location.port : ''}` +
            `${location.pathname != "/" ? ''+location.pathname : '/'}` +
            `TERM?uuid=${uuid}` +
            `&termId=${prefix1 + termId}` +
            `&type=${type}`
            ;

            var ws1 = new WebSocket(locUrl);
            ws1.onopen = async function (event) {
                console.log("OPEN", event);
                console.log("config:",_APP.config.config.terms);
                
                const terminal    = new Terminal();
                const fitAddon    = new FitAddon.FitAddon();
                const attachAddon = new AttachAddon.AttachAddon(ws1);
                terminal.loadAddon(fitAddon);
                terminal.loadAddon(attachAddon);
                terminal.open( document.getElementById("term_container") );

                setInterval(()=>{
                    console.log("fit");
                    fitAddon.fit();
                }, 1000);
    
                resolve();
            };

        });
    },
};
