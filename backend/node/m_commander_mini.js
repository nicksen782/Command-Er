let _APP = null;
let _MOD = {
    moduleLoaded: false,

        // Init this module.
        module_init: async function(parent){
            return new Promise(async function(resolve,reject){
                if(!_MOD.moduleLoaded){
                    // Save reference to the parent module.
                    _APP = parent;
            
                    // Add routes.
                    if(_APP.m_config.config.toggles.isActive_commanderMini){
                        _APP.consolelog("addRoutes", 2);
                        _MOD.addRoutes(_APP.app, _APP.express);
                    }
                    else{
                        _APP.consolelog("DISABLED IN CONFIG", 2);
                    }
    
                    // Set the moduleLoaded flag.
                    _MOD.moduleLoaded = true;
                }
    
                resolve();
            });
        },

        // Adds routes for this module.
        addRoutes: function(app, express){
            // ********************************************
            // HTTP routes. (Intended for Command-Er MINI).
            // ********************************************

            // Used by Command-Er Mini to confirm if the provided uuid is still active.
            _APP.addToRouteList({ path: "/MINI/STILLCONNECTED", method: "post", args: [], file: __filename, desc: "Check from MINI to make sure there is still a connection." });
            app.post('/MINI/STILLCONNECTED'    ,express.json(), async (req, res) => {
                // Passed a uuid. Need to find that uuid.
                let target;
                let msg = ``;
                let infoLine1;
                let rec;

                // Look through each Websocket connect to find the target.
                _APP.m_websocket_node.ws.clients.forEach(function each(ws) { 
                    // If the target was already found then quit looking. 
                    if(target){ return; }

                    // Try to find the matching target.
                    if (
                        ws.readyState === 1                // Is open.
                        && ws.CONFIG.isTerm                // Is a term.
                        && ws.CONFIG.uuid == req.body.uuid // Matching UUID.
                        && ws.CONFIG.type == "MINI"        // Terminal type of "MINI".
                    ) {
                        // Save the target. Stop looking. 
                        target = ws; return;
                    }
                });

                // Was the matching target found? 
                if(!target){
                    msg = `*FAILURE* TARGET NOT FOUND: STILLCONNECTED: uuid: ${req.body.uuid}`;
                    console.log(msg); 
                    // res.json(msg);
                    res.json({ active: false });
                    return;
                }

                // Target found. Return true.
                else{
                    res.json({ active: true });
                }
            });

            // /MINI/GET_UNIQUE_UUIDS : Clients connected to this Command-Er server.
            _APP.addToRouteList({ path: "/MINI/GET_UNIQUE_UUIDS", method: "post", args: [], file: __filename, desc: "Get clients connected to this Command-Er server." });
            app.post('/MINI/GET_UNIQUE_UUIDS'    ,express.json(), async (req, res) => {
                let uuids = [];
                _APP.m_websocket_node.ws.clients.forEach(function each(ws) { 
                    if (ws.readyState === 1 && ws.CONFIG.isTerm && ws.CONFIG.type == "MINI") {
                        if(uuids.indexOf(ws.CONFIG.uuid) == -1){ uuids.push(ws.CONFIG.uuid); }
                    }
                });
                res.json(uuids);
            });
            
            // /MINI/GET_MINI_TERMS   : Get MINI terms connected to this Command-Er server.
            _APP.addToRouteList({ path: "/MINI/GET_MINI_TERMS", method: "post", args: [], file: __filename, desc: "Get MINI terms connected to this Command-Er server." });
            app.post('/MINI/GET_MINI_TERMS'    ,express.json(), async (req, res) => {
                let availableClients = [];

                _APP.m_websocket_node.ws.clients.forEach(function each(ws) { 
                    if (
                        ws.readyState === 1 
                        && ws.CONFIG.isTerm 
                        && ws.CONFIG.type == "MINI"
                    ) {
                        availableClients.push(ws.CONFIG.uuid);
                    }
                });

                res.json(availableClients);
            });
            
            // /MINI/RUNCMD           : Allows Command-Er MINI to request a command to be sent to a specific MINI term.
            _APP.addToRouteList({ path: "/MINI/RUNCMD", method: "post", args: [], file: __filename, desc: "Allows Command-Er MINI to request a command to be sent to a specific MINI term." });
            app.post('/MINI/RUNCMD'    ,express.json(), async (req, res) => {
                let target;
                let msg = ``;
                let infoLine1;
                let rec;

                // Look through each Websocket connect to find the target.
                _APP.m_websocket_node.ws.clients.forEach(function each(ws) { 
                    // If the target was already found then quit looking. 
                    if(target){ return; }

                    // Try to find the matching target.
                    if (
                        ws.readyState === 1                // Is open.
                        && ws.CONFIG.isTerm                // Is a term.
                        && ws.CONFIG.uuid == req.body.uuid // Matching UUID.
                        && ws.CONFIG.type == "MINI"        // Terminal type of "MINI".
                    ) {
                        // Save the target. Stop looking. 
                        target = ws; return;
                    }
                });

                // Was the matching target found? 
                if(!target){
                    msg = `*FAILURE* TARGET NOT FOUND: RUNCMD: ${req.body.type}, uuid: ${req.body.uuid}, cId: ${req.body.cId}, cmd: ${req.body.cmd}`;
                    console.log(msg); 
                    res.json(msg);
                    return;
                }

                // Target found. Run the command.
                else{
                    // Create the shared infoline1.
                    infoLine1 = `RUNCMD: type: ${req.body.type.padEnd(10, " ")}, uuid: ${req.body.uuid}`;

                    // Use ids to get the command record from the database?
                    if(req.body.type == "FROMCONFIG"){
                        // Use the sId, gId, and cId to get the actual command from the database.
                        rec = await _APP.m_websocket_node.queries.GET_ONE_CMD(req.body.sId, req.body.gId, req.body.cId);
                        if(rec){
                            // Send the command. 
                            target.CONFIG.tty.write(` ${rec.f_ctrlc ? "\u0003 " : ""}${rec.cmd}${rec.f_enter ? "\r" : ""}`);
        
                            // Return a response.
                            msg = `*SUCCESS* ${infoLine1}, title: ${rec.title}, (sId: ${req.body.sId}, gId: ${req.body.gId}, cId: ${req.body.cId})`;
                            console.log(msg); 
                            res.json(msg);
                        }
                        else{
                            // Return a response.
                            msg = `*FAILURE* ${JSON.stringify(results)}, ${infoLine1}, sId: ${req.body.sId}, gId: ${req.body.gId}, cId: ${req.body.cId}`;
                            console.log(msg); 
                            res.json(msg);
                        }
                    }

                    // Raw command. ("\r" (enter) must also be included if needed.)
                    else if(req.body.type == "RAW"){
                        // Send the command. 
                        target.CONFIG.tty.write(` ${req.body.cmd}`);

                        // Return a response.
                        msg = `*SUCCESS* ${infoLine1}, cmd: ${req.body.cmd}`;
                        console.log(msg); 
                        res.json(msg);
                    }
                    
                    // FAIL. Not a known type. 
                    else { 
                        msg = `INVALID TYPE: ${infoLine1}`;
                        console.log(msg); 
                        res.json(msg);
                    }
                }

            });
        },
};
module.exports = _MOD;