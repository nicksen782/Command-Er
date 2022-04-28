// TODO: Commands are force to the first terminal. This should not be hard-coded.
// .xterminal should also have a .title.

let terms = [];
let info_ws = null;
let info_ws_isActive = false;

let getConfigs = {};
let config_cmds = {};
let config_terms = {};

let test_getDom = function(){
	console.log(
		"test_getDom:",
		"\n  navTabs          :", getDom("navTabs")          ? "found" : "NOT FOUND",
		"\n  activeNavTab     :", getDom("activeNavTab")     ? "found" : "NOT FOUND",
		"\n  view_terminals   :", getDom("view_terminals")   ? "found" : "NOT FOUND",
		"\n  view_info        :", getDom("view_info")        ? "found" : "NOT FOUND",
		"\n  info_output      :", getDom("info_output")      ? "found" : "NOT FOUND",
		"\n  activeTerminal   :", getDom("activeTerminal")   ? "found" : "NOT FOUND",
		"\n  addTerm          :", getDom("addTerm")          ? "found" : "NOT FOUND",
		"\n  termsCmdBar      :", getDom("termsCmdBar")      ? "found" : "NOT FOUND",
		"\n  termsTabs        :", getDom("termsTabs")        ? "found" : "NOT FOUND",
		"\n  termsTerms       :", getDom("termsTerms")       ? "found" : "NOT FOUND",
		"\n  commands         :", getDom("commands")         ? "found" : "NOT FOUND",
		"\n  commandTabs      :", getDom("commandTabs")      ? "found" : "NOT FOUND",
		"\n  activeCommandTab :", getDom("activeCommandTab") ? "found" : "NOT FOUND",
		"\n  commandViews     :", getDom("commandViews")     ? "found" : "NOT FOUND",
		"\n  statusBar_vpn    :", getDom("statusBar_vpn")    ? "found" : "NOT FOUND",
		"\n  statusBar_terms  :", getDom("statusBar_terms")  ? "found" : "NOT FOUND",
		"\n  statusBar_infos  :", getDom("statusBar_infos")  ? "found" : "NOT FOUND",
	);
};
let getDom = function(thing){
	let returned = null;

	switch(thing){
		case "navTabs"          : { returned = document.querySelectorAll(".nav_tablink");       break; } // NAV (MAIN)
		case "activeNavTab"     : { returned = document.querySelector(".nav_tablink.active");   break; } // NAV (MAIN)
		case "view_terminals"   : { returned = document.getElementById("view_terminals");       break; } // VIEW
		case "view_info"        : { returned = document.getElementById("view_info");            break; } // VIEW
		case "info_output"      : { returned = document.getElementById("info_output");          break; } // INFO
		case "activeTerminal"   : { returned = document.querySelector(".terminalTab.active");   break; } // TERMINALS
		case "addTerm"          : { returned = document.getElementById("terminals_add");        break; } // TERMINALS
		case "termsCmdBar"      : { returned = document.getElementById("terminals_cmdsBar");    break; } // TERMINALS
		case "termsTabs"        : { returned = document.getElementById("terminals_tabs");       break; } // TERMINALS
		case "termsTerms"       : { returned = document.getElementById("terminals_terminals");  break; } // TERMINALS
		case "commands"         : { returned = document.getElementById("commands");             break; } // TERMINALS/COMMANDS
		case "commandTabs"      : { returned = document.getElementById("cmds_navBar");        break; } // TERMINALS/COMMANDS
		case "activeCommandTab" : { returned = document.querySelector(".cmds_tablink.active");        break; } // TERMINALS/COMMANDS
		case "commandViews"     : { returned = document.getElementById("commands_views");       break; } // TERMINALS/COMMANDS
		case "statusBar_vpn"    : { returned = document.getElementById("vpn_status");           break; } // TERMINALS/STATUS
		case "statusBar_terms"  : { returned = document.getElementById("ws_connections_terms"); break; } // TERMINALS/STATUS
		case "statusBar_infos"  : { returned = document.getElementById("ws_connections_infos"); break; } // TERMINALS/STATUS
		default: { break; } // DEFAULT
	};

	return returned;
};

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
	let tabcontent = document.querySelectorAll(".nav_tabContent");
	for (let i = 0; i < tabcontent.length; i++) {
		tabcontent[i].classList.remove("show");
	}
	
	// Clear the active class on all tabs.
	let tablinks = document.querySelectorAll(".nav_tablink");
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
	let tablinks = document.querySelectorAll(".nav_tablink");
	tablinks.forEach(function(tab){
		tab.addEventListener("click", function(e){
			let tabId = this.id;
			let content = tab.getAttribute("dest");
			changeView(tabId, content);
		}, false);
	});
}

let addCommandBarListeners = function(){
	let terminals_cmdsBar   = document.getElementById("terminals_cmdsBar");
	let commands            = document.getElementById("commands");
	let terminals_terminals = document.getElementById("terminals_terminals");
	
	terminals_cmdsBar  .addEventListener("click"     , function(){ commands.classList.toggle("show"); }, false);
	terminals_cmdsBar  .addEventListener("mouseenter", function(){ commands.classList.add   ("show"); }, false);
	commands           .addEventListener("mouseleave", function(){ commands.classList.remove("show"); }, false);
	// terminals_terminals.addEventListener("mouseenter", function(){ commands.classList.remove("show"); }, false);
};

