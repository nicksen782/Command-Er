// const fs = require('fs');
// const path            = require('path'); 
// const sqlite3 = require('sqlite3').verbose();
const sqlite3 = require('sqlite3');
const { performance } = require('perf_hooks');

// https://inloop.github.io/sqlite-viewer/

let _APP = null;

let _MOD = {
	module_init: function(parent){
		return new Promise(async function(resolve,reject){
			_APP = parent;
			
			resolve();
		});
	},
	
	// Holds the connection to the database.
	db: null,

	// DB flags
	dbFlagLookup : {
		"READONLY":  0x00000001,
		"READWRITE": 0x00000002, // DEFAULT
		"CREATE":    0x00000004, // DEFAULT
	},

	// Opens a database.
	open : function(filename = ":memory:", mode = (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE), callback = null){
		return new Promise(function(resolve,reject){
			let flags = [];
			let modeValue = mode;
			let keys = Object.keys(_MOD.dbFlagLookup).reverse();
			for(let key of keys){
				if(modeValue - _MOD.dbFlagLookup[key] >= 0){ modeValue -= _MOD.dbFlagLookup[key]; flags.push(key); }
			}

			console.log(`OPENING DATABASE: "${filename}", FLAGS: (${flags.join(", ")})`);
			
			_MOD.db = new sqlite3.Database(filename, mode, (err) => {
				if (err) {
					console.error(err.message);
					reject(err);
					throw err.message;
				}
				else{
					// console.log("Db is open.");
					resolve(true);
				}
			});
		});
	},

	// Queries the database.
	query : function(sql, params, type){
		// EXAMPLE USAGE:
		/*
			// Example select query object:
			let q = {
				"sql" : `SELECT * FFOM users WHERE userId = :userId;`, ;`, 
				"params" : { ":userId": 100 },
				"type": "SELECT",
			};
			let results1 = await _APP.db.query(q.sql, q.params, q.type);
			
			// For UPDATE, INSERT, etc, change the type. (optional)
			let q = {
				"sql" : `DELETE FROM users WHERE userId = :userId;`, 
				"params" : { ":userId": 100 },
				"type": "DELETE",
			};
			let results1 = await _APP.db.query(q.sql, q.params, q.type);
		*/
		
		return new Promise(function(resolve,reject){
			// Check that the DB is not null.
			if(! _MOD.db){
				reject("ERROR: (db query) Database is not open.");
				return; 
			}

			// Determine the db function to use. 
			let func;
			if(type=="SELECT"){ func = "all"; }
			else              { func = "run"; }
	
			// Run the db function and return any results. 
			_MOD.db[func](sql, params, function(err, rows){
				if(err){ 
					console.log(
						`ERROR: db.query:` + 
						`\nfunc     : ${func}`,
						`\ndb       : ${JSON.stringify(_MOD.db)}` +
						`\nrows     : ${rows || []}`,
						`\nlastID   : ${this.lastID}`,
						`\nsql      : \n${sql}`,
						`\nparams   : \n${JSON.stringify(params)}`,
						`\nparamsLen: \n${Object.keys(params).length}`,
						`\nerr      : ${err}`,
						``
					);

					reject({
						func   : func,
						err    : err,
						rows   : rows || [],
						db     : _MOD.db,
						lastID : this.lastID,
					});
					throw "ERROR IN " + func;
				}
				else{
					// console.log(func, " qb.query: data:", rows);
					resolve({
						func   : func,
						err    : err,
						rows   : rows || [],
						db     : _MOD.db,
						lastID : this.lastID,
					});
				}
			});
		});
	},

	// Closes the database.
	close : function(){
		return new Promise(function(resolve,reject){
			// Attempts to close a null db will fail. Catch it here.
			if(! _MOD.db){
				resolve(true);
				return; 
			}

			_MOD.db.close((err) => {
				if (err) {
					reject( console.error(err.message) );
				}
				else{
					_MOD.db = null;
					resolve(true);
				}
			});
		});
	},

	// VACUUM
	VACUUM : function(){
		// _APP.db.VACUUM();
		return new Promise(async function(resolve,reject){
			// Check that the DB is not null.
			if(! _MOD.db){
				reject("ERROR: (db vacuum) Database is not open.");
				return; 
			}

			q = {
				"sql" : `VACUUM;`, 
				"params" : {},
				"type": "VACUUM",
			};
			let results1 = await _APP.db.query(q.sql, q.params, q.type);
			if(results1.err){ reject(results1.err); return; }
			resolve();
		});
	},

};

module.exports = _MOD;