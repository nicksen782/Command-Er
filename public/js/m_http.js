// HTTP REQUESTS USING POST.
_APP.http = {
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
                resolve(false); return;
            }
        });
    },

    // Ping the server.
    pingServer: async function(){
        return new Promise(async function(resolve,reject){
            // Set the blue icon.
            _APP.ws_control.status.setStatusColor("pinging");

            let serverUrl = `` +
                `${window.location.protocol == "https:" ? "https" : "http"}://` +
                `${location.hostname}` + 
                `${location.port ? ':'+location.port : ''}`
            ;
            let options = { type:"text", method:"GET" };
            let resp = await _APP.http.send(serverUrl, options, 5000);
            resp = resp === false ? false : true;

            // Force a short wait.
            await new Promise(async (res,rej)=>{ setTimeout(function(){ res(); }, _APP.ws_control.forcedDelay_ms); });

            // Reset to the previous connection icon.
            _APP.ws_control.status.restorePrevStatusColor();

            // End.
            resolve(resp);
        });
    },
};