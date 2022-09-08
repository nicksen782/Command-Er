const fs       = require('fs');
const path     = require('path'); 
const { performance } = require('perf_hooks');

let _APP = null;

let _MOD = {
    moduleLoaded: false,

    // Init this module.
    module_init: async function(parent){
        return new Promise(async function(resolve,reject){
            if(!_MOD.moduleLoaded){
                // Save reference to _APP.
                _APP = parent;
                
                // Add routes.
                _APP.consolelog("addRoutes", 2);
                _MOD.addRoutes(_APP.app, _APP.express);

                // Set the moduleLoaded flag.
                _MOD.moduleLoaded = true;
            }
            resolve();
        });
    },

    // Adds routes for this module.
    addRoutes: function(app, express){
    },

    initDb_queries:{
        "structure": [
            // Table: sections
            {
                "sql" : `
                    CREATE TABLE IF NOT EXISTS 'sections' (
                        'sId'    INTEGER PRIMARY KEY AUTOINCREMENT
                        ,'name'  VARCHAR
                        ,'order' INTEGER
                    );`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "CREATE TABLE",
            },
            // Table: groups
            {
                "sql" : `
                    CREATE TABLE IF NOT EXISTS 'groups' (
                        'gId'    INTEGER PRIMARY KEY AUTOINCREMENT
                        ,'sId'   INTEGER 
                        ,'name'  VARCHAR
                        ,'order' INTEGER
                    );`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "CREATE TABLE",
            },
            // Table: commands
            {
                "sql" : `
                    CREATE TABLE IF NOT EXISTS 'commands' (
                        'cId'       INTEGER PRIMARY KEY AUTOINCREMENT
                        ,'sId'      INTEGER 
                        ,'gId'      INTEGER 
                        ,'title'    VARCHAR
                        ,'cmd'      VARCHAR
                        ,'f_ctrlc'  BOOLEAN
                        ,'f_enter'  BOOLEAN
                        ,'f_hidden' BOOLEAN
                        ,'order'    INTEGER
                    );`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "CREATE TABLE",
            },
        ],
        "seed": [
            // Create 1st section.
            {
                "sql" : `
                INSERT INTO 'sections' ('sId', 'name', 'order')
                VALUES                 (1, "SYSTEM", 1)
                    ;`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "INSERT",
            },
            // Create 1st group.
            {
                "sql" : `
                    INSERT INTO 'groups' ('gId', 'sId', 'name', 'order')
                    VALUES               (1, 1, "UTILITY", 1)
                    ;`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "INSERT",
            },
            // Create 2nd group.
            {
                "sql" : `
                    INSERT INTO 'groups' ('gId', 'sId', 'name', 'order')
                    VALUES               (2, 1, "UTILITY2", 2)
                    ;`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "INSERT",
            },
            // Create 1st command within the 1st group.
            {
                "sql" : `
                    INSERT INTO 'commands' ('cId', 'sId', 'gId', 'title', 'cmd', 'f_ctrlc', 'f_enter', 'f_hidden', 'order')
                    VALUES                 (1, 1, 1, "whoami", "whoami", false, true, false, 1)
                    ;`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "INSERT",
            },
            // Create 2nd command within the 2nd group.
            {
                "sql" : `
                INSERT INTO 'commands' ('cId', 'sId', 'gId', 'title', 'cmd', 'f_ctrlc', 'f_enter', 'f_hidden', 'order')
                    VALUES                 (2, 1, 2, "dir", "dir", false, true, false, 2)
                    ;`.replace(/\t/g, " ").replace(/  +/g, "  "),
                "params" : {},
                "type": "INSERT",
            },
        ]
    },

    //
    db_init: async function(){
        let structure = async function(){
            _APP.consolelog(`CREATING DATABASE TABLE STRUCTURE`,4);
            return new Promise(async function(resolve,reject){
                let q;
                
                // TABLES AND STRUCTURE.
                for(let i = 0; i < _MOD.initDb_queries.structure.length; i += 1){
                    q = _MOD.initDb_queries.structure[i];   
                    await _APP.m_db.query(q.sql, q.params, q.type);
                }

                resolve();
            });
        };
        let seed = async function(){
            _APP.consolelog(`CREATING INITIAL TEST RECORDS`,4);
            return new Promise(async function(resolve,reject){
                let q;
                
                // INITIAL COMMANDS.
                for(let i = 0; i < _MOD.initDb_queries.seed.length; i += 1){
                    q = _MOD.initDb_queries.seed[i];   
                    await _APP.m_db.query(q.sql, q.params, q.type);
                }

                resolve();
            });
        };
        let imports = async function(){
            // Loop through the file. 
            
            return new Promise(async function(resolve,reject){
                // Does the file exist?
                if(!fs.existsSync("importFile.json")){ resolve(); return; }

                // Yes.
                _APP.consolelog(`IMPORTING RECORDS`,4);
                
                // Read in the file. 
                let json= JSON.parse( fs.readFileSync("importFile.json", 'utf8') );
                
                let proms = [];
                for(let i=0; i<json.length; i+=1){
                    let q = {
                        "sql" : `
                            INSERT INTO 'commands' ('cId', 'sId', 'gId', 'title', 'cmd', 'f_ctrlc', 'f_enter', 'f_hidden', 'order')
                            VALUES(                 :cId , :sId , :gId , :title , :cmd , :f_ctrlc , :f_enter , :f_hidden , :order)
                            ;`.replace(/\t/g, " ").replace(/  +/g, "  "),
                        "params" : {
                            ":cId"      : json[i].cid     ,  
                            ":sId"      : 1, // json[i].sid     ,  
                            ":gId"      : 1, // json[i].gid     ,  
                            ":title"    : json[i].title   ,  
                            ":cmd"      : json[i].cmd     ,  
                            ":f_ctrlc"  : json[i].f_ctrlc ,  
                            ":f_enter"  : json[i].f_enter ,  
                            ":f_hidden" : json[i].f_hidden,  
                            ":order"    : json[i].order   ,  
                        },
                        "type": "INSERT",
                    }

                    proms.push( new Promise(async function(res,rej){ await _APP.m_db.query(q.sql, q.params, q.type); res(); } ) );
                }

                await Promise.all(proms);
                resolve();
            });
        };
        
        await structure();
        await seed();
        // await imports();
    },
    
};

let routed = {};

_MOD.routed = routed;

module.exports = _MOD;