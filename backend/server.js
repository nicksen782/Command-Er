// OS/Filesystem requires. 
const os       = require('os');
const fs       = require('fs');
const path     = require('path');

// Express/WS requires. 
const WSServer = require('ws').Server;
const server   = require('http').createServer();
const express  = require('express');
const app      = express();

// Compression in Express.
const zlib = require('zlib');
const compression = require('compression');
const shouldCompress = (req, res) => {
	if (req.headers['x-no-compression']) {
		return false
	}
	return compression.filter(req, res);
}

// WWS server start
const wss = new WSServer({ server: server });
server.on('request', app);

const _APP  = require('./modules/M_main.js')(app, express, wss);

// Set the error handlers.
let setErrorHandlers = function(){
	// Created after reading this: https://blog.heroku.com/best-practices-nodejs-errors
	let cleanUpHasRan = false;

	let cleanUp = function(byWhat){
		// Only run once. 
		if(cleanUpHasRan){ return; }

		let funcs = [
			function appLoopCleanup(){
				if(_APP && _APP.drawLoop){
					// Remove the child process if it is set.
					try{
						if(_APP.drawLoop){ 
							_APP.drawLoop.pause();
							_APP.drawLoop.stop();
							_APP.drawLoop = null; 
							console.log(`  cleanUp: (via: ${byWhat}): appLoopCleanup... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): appLoopCleanup...FAILED`, e);
					}
				}
			},
			function displayCleanup(){
				if(_APP && _APP.m_websocket_python){
					// Remove the child process if it is set.
					try{
						if(_APP.m_websocket_python.cp_child){ 
							// _APP.m_websocket_python.cp_child.kill('SIGTERM'); 
							_APP.m_websocket_python.cp_child.kill('SIGINT'); 
							_APP.m_websocket_python.cp_child = null; 
							console.log(`  cleanUp: (via: ${byWhat}): displayCleanup... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): displayCleanup...FAILED`, e);
					}
				}
			},
			function pythonCleanup(){
				if(_APP && _APP.m_websocket_python){
					// Remove the child process if it is set.
					try{
						if(_APP.m_websocket_python.cp_child){ 
							// _APP.m_websocket_python.cp_child.kill('SIGTERM'); 
							_APP.m_websocket_python.cp_child.kill('SIGINT'); 
							_APP.m_websocket_python.cp_child = null; 
							console.log(`  cleanUp: (via: ${byWhat}): pythonCleanup... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): pythonCleanup...FAILED`, e);
					}
				}
			},
			function serverCleanup(){
				if(_APP && _APP.m_websocket_node){
					// Remove the child process if it is set.
					try{
						if(_APP.m_websocket_node.ws){ 
							console.log(`  cleanUp: (via: ${byWhat}): serverCleanup: websocket... DONE`);
							_APP.m_websocket_node.ws.close();
							_APP.m_websocket_node.ws = null;
						}
						if(_APP.server){
							_APP.server.close();
							console.log(`  cleanUp: (via: ${byWhat}): serverCleanup: server... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): serverCleanup...FAILED`, e);
					}
				}
			},
		];
		
		// for(let i=0; i<funcs.length; i+=1){ funcs[i](); }

		// Set the cleanUpHasRan flag.
		cleanUpHasRan = true;
	};

	process.on('beforeExit', code => {
		// Can make asynchronous calls
		console.log("\nHANDLER: beforeExit");
		cleanUp("beforeExit");
		// setTimeout(() => {
			console.log(`  Process will exit with code: ${code}`);
			process.exit(code)
		// }, 100)
	})

	process.on('exit', code => {
		// Only synchronous calls
		console.log("\nHANDLER: exit");
		cleanUp("exit");
		console.log(`  Process exited with code: ${code}`);
	})

	process.on('SIGTERM', signal => {
		console.log("\nHANDLER: SIGTERM");
		cleanUp("SIGTERM");
		console.log(`  Process ${process.pid} received a SIGTERM signal`);
		process.exit(0)
	})

	process.on('SIGINT', signal => {
		console.log("\nHANDLER: SIGINT");
		cleanUp("SIGINT");
		console.log(`  Process ${process.pid} has been interrupted`)
		process.exit(0)
	})

	process.on('uncaughtException', err => {
		console.log("\nHANDLER: uncaughtException");
		cleanUp("uncaughtException");
		console.log(`  Uncaught Exception:`, err);
		process.exit(1)
	})
	
	process.on('unhandledRejection', (reason, promise) => {
		console.log("\nHANDLER: unhandledRejection");
		cleanUp("unhandledRejection");
		console.log('  Unhandled rejection at ', promise, `reason: `, reason);
		process.exit(1)
	})	
};

// Set the error handlers.
setErrorHandlers();

// Main module import(s).

(async function startServer(){

	const compressionObj = {
		filter    : shouldCompress,
		memLevel  : zlib.constants.Z_DEFAULT_MEMLEVEL,
		level     : zlib.constants.Z_DEFAULT_COMPRESSION,
		chunkSize : zlib.constants.Z_DEFAULT_CHUNK,
		strategy  : zlib.constants.Z_DEFAULT_STRATEGY,
		threshold : 0,
		windowBits: zlib.constants.Z_DEFAULT_WINDOWBITS,
	};
	app.use( compression(compressionObj) );

	await _APP.module_inits();

	let conf = {
		host       : _APP.m_config.config_srv.host, 
		port       : _APP.m_config.config_srv.port, 
	};

	server.listen(conf, async function () {
		process.title = "RemoteTerminal";

		app.use('/'    , express.static(path.join(process.cwd(), './public')));
		app.use('/libs', express.static(path.join(process.cwd(), './node_modules')));

		app.use(compression({ filter: shouldCompress }));

		console.log();
		console.log("*".repeat(45));

		console.log(`NAME    : ${process.title}`);
		console.log(`STARTDIR: ${process.cwd()}`);
		console.log(`SERVER  : ${conf.host}:${conf.port}`);
		console.log(`SHELL   : ${_APP.m_terms.shell}`);

		console.log(`ROUTES:`);
		let routes = _APP.getRoutePaths("manual", app).manual;
		let maxes = {
			"filename" : 0,
			"method"   : 0,
			"path"     : 0,
		};
		for(filename in routes){ if(maxes.filename < filename.length){ maxes.filename = filename.length; } }
		for(filename in routes){ 
			for(rec of routes[filename]){
				if(rec.method.length > maxes.method ){ maxes.method = rec.method.length; } 
				if(rec.path.length   > maxes.path   ){ maxes.path   = rec.path.length; } 
			}
		}

		for(filename in routes){
			for(rec of routes[filename]){
				console.log(
					`  ` +
					`FILE: ${  (filename  ).padEnd(maxes.filename, " ")}` + " || " + 
					`METHOD: ${(rec.method).padEnd(maxes.method  , " ")}` + " || " + 
					`PATH: ${  (rec.path  ).padEnd(maxes.path    , " ")}` + " || " + 
					`DESC: ${  (rec.desc  )}`+
					``);
				}
		};

		// console.log(`CONFIG:`);
		// console.log(_APP.m_config.config_srv);
		// console.log(maxes);
		console.log("*".repeat(45));
		console.log();

		// console.log("converting...");
		// await _APP.m_cmdMgr.convertJSONtoDB();
		// console.log("save to file...");
		// await _APP.m_cmdMgr.convertDBtoJSONFile();
		// console.log("...DONE");
	});

})();
