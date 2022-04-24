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

// Main module import(s).

(async function startServer(){
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
		for(key in routes){
			console.log(`  FILE: ${key}`);
			for(rec of routes[key]){
				console.log(
					"    ", 
					`METHOD: ${(rec.method + " ").padEnd(7, " ")}`+
					`PATH: ${  (rec.path   + " ").padEnd(30, " ")}`+
					`DESC: ${  (rec.desc   + " ")}`+
					``);
				}
		};

		console.log(`CONFIG:`);
		console.log(_APP.m_config.config_srv);

		console.log("*".repeat(45));
		console.log();
	});

})();
