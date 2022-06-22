app = {
	getConfigs : function(reread_cmds=false){
		return new Promise(async function(resolve,reject){
			// Get the configs.
			let configs;
			if(!reread_cmds){
				configs = await fetch("getConfigs");
			}
			else{
				configs = await fetch("getConfigs?reread_cmds=true");
			}

			// Parse the JSON.
			configs     = await configs.json();

			// Set the configs.
			app.commands.cmdList = configs.config_cmds;
			app.term.config      = configs.config_terms;
			app.os               = configs.os;

			let textCommands = document.getElementById("textCommands");
			textCommands.value = JSON.stringify(app.commands.cmdList,null,1);

			resolve();
		});
	},
	mainNav : {
		changeView        : function(tabId, destView){
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
	
			let tabElem = document.getElementById(tabId);
			let destElem = document.getElementById(destView);
	
			// Add the show class to the destView.
			document.getElementById(destView).classList.add("show");
	
			// Add the active class to the tab.
			document.getElementById(tabId).classList.add("active");
		},
		addTabBarListeners: function(){
			// Add event listeners for the tab navigation.
			let tablinks = document.querySelectorAll(".nav_tablink");
			tablinks.forEach(function(tab){
				tab.addEventListener("click", function(e){
					let tabId = this.id;
					let content = tab.getAttribute("dest");
					app.mainNav.changeView(tabId, content);
				}, false);
			});
		},
	},
	commands: {
		cmdList:[]
	},
	term: {
		config:[]
	}
};
app.manage = {
	nav : {
		dom: {},
		createTab: function(json){
			let tabContainer = document.createElement("span");
			let icon = document.createElement("i");
			let span = document.createElement("span");
			tabContainer.appendChild(icon);
			tabContainer.appendChild(span);

			tabContainer.classList.add("sub_tabs3");
			tabContainer.classList.add("hover_shadow");
			tabContainer.setAttribute("viewId", json['viewId']);
			tabContainer.setAttribute("tabId",json['tabId']);
			tabContainer.id = json['tabId'];

			tabContainer.addEventListener("click", function(){
				let sub_tabs = document.querySelectorAll(".sub_tabs3");
				sub_tabs.forEach(function(t){
					t.classList.remove("active");
				});
				let sub_views = document.querySelectorAll(".nav_view3");
				sub_views.forEach(function(t){
					t.classList.remove("show");
				});
				
				let view = document.getElementById( tabContainer.getAttribute("viewId") );

				tabContainer.classList.add("active");
				view.classList.add("show");

			}, false);

			json['icon_classes'].forEach(function(iconClass){
				icon.classList.add(iconClass);
			});

			span.innerText = json['label'];
			span.title     = json['title'];

			return tabContainer;
		},
		createView: function(){},
		createTabs: function(keys){
			let retArr = [];
			keys.forEach(function(k){
				let json = {
					tabId        : `${k}__tabId` .replace(/[^a-z0-9]/gi, '_'),
					viewId       : `${k}__viewId`.replace(/[^a-z0-9]/gi, '_'),
					sectionKey   : k,
					icon_classes : ["mdi", "mdi-pencil"],
					label        : k,
					title        : k,
					tab          : null,
				};
				json.tab = app.manage.nav.createTab(json);
				retArr.push(json);
			});
			return retArr;
		},
		createViews: function(arr){
			let createGroup = function(sectionKey, groupKey, cmds){
				// app.commands.cmdList, rec.sectionKey, group
				let cmd_key_div = document.createElement("div");
				let title       = document.createElement("div");
				let br = document.createElement("br");
				let commandsDiv = document.createElement("div");
				cmd_key_div.appendChild(title);
				cmd_key_div.appendChild(br);
				cmd_key_div.appendChild(commandsDiv);
				
				cmd_key_div.classList.add("cmd_key_div2");
				title      .classList.add("title");
				// title.innerText = groupKey;`
				title.innerText = "Group Key:";
				let groupTitleElem = document.createElement("input");
				groupTitleElem.type = "text";
				groupTitleElem.value = groupKey;
				title.appendChild(groupTitleElem);
				commandsDiv.classList.add("commandsDiv2");
				
				let table = document.createElement("table");
				let thead = document.createElement("thead");
				let tbody = document.createElement("tbody");
				table.appendChild(thead);
				table.appendChild(tbody);
				commandsDiv.appendChild(table);
				table.classList.add("tableType1");
				let tr;
				tr = thead.insertRow(-1);
				th = document.createElement("th"); tr.appendChild(th); th.innerText = "Title/SendAs";
				th = document.createElement("th"); tr.appendChild(th); th.innerText = "Cmd";
				th = document.createElement("th"); tr.appendChild(th); th.innerText = "Checkboxes";

				// th = document.createElement("th"); tr.appendChild(th); th.innerText = "Hidden";
				// th = document.createElement("th"); tr.appendChild(th); th.innerText = "PressCtrlC";
				// th = document.createElement("th"); tr.appendChild(th); th.innerText = "PressEnter";
				
				// console.log(sectionKey, groupKey, cmds);
				cmds.forEach(function(cmd, cmd_i){
					// console.log("    CMD: ", cmd);

					tr = tbody.insertRow(-1);
					tr.classList.add("entryRow");
					let tr_json = {
						"sectionKey": sectionKey, 
						"groupKey"  : groupKey.replace(/[^a-z0-9]/gi, '_') ,
					};
					tr.setAttribute("cmdOrder", (cmd_i + 1) );
					tr.setAttribute("json", JSON.stringify(tr_json));
					let td; 

					td = document.createElement("td"); 
					let table_titleSendAs = document.createElement("table");
					table_titleSendAs.classList.add("table_checkboxes");

					let tr1_titleSendAs     = table_titleSendAs.insertRow(-1);
					let tr1_td1_titleSendAs = tr1_titleSendAs.insertCell(-1);
					let tr1_td2_titleSendAs = tr1_titleSendAs.insertCell(-1);
					let titleElem      = document.createElement("input");  titleElem.classList.add("titleElem");
					titleElem.type = "text";
					titleElem.title = "titleElem";
					titleElem.value        = cmd.title;
					titleElem.setAttribute("key", "title");
					tr1_td1_titleSendAs.innerText = "Title";
					tr1_td2_titleSendAs.appendChild(titleElem);
					
					let tr2_titleSendAs     = table_titleSendAs.insertRow(-1);
					let tr2_td1_titleSendAs = tr2_titleSendAs.insertCell(-1);
					let tr2_td2_titleSendAs = tr2_titleSendAs.insertCell(-1);
					let sendAsElem     = document.createElement("select"); sendAsElem.classList.add("sendAsElem");
					sendAsElem.title = "sendAsElem";
					let options = ["single", "wrapInBashFunction"];
					options.forEach(function(o){
						let option = document.createElement("option");
						option.value = o;
						option.innerText = o;
						sendAsElem.appendChild(option);
					});
					sendAsElem.value       = cmd.sendAs;
					sendAsElem.addEventListener("change", function(){
						cmdElem.classList.remove("taller");
						cmdElem.classList.remove("shorter");
						cmdElem.classList.remove("muchTaller");
						if     (this.value == "single"){ cmdElem.classList.add("shorter"); }
						else if(this.value == "wrapInBashFunction"){ cmdElem.classList.add("taller"); }
					}, false);
					sendAsElem.setAttribute("key", "sendAs");
					tr2_td1_titleSendAs.innerText = "Send As";
					tr2_td2_titleSendAs.appendChild(sendAsElem);

					td.appendChild(table_titleSendAs);
					tr.appendChild(td);
					
					// CHECKBOXES
					td = document.createElement("td"); 
					let table_checkboxes = document.createElement("table");
					table_checkboxes.classList.add("table_checkboxes");

					let tr1_checkboxes     = table_checkboxes.insertRow(-1);
					let tr1_td1_checkboxes = tr1_checkboxes.insertCell(-1);
					let tr1_td2_checkboxes = tr1_checkboxes.insertCell(-1);
					let hiddenElem     = document.createElement("input");  hiddenElem.classList.add("hiddenElem");
					hiddenElem.title = "hiddenElem";
					hiddenElem.type = "checkbox";
					hiddenElem.checked     = cmd.hidden ? true : false;
					hiddenElem.setAttribute("key", "hidden");
					tr1_td1_checkboxes.innerText = "Hidden";
					tr1_td2_checkboxes.appendChild(hiddenElem);

					let tr2_checkboxes     = table_checkboxes.insertRow(-1);
					let tr2_td1_checkboxes = tr2_checkboxes.insertCell(-1);
					let tr2_td2_checkboxes = tr2_checkboxes.insertCell(-1);
					let pressCtrlCElem = document.createElement("input");  pressCtrlCElem.classList.add("pressCtrlCElem");
					pressCtrlCElem.title = "pressCtrlCElem";
					pressCtrlCElem.type = "checkbox";
					pressCtrlCElem.checked = cmd.pressCtrlC ? true : false;
					pressCtrlCElem.setAttribute("key", "pressCtrlC");
					tr2_td1_checkboxes.innerText = "Press Ctrl+C";
					tr2_td2_checkboxes.appendChild(pressCtrlCElem);

					let tr3_checkboxes     = table_checkboxes.insertRow(-1);
					let tr3_td1_checkboxes = tr3_checkboxes.insertCell(-1);
					let tr3_td2_checkboxes = tr3_checkboxes.insertCell(-1);
					let pressEnterElem = document.createElement("input");  pressEnterElem.classList.add("pressEnterElem");
					pressEnterElem.title = "pressEnterElem";
					pressEnterElem.type = "checkbox";
					pressEnterElem.checked = cmd.pressEnter ? true : false;
					pressEnterElem.setAttribute("key", "pressEnter");
					tr3_td1_checkboxes.innerText = "Press Enter";
					tr3_td2_checkboxes.appendChild(pressEnterElem);
					td.appendChild(table_checkboxes);
					tr.appendChild(td);

					td= document.createElement("td"); 
					let cmdElem;
					if(Array.isArray(cmd.cmd)){
						cmdElem       = document.createElement("textarea");  
						cmdElem.classList.add("cmdElem_textarea");
						cmdElem.classList.add("taller");
						// cmdElem.classList.add("muchTaller");
						cmdElem.value = cmd.cmd.join("\n");
					}
					else{
						cmdElem       = document.createElement("textarea");  
						cmdElem.classList.add("cmdElem_textarea");
						cmdElem.classList.add("shorter");
						cmdElem.value = cmd.cmd;
					}
					cmdElem.title = "cmdElem";
					cmdElem.addEventListener("click", function(){
						if(this.classList.contains("taller")){
							this.classList.add("muchTaller");
						}
					}, false);
					cmdElem.addEventListener("blur" , function(){
						if(this.classList.contains("taller")){
							this.classList.remove("muchTaller");
						}
					}, false);
					cmdElem.setAttribute("key", "cmd");
					td.appendChild(cmdElem);
					tr.appendChild(td);
					
				});

				return cmd_key_div;
			};

			arr.forEach(function(rec){
				let viewContainer = document.createElement("div");
				viewContainer.classList.add("nav_view3");
				viewContainer.id = rec.viewId;
				// viewContainer.innerText = JSON.stringify(rec.sectionKey,null,1);

				// Create groups for this section and also the commands within the group.
				let section = app.commands.cmdList[rec.sectionKey];
				
				// Create the input for the section name. 
				let sectionTitleDiv = document.createElement("div");
				sectionTitleDiv.classList.add("sectionTitle");
				sectionTitleDiv.innerText = "Section Key:";
				let sectionTitleElem = document.createElement("input");
				sectionTitleElem.type = "text";
				sectionTitleElem.value = rec.sectionKey;
				sectionTitleDiv.appendChild(sectionTitleElem);

				let plusIcon = document.createElement("i");
				plusIcon.innerHTML = "&plus; Add Group";
				plusIcon.classList.add("plusIcon");
				// TODO: event listener.
				plusIcon.addEventListener("click", function(){
					let newName = prompt("What is the new Group name?", "REPLACEME");
					let s_key = rec.sectionKey;
					let g_key = newName.replace(/[^a-z0-9]/gi, '_');

					console.log("newName:", newName);
					console.log("s_key  :", s_key);
					console.log("g_key  :", g_key);

					// Create a placeholder for the first command.
					let dummyCmd = {
						"title": "PLACEHOLDER",
						"hidden": false,
						"sendAs": "single",
						"cmd": "echo \"I am a placeholder.\"",
						"pressCtrlC": false,
						"pressEnter": true,
						"order": 0,
					};
					// Add the new group to the TOP of the group list.
					app.commands.cmdList[s_key] = { [g_key]: [dummyCmd], ...app.commands.cmdList[s_key] };

					let textCommands = document.getElementById("textCommands");
					textCommands.value = JSON.stringify(app.commands.cmdList,null,1);

					// app.manage.nav.rebuildAndUpdateCmds(false);
					app.manage.nav.buildTheManager(0);
				}, false);
				viewContainer.appendChild(plusIcon);

				viewContainer.appendChild(sectionTitleDiv);

				let groupKeys = Object.keys(section);
				groupKeys.forEach(function(group){
					let groupElem = createGroup(rec.sectionKey, group, section[group]);
					viewContainer.appendChild(groupElem);
				});

				rec.view = viewContainer;
			});

			return arr;
		},

		rebuildJSON: function(){
			let recs = document.querySelectorAll("#sub_views3 .entryRow");
			
			let json = {};
			
			recs.forEach(function(rec){
				let keys = JSON.parse(rec.getAttribute("json"));
				let temp = {
					"row"           : rec,
					// "sectionKey"    : keys.sectionKey.replace(/[^a-z0-9]/gi, '_'),
					// "groupKey"      : keys.groupKey.replace(/[^a-z0-9]/gi, '_'),
					"newGroupKey"   : rec.closest(".cmd_key_div2").querySelector(".title input")      .value.replace(/[^a-z0-9]/gi, '_'),
					"newSectionKey" : rec.closest(".nav_view3")   .querySelector(".sectionTitle input").value.replace(/[^a-z0-9]/gi, '_'),
				};
				let obj = {
					"title"     : rec.querySelector("td [key='title']")     .value ,
					"sendAs"    : rec.querySelector("td [key='sendAs']")    .value ,
					
					"hidden"    : rec.querySelector("td [key='hidden']")    .checked ? true : false ,
					"pressCtrlC": rec.querySelector("td [key='pressCtrlC']").checked ? true : false ,
					"pressEnter": rec.querySelector("td [key='pressEnter']").checked ? true : false ,

					"cmd"       : rec.querySelector("td [key='cmd']")       .value ,
					
					"cmdOrder"  : rec.getAttribute('cmdOrder'),

					// "hidden"    : rec.querySelector("td .hiddenElem")    .checked ? true : false ,
					// "pressCtrlC": rec.querySelector("td .pressCtrlCElem").checked ? true : false ,
					// "pressEnter": rec.querySelector("td .pressEnterElem").checked ? true : false ,
				};

				// Is the command an array?
				// if(obj.cmd.split("\n").length > 1){
				// 	obj.cmd = obj.cmd.split("\n").map(x=>x.trim()) ;
				// 	obj.sendAs = "wrapInBashFunction";
				// }

				// // The command is a string with only one line.
				// else{
				// 	obj.sendAs = "single";
				// }

				// console.log(temp.newSectionKey, " -------------------", temp.newGroupKey);

				// Create the section if needed.
				if( undefined == json[temp.newSectionKey]                  ){ json[temp.newSectionKey] = {}; }
				
				// Create the group within the section if needed.
				if( undefined == json[temp.newSectionKey][ temp.newGroupKey ] ){ json[temp.newSectionKey][ temp.newGroupKey ] = []; }

				// Add the entry to the group.
				json[temp.newSectionKey][ temp.newGroupKey ].push(obj);
			});

			// Sort all sections by their sectionOrder.
			// 

			// Sort all section's groups by their groupOrder.
			//

			// Sort all section's group's commands by their cmdOrder.
			//

			return json;

		},

		buildTheManager: function(selectTab){
			let tabs = app.manage.nav.createTabs( Object.keys(app.commands.cmdList) );
			let views = app.manage.nav.createViews( tabs );

			let frag_tabs = document.createDocumentFragment();
			let frag_views = document.createDocumentFragment();

			app.manage.nav.dom['manage_sub_tabs3'] .innerHTML = "";
			app.manage.nav.dom['manage_sub_views3'].innerHTML = "";

			// return;
			views.forEach(function(rec){
				frag_tabs.appendChild (rec.tab);
				frag_views.appendChild(rec.view);
			});

			let plusIcon = document.createElement("i");
			plusIcon.innerHTML = "&plus; Add Section";
			plusIcon.classList.add("plusIcon");
			// TODO: event listener.
			frag_tabs.appendChild(plusIcon);

			app.manage.nav.dom['manage_sub_tabs3'] .appendChild(frag_tabs);
			app.manage.nav.dom['manage_sub_views3'].appendChild(frag_views);

			try{
				let tabs = document.querySelectorAll(".sub_tabs3");
				if( (tabs.length && undefined == selectTab) || (selectTab > tabs.length) ){
					selectTab = 0;
				}
				let tab = tabs[selectTab];
				if(tab){
					tab.dispatchEvent(new Event("click"));
				}
				else{
					console.log("tab not found:", tab, selectTab, tabs);
				}
			}
			catch(e){ console.log(e); }
		},

		update_config_cmds: async function(json){
			return new Promise(async function(resolve,reject){
				// The JSON is good, send it to the server so that it can be updated.
				let obj = {
					method: 'POST',
					headers: {
						'Accept'      : 'application/json',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(json)
				};
				let resp = await fetch("update_config_cmds", obj);
				resp = await resp.json();
				alert("SERVER: " + resp);
	
				// Read/Download Commands (Opens the terminal view and open the command drawer.)
				// let refreshCommands = document.getElementById("refreshCommands");
				// refreshCommands.click();
	
				resolve();
			});
		},
		rebuildAndUpdateCmds: async function(updateServer=false){
			// let activeTab = document.querySelectorAll(".sub_tabs3.active");

			let newJSON = app.manage.nav.rebuildJSON();
				
			let textCommands = document.getElementById("textCommands");
			textCommands.value = JSON.stringify(newJSON,null,1);
			app.commands.cmdList = newJSON;
						
			if(updateServer){
				await app.manage.nav.update_config_cmds(newJSON);
			}

			app.manage.nav.buildTheManager(0);
		},
		init: async function(){
			app.manage.nav.dom['manage_cmd_editor'] = document.getElementById("cmd_editor");
			app.manage.nav.dom['manage_sub_tabs3']  = document.getElementById("sub_tabs3");
			app.manage.nav.dom['manage_sub_views3'] = document.getElementById("sub_views3");
			app.manage.nav.dom['rebuildAndUpdateCmds'] = document.getElementById("rebuildAndUpdateCmds");

			app.manage.nav.buildTheManager(0);
			
			app.manage.nav.dom['rebuildAndUpdateCmds'].addEventListener("click", async function(){
				app.manage.nav.rebuildAndUpdateCmds(true);
			}, false);
		},
	},
	
	init: async function(){
		await app.manage.nav.init();
	},
};

window.onload = async function(){
	window.onload = null;
	await app.getConfigs(true);
	await app.mainNav.addTabBarListeners();
	
	// Set the default tab/view.
	app.mainNav.changeView("tab_manage_v2"  , "view_manage_v2" );

	await app.manage.init();
};