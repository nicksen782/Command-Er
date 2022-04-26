// TODO: Commands are force to the first terminal. This should not be hard-coded.
// .xterminal should also have a .title.

let terms = [];
let info_ws = null;
let info_ws_isActive = false;

let getConfigs = {};
let config_cmds = {};
let config_terms = {};

let getActiveTerminal = function(){
	// Is there actually a terminal?
	if(!terms.length){ 
		console.log("No terminals exist."); 
		throw "No terminals exist.";
	}

	// Get the terminal object via the termId.
	let termId = document.querySelector(".terminalTab.active").getAttribute("termId");
	let termObj = terms.find(function(d){ 
		return termId == d.termId; 
	});

	// No match? Throw an error.
	if(!termObj){
		throw "termObj not found.";
	}

	// Return the termObj.
	return termObj;
};
let pressControlC = function(){
	getActiveTerminal().ws.send("\x03");
};
let infoIntervalId = null;
let nexttermId = 1;

function changeView(tabId, destView) {
	// Hide all tab content.
	let tabcontent = document.getElementsByClassName("tabcontent");
	for (let i = 0; i < tabcontent.length; i++) {
		tabcontent[i].classList.remove("show");
	}
	
	// Clear the active class on all tabs.
	let tablinks = document.getElementsByClassName("tablinks");
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].classList.remove("active");
	}

	// Add the show class to the destView.
	document.getElementById(destView).classList.add("show");
	
	// Add the active class to the tab.
	document.getElementById(tabId).classList.add("active");
}

let addTabBarListeners = function(){
	// Add event listeners for the tab navigation.
	let tablinks = document.querySelectorAll(".tablinks");
	tablinks.forEach(function(tab){
		tab.addEventListener("click", function(e){
			let tabId = this.id;
			let content = tab.getAttribute("dest");
			console.log(tabId, content);
			changeView(tabId, content);
		}, false);
	});
}

let addCommandBarListeners = function(){
	let terminals_cmdsBar   = document.getElementById("terminals_cmdsBar");
	let commands            = document.getElementById("commands");
	let terminals_terminals = document.getElementById("terminals_terminals");
	
	terminals_cmdsBar.addEventListener("click"       , function(){ commands.classList.toggle("show"); }, true);
	// terminals_cmdsBar.addEventListener("mouseenter"  , function(){ commands.classList.add("show"); }, true);
	terminals_terminals.addEventListener("mouseenter", function(){ commands.classList.remove("show"); }, false);
};

let addCommands = function(){
	// Get the commands div. 
	let commandsElem = document.getElementById("commands");

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
					runThis.forEach(function(d){
						getActiveTerminal().ws.send(d + "\r");
					});
				}
				else{
					// Add a carriage return if the pressEnter flag is set. 
					if(cmd.pressEnter){ runThis += "\r" }
		
					// Send the command via the websocket. 
					getActiveTerminal().ws.send(runThis);
				}

				let commands = document.getElementById("commands");
				commands.classList.remove("show");
				
			}, true);
		});

		// Add the frag to the commands div. 
		commandsElem.appendChild(frag);
	});
};