// TODO: Need a tab system for each section.
let addCommands = function(){
	// Get the commands div. 
	// let commandsElem = document.getElementById("commands");
	let commands_tabsElem = document.getElementById("cmds_navBar");
	let commands_viewsElem = document.getElementById("commands_views");

	// 
	let sectionKeys = Object.keys(config_cmds);
	sectionKeys.forEach(function(sectionKey, index){
		// For each section make a tab and a view.
		let section = config_cmds[sectionKey];
		let cmdKeys = Object.keys(section);

		let tab  = document.createElement("div");
		tab.innerText = sectionKey;
		tab.classList.add("cmds_tablink");
		if(index==0){ tab.classList.add("active"); }
		commands_tabsElem.appendChild(tab);
		
		let view = document.createElement("div");
		view.classList.add("cmds_tabContent");
		if(index==0){ view.classList.add("active"); }
		commands_viewsElem.appendChild(view);

		tab.addEventListener("click", function(){
			let tabs = document.querySelectorAll(".cmds_tablink");
			let terms = document.querySelectorAll(".cmds_tabContent");
			tabs.forEach(function(d){ d.classList.remove("active"); });
			terms.forEach(function(d){ d.classList.remove("active"); });
			
			tab.classList.add("active");
			view.classList.add("active");

		}, false);

		let viewFrag = document.createDocumentFragment();
		cmdKeys.forEach(function(cmdKey){
			let cmds = section[cmdKey];
			let cmd_key_div = document.createElement("div");
			let cmd_key_div_title = document.createElement("div");
			cmd_key_div.classList.add("cmd_key_div");
			cmd_key_div_title.classList.add("title");
			cmd_key_div_title.innerText = cmdKey;
			cmd_key_div.appendChild(cmd_key_div_title);
			
			let commandsDiv = document.createElement("div");
			commandsDiv.classList.add("commandsDiv");
			cmd_key_div.appendChild(commandsDiv);

			cmds.forEach(function(cmd){
				// Create the command button. 
				let elem = document.createElement("button");
				elem.classList.add("command");
				elem.setAttribute("title", cmd.cmd);

				commandsDiv.appendChild(elem);
	
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
	
					// let commands = document.getElementById("commands");
					// commands.classList.remove("show");
					
				}, true);

				viewFrag.appendChild(cmd_key_div);
			});
			view.appendChild(viewFrag);
		});

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
		titleElem.innerText = "TERM #" + (termId).toString().padStart(3, "0");
		
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

		// SET EVENT LISTENERS FOR THE TAB.
		titleElem.addEventListener("click", function(e){ obj.funcs.switch(obj); }, false);
		closeElem.addEventListener("click", function(e){ obj.funcs.close(obj);  }, false);

		// Create the xterm terminal. 
		var term1 = new Terminal(options);
		
		// Create the WebSocket connection.
		let locUrl = location.protocol.replace('http', 'ws') + '//' + location.hostname + (location.port ? (':' + location.port) : '') + '/TERM';
		var ws1 = new WebSocket(locUrl);

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
				viewport : termElem.querySelector(".xterm .xterm-viewport"),
				screen   : termElem.querySelector(".xterm-screen")  ,
				textarea : termElem.querySelector("textarea.xterm-helper-textarea")  ,
			},

			term        : term1      , 
			ws          : ws1        , 
			attachAddon : attachAddon,
			fitAddon    : fitAddon   ,

			funcs: {
				clear: function(_obj){
					// _obj.term.write('\x1b')
					// First \n will cancel any existing escape or go to new line
					// Then the \n\r will put the cursor at the start of the next line
					// _obj.term.write('\n\n\r')
					_obj.term.clear();
					// _obj.ws.send("\r");
				},
				resize: function(_obj){
					try{
						_obj.fitAddon.fit(); 
						// _obj.elems.viewport.style['overflow-y'] = "auto";
						// _obj.elems.viewport.style.width = "";
						// _obj.elems.screen.style.width = "";
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

					// Resize the terminal to fit the parent (setTimeout seems to be needed here.)
					setTimeout(function(){ _obj.funcs.resize(_obj); }, 25);
					// _obj.funcs.resize(obj);
				},
			}
		};
		terms.push( obj );

		ws1.onmessage = function() {};
		ws1.onopen = async function() {
			// Resolve.
			obj.funcs.resize(obj);
			// console.log(`"${titleElem.innerText}", id: "${termElem.id}" added!`);
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
						vpnStatusElem.style.display = "none";
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

	// Add the info ws channel.
	await addInfo();

	let resizeTerm = document.getElementById("resizeTerm");
	resizeTerm.addEventListener("click", function(){
		let termObj = getActiveTerminal();
		termObj.funcs.resize(termObj);
	}, false);

	let clearTerm = document.getElementById("clearTerm");
	clearTerm.addEventListener("click", function(){
		let termObj = getActiveTerminal();
		termObj.funcs.clear(termObj);
	}, false);

	// Get initial info data and set a timer for repeated calls.
	getInfo("all");
	infoIntervalId = setInterval(function(){
		getInfo("all");
	}, 5000);

};
