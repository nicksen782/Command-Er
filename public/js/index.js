// TODO: Commands are force to the first terminal. This should not be hard-coded.
// .xterminal should also have a .title.

let terms = [];
let info_ws = null;
let info_ws_isActive = false;

let getConfigs = {};
let config_terms = {};
let pressControlC = function(){
	terms[0].ws.send("\x03");
};
let infoIntervalId = null;

window.onload = async function(){
	window.onload = null;
	
	// Get the commands div. 
	let commandsElem = document.getElementById("commands");

	// Get the configs.
	let getConfigs = await fetch("getConfigs");
	getConfigs = await getConfigs.json();
	config_cmds = getConfigs.config_cmds;
	config_terms = getConfigs.config_terms;

	// Add each command as a button to the commands div. 
	let frag = document.createDocumentFragment();
	let cmdKeys = Object.keys(config_cmds);
	cmdKeys.forEach(function(key){
		let cmds = config_cmds[key];
		let cmd_key_div = document.createElement("div");
		let cmd_key_div_title = document.createElement("div");
		cmd_key_div.classList.add("cmd_key_div");
		cmd_key_div_title.classList.add("title");
		cmd_key_div_title.innerText = key;
		cmd_key_div.appendChild(cmd_key_div_title);
		frag.appendChild(cmd_key_div);
		
		cmds.forEach(function(cmd){
			// Create the command button. 
			let elem = document.createElement("button");
			elem.classList.add("command");
			elem.setAttribute("title", cmd.cmd);
	
			// 
			cmd_key_div.appendChild(elem);
	
			// If the title is set then use that, otherwise use the cmd. 
			if(cmd.title){ elem.innerText = cmd.title; }
			else         { 
				if(Array.isArray(cmd.cmd)){
					elem.innerText = "???"; 
				}
				else{
					elem.innerText = cmd.cmd; 
				}
			}
	
			// Add the click event listener.
			elem.addEventListener("click", function(){
				// If the pressCtrlC flag is set then do that first. 
				if(cmd.pressCtrlC){ pressControlC(); }
	
				// Get the command. 
				let runThis = cmd.cmd;

				if(Array.isArray(runThis)){
					console.log("!!!!");
					runThis.forEach(function(d){
						console.log(d + "\r");
						terms[0].ws.send(d + "\r");
					});
				}
				else{
					// Add a carriage return if the pressEnter flag is set. 
					if(cmd.pressEnter){ runThis += "\r" }
		
					// Send the command via the websocket. 
					terms[0].ws.send(runThis);
				}
				
			}, true);
		});

		// Add the frag to the commands div. 
		commandsElem.appendChild(frag);
	});

	function addTerminal(idStr, options={}){
		return new Promise(async function(resolve,reject){
			// Create the terminal container and add it to the terminals div.
			let elem = document.createElement("div");
			elem.id = idStr;
			elem.classList.add("xterminal");

			// Add the terminal container to the terminals div. 
			let terminals = document.getElementById("terminals");
			terminals.appendChild(elem);

			// Create the xterm terminal. 
			var term1 = new Terminal(options);

			const fitAddon = new FitAddon.FitAddon();
			term1.loadAddon(fitAddon);
			fitAddon.fit(); 

			// Open the terminal via the created element. 
			term1.open(elem);

			// Create the websocket connection.
			let locUrl = location.protocol.replace('http', 'ws') + '//' + location.hostname + (location.port ? (':' + location.port) : '') + '/TERM';
			
			// Websocket create.
			var ws1 = new WebSocket(locUrl);

			// Websocket open.
			ws1.onmessage = function() { 
			};
			ws1.onopen = function() { 
				// Once opened, add the attachAddon for xterm with the websocket. 
				const attachAddon = new AttachAddon.AttachAddon(ws1);
				term1.loadAddon(attachAddon);


				// Add this complete terminal data to terms. 
				terms.push( { 
					elem        : elem       , 
					term        : term1      , 
					ws          : ws1        , 
					options     : options    , 
					attachAddon : attachAddon,
					fitAddon    : fitAddon,
					locUrl      : locUrl     ,
				} );

				// Resolve.
				resolve();
			};

			// Websocket errors.
			ws1.onerror = function(e) { console.log(e); };
		});
	};

	// Add terminals to the terminals div.
	await addTerminal('terminal1', config_terms );

	function addInfo(){
		return new Promise(async function(resolve,reject){
			let locUrl = location.protocol.replace('http', 'ws') + '//' + location.hostname + (location.port ? (':' + location.port) : '') + '/INFO';
			// Websocket create.
			info_ws = new WebSocket(locUrl);
			info_ws_isActive=true;
			info_ws.onopen = function() { 
				// setTimeout(function(){ info_ws.send("clientSize"); }, 1000);
				setTimeout(function(){ info_ws_isActive=false; resolve(); }, 10);
				
			};
			// info_ws.onmessage = function(e) { 
			// 	console.log("message:", e.data); 
			// };
			info_ws.onerror = function(e) { console.log("ERROR!!!!"); console.log(e); };
		});
	};

	await addInfo();

	function getInfo(key){
		return new Promise(async function(resolve,reject){
			if(key=="all"){
				info_ws_isActive=true;
				info_ws.onmessage = function(e) { 
					info_ws_isActive=false;
					document.getElementById("info_output").innerHTML = "<pre>" + e.data + "</pre>";
					
					let data = JSON.parse(e.data);
					let vpnStatusElem = document.getElementById("vpnStatus");

					if(data.vpnCheck){
						if(data.vpnCheck.active){
							if(data.vpnCheck.alive){
								vpnStatusElem.classList.add("active");
								vpnStatusElem.innerText = `${data.vpnCheck.name} ONLINE (HOST: ${data.vpnCheck.url})`;
								vpnStatusElem.title = `numeric_host: ${data.vpnCheck.numeric_host}, TIME: ${data.vpnCheck.time}`;
							}
							else{
								vpnStatusElem.classList.remove("active");
								vpnStatusElem.innerText = `${data.vpnCheck.name} OFFLINE (HOST: ${data.vpnCheck.url})`;
								vpnStatusElem.title = `numeric_host: ${data.vpnCheck.numeric_host}`;
							}
						}
						else{
							vpnStatusElem.classList.remove("active");
							vpnStatusElem.innerText = "";
							vpnStatusElem.title = "";
						}
					}
					else{
						vpnStatusElem.classList.remove("active");
						vpnStatusElem.innerText = "";
						vpnStatusElem.title = "";
					}

					resolve();
				};

				info_ws.send(key);
			}
			else {
				console.log("huh?", key);
				// info_ws.send(key);
			}
		})
	};

	getInfo("all");
	infoIntervalId = setInterval(function(){
		getInfo("all");
	}, 3000);

	// console.log(terms);
};