function addTerminal(termId, options={}){
	return new Promise(async function(resolve,reject){
		// CREATE THE TAB  (container)
		let tabElem = document.createElement("span");
		tabElem.classList.add("terminalTab");
		tabElem.setAttribute("tabId", 't_' + termId + "_tab");
		tabElem.setAttribute("termId", 't_' + termId);
		
		// CREATE THE TAB  (title)
		let titleElem = document.createElement("span");
		titleElem.classList.add("title");
		titleElem.innerText = "TERM #" + (termId).toString().padStart(2, "0");
		
		// CREATE THE TAB  (close)
		let closeElem = document.createElement("span");
		closeElem.classList.add("close");
		closeElem.innerText = "X";

		// Combine the elements of the tab.
		tabElem.appendChild(titleElem);
		tabElem.appendChild(closeElem);

		// CREATE THE TERMINAL (view)
		let termElem = document.createElement("div");
		termElem.id = 't_' + termId;
		termElem.classList.add("xterminal");

		// Create the xterm terminal. 
		var term1 = new Terminal(options);
		
		// Create the WebSocket connection.
		let locUrl = location.protocol.replace('http', 'ws') + '//' + location.hostname + (location.port ? (':' + location.port) : '') + '/TERM';
		var ws1 = new WebSocket(locUrl);
		ws1.onmessage = function() {};
		ws1.onopen = async function() {
			// Add the terminal tab to the terminals_tabs container. 
			let terminals_tabs = document.getElementById("terminals_tabs");
			terminals_tabs.appendChild(tabElem);

			// Add the terminal container to the terminals div. 
			let terminals = document.getElementById("terminals_terminals");
			terminals.appendChild(termElem);

			// Add the add-ons.
			const fitAddon = new FitAddon.FitAddon();
			term1.loadAddon(fitAddon);
			
			const attachAddon = new AttachAddon.AttachAddon(ws1);
			term1.loadAddon(attachAddon);
			
			// Open the terminal.
			term1.open(termElem);

			// Add this complete terminal data to terms. 
			let obj = { 
				termId       : 't_' + termId   , 
				// options     : options , 
				// locUrl      : locUrl  ,
				
				// Elems.
				elems : {
					tabElem  : tabElem , 
					termElem : termElem , 
					viewport : termElem.querySelector(".xterm-viewport"),
					screen   : termElem.querySelector(".xterm-screen")  ,
					textarea : termElem.querySelector("textarea.xterm-helper-textarea")  ,
				},

				term        : term1      , 
				ws          : ws1        , 
				attachAddon : attachAddon,
				fitAddon    : fitAddon   ,

				funcs: {
					resize: function(_obj){
						try{
							_obj.fitAddon.fit(); 
							_obj.elems.viewport.style.width = "";
							_obj.elems.screen.style.width = "";
						}
						catch(e){
							console.log(_obj);
							console.log(e);
						}
					},
					close: function(_obj){
						let index = -1;
						terms.forEach(function(d,i){
							if(d.termId == _obj.termId) { index = i; }  
							return;
						});
						if(index != -1){
							// Close the websocket. 
							_obj.ws.close();

							// Close the terminal.
							_obj.term.dispose();

							// Remove the terminal tab.
							_obj.elems.tabElem.remove();

							terms.splice(index, 1);
							// console.log("Remaining:", terms.map(function(d){ return d.termId; }));
						}
						else{
							console.log("Not found!");
						}
					},
					switch: function(_obj){
						let tabs = document.querySelectorAll(".terminalTab");
						let terms = document.querySelectorAll(".xterminal");
						tabs.forEach(function(d){ d.classList.remove("active"); });
						terms.forEach(function(d){ d.classList.remove("active"); });
						_obj.elems.tabElem.classList.add("active");
						_obj.elems.termElem.classList.add("active");
						_obj.elems.textarea.focus();
					},
				}
			};

			// SET EVENT LISTENERS FOR THE TAB.
			titleElem.addEventListener("click", function(e){ obj.funcs.switch(obj); }, false);
			closeElem.addEventListener("click", function(e){ obj.funcs.close(obj);  }, false);

			terms.push( obj );

			// setTimeout(function(){ obj.funcs.resize(obj); }, 500);

			// Resolve.
			resolve(obj);
		};
		ws1.onerror = function(e) { console.log(e); };
	})
};

function addCreateNewTerminalButton(){
	let terminals_add = document.getElementById("terminals_add");
	
	terminals_add.addEventListener("click"       , async function(){
		// Create the new terminal.
		let termObj = await addTerminal('' + nexttermId++, config_terms ); 
		
		// Activate the NEW terminal tab and view.
		termObj.funcs.switch(termObj);
	}, true);
};

window.onload = async function(){
	window.onload = null;
	
	// Set the default tab/view.
	changeView("tab_terminals"  , "view_terminals" );

	// Get the configs.
	let getConfigs = await fetch("getConfigs");
	getConfigs     = await getConfigs.json();
	config_cmds    = getConfigs.config_cmds;
	config_terms   = getConfigs.config_terms;

	addTabBarListeners();
	addCommandBarListeners();
	addCommands();
	addCreateNewTerminalButton();

	// Add terminals to the terminals div.
	let termObj = await addTerminal('' + nexttermId++, config_terms ); 
	termObj.funcs.switch(termObj);

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

					let vpnStatusElem = document.getElementById("vpn_status");
					if(data.vpnCheck){
						if(data.vpnCheck.active){
							if(data.vpnCheck.alive){
								vpnStatusElem.classList.add("active");
								vpnStatusElem.innerText = `${data.vpnCheck.name}: ACTIVE`;
								vpnStatusElem.title = `` +
									`HOST: ${data.vpnCheck.url}\n` +
									`IP: ${data.vpnCheck.numeric_host}, PING: ${data.vpnCheck.time}\n` +
									``;
							}
							else{
								vpnStatusElem.classList.remove("active");
								vpnStatusElem.innerText = `${data.vpnCheck.name}: INACTIVE`;
								vpnStatusElem.title = `` +
									`HOST: ${data.vpnCheck.url}\n` +
									`IP: ${data.vpnCheck.numeric_host}, PING: ${data.vpnCheck.time}\n` +
									``;
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

					let ws_terms = document.getElementById("ws_connections_terms");
					let ws_infos = document.getElementById("ws_connections_infos");
					let termsCnt = 0;
					let infosCnt = 0;
					if(data.ws_connections){
						data.ws_connections.forEach(function(d){
							if     (d.type == "term"){ termsCnt += 1; }
							else if(d.type == "info"){ infosCnt += 1; }
						});
						ws_terms.innerText = "Terms: " + termsCnt;
						ws_infos.innerText = "Infos: " + infosCnt;
					}
					else{
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

};
