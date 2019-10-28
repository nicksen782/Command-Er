//
var shared = {
	// Creates DOM cache, attaches event listeners, retrieves app list.
	init : function(){
		// Populate the DOM cache.

		// Modal background, progress bar.
		shared.DOM.entireBodyDiv             = document.querySelector("#entireBodyDiv")             ;
		shared.DOM.progressbarDiv            = document.querySelector("#progressbarDiv")            ;

		// DOM sections.
		shared.DOM.commands                  = document.querySelector("#commands")                  ;
		shared.DOM.commands_base             = document.querySelector("#commands_base")             ;
		shared.DOM.output                    = document.querySelector("#output")                    ;
		shared.DOM.output_text               = document.querySelector("#output_text")               ;
		shared.DOM.sshPhpInstructions        = document.querySelector("#sshPhpInstructions")        ;

		shared.DOM.selected_appid            = document.querySelector("#selected_appid")            ;
		shared.DOM.selected_cmdid            = document.querySelector("#selected_cmdid")            ;

		// Non-modal controls.
		shared.DOM.app_select                = document.querySelector("#app_select")                ;
		shared.DOM.cmd_select                = document.querySelector("#cmd_select")                ;
		shared.DOM.cmd_select_base           = document.querySelector("#cmd_select_base")           ;

		shared.DOM.app_new                   = document.querySelector("#app_new")                   ;
		shared.DOM.cmd_new                   = document.querySelector("#cmd_new")                   ;
		shared.DOM.cmd_run                   = document.querySelector("#cmd_run")                   ;
		shared.DOM.cmd_edit                  = document.querySelector("#cmd_edit")                  ;
		shared.DOM.cmd_del                   = document.querySelector("#cmd_del")                   ;
		shared.DOM.cmd_sortall                   = document.querySelector("#cmd_sortall")                   ;
		shared.DOM.cmd_run_base              = document.querySelector("#cmd_run_base")              ;
		shared.DOM.cmd_select_base           = document.querySelector("#cmd_select_base")           ;
		shared.DOM.outputWrapping            = document.querySelector("#outputWrapping")            ;

		// Modals.
		shared.DOM.modals                    = document.querySelectorAll(".modals")                 ;
		shared.DOM.modal_new_app             = document.querySelector("#modal_new_app")             ;
		shared.DOM.modal_new_cmd             = document.querySelector("#modal_new_cmd")             ;
		shared.DOM.modal_edit_cmd            = document.querySelector("#modal_edit_cmd")            ;
		shared.DOM.modal_sort_cmds            = document.querySelector("#modal_sort_cmds")            ;

		// Modal controls.
		shared.DOM.modalsClose               = document.querySelectorAll(".modalsClose")            ;
		shared.DOM.create_app                = document.querySelector("#create_app")                ;
		shared.DOM.create_cmd                = document.querySelector("#create_cmd")                ;
		shared.DOM.edit_cmd                  = document.querySelector("#edit_cmd")                  ;
		shared.DOM.edit_cmd_sort                  = document.querySelector("#edit_cmd_sort")                  ;

		shared.DOM.modal_new_app_appcodepath = document.querySelector("#modal_new_app_appcodepath") ;
		shared.DOM.modal_new_app_appname     = document.querySelector("#modal_new_app_appname")     ;
		shared.DOM.modal_new_app_description = document.querySelector("#modal_new_app_description") ;
		shared.DOM.modal_new_cmd_label       = document.querySelector("#modal_new_cmd_label")       ;
		shared.DOM.modal_new_cmd_command     = document.querySelector("#modal_new_cmd_command")     ;
		shared.DOM.modal_edit_cmd_label      = document.querySelector("#modal_edit_cmd_label")      ;
		shared.DOM.modal_edit_cmd_command    = document.querySelector("#modal_edit_cmd_command")    ;
		shared.DOM.modal_edit_cmd_sortorder  = document.querySelector("#modal_edit_cmd_sortorder")  ;

		shared.DOM.modal_new_cmd_canrunfromweb  = document.querySelector("#modal_new_cmd_canrunfromweb")  ;
		shared.DOM.modal_edit_cmd_canrunfromweb = document.querySelector("#modal_edit_cmd_canrunfromweb") ;


		shared.DOM.modal_cmd_reorder_table = document.querySelector("#modal_cmd_reorder_table") ;


		// Add event listeners.
		shared.DOM.app_select     .addEventListener("change", funcs.getAppData, false);
		shared.DOM.cmd_select_base.addEventListener("change", funcs.showHideRunButton, false);
		shared.DOM.cmd_select     .addEventListener("change", funcs.showHideRunButton, false);
		shared.DOM.app_new        .addEventListener("click" , modals.app_new, false);
		shared.DOM.cmd_new        .addEventListener("click" , modals.cmd_new, false);
		shared.DOM.cmd_edit       .addEventListener("click" , modals.cmd_edit, false);
		shared.DOM.cmd_del        .addEventListener("click" , modals.cmd_del, false);
		shared.DOM.create_app     .addEventListener("click" , funcs.create_app, false);
		shared.DOM.create_cmd     .addEventListener("click" , funcs.create_cmd, false);
		shared.DOM.edit_cmd       .addEventListener("click" , funcs.edit_cmd, false);
		shared.DOM.cmd_run        .addEventListener("click" , funcs.cmd_run, false);
		shared.DOM.cmd_run_base   .addEventListener("click" , funcs.cmd_run_base, false);
		shared.DOM.outputWrapping .addEventListener("change", funcs.outputWrapping, false);

		shared.DOM.cmd_sortall.addEventListener("click" , modals.resort_cmds, false);
		shared.DOM.edit_cmd_sort .addEventListener("click" , funcs.resort_cmds, false);

		shared.DOM.entireBodyDiv  .addEventListener("click", funcs.entireBodyDiv_clicked, false);
		document                  .addEventListener("keyup", function(e){ if(e.key=="Escape"){ funcs.entireBodyDiv_clicked(); } } , false);
		shared.DOM.modalsClose.forEach(function(d){ d.addEventListener("click", modals.hideAndClear_all, false); });

		// Get the apps list from the DB.
		funcs.getAppsList();
	},
	// Holds the DOM cache.
	DOM : {
	},
	// Used for making requests to the server API.
	serverRequest       : function( formData, autoDarken ){
		if(autoDarken==undefined){ autoDarken=true; }
		return new Promise(function(resolve, reject) {
			// Event handlers.
			var finished = function() {
				if(autoDarken){
					shared.DOM.entireBodyDiv.classList.remove("show");
					shared.DOM.progressbarDiv.classList.remove("show");
				}

				if(this.status !=200){
					console.log(this.status);
					reject(this.status);
				}
				else{
					resolve(JSON.parse(this.responseText));
				}
			};
			var error = function(data) {
				reject({
					type: data.type,
					xhr: xhr
				});
			};

			// Create the form.
			var fd = new FormData();
			var o = formData.o ;

			for (var prop in formData) {
				fd.append(prop , formData[prop] ); }

				var xhr = new XMLHttpRequest();
				xhr.addEventListener("load", finished);
				xhr.addEventListener("error", error);
				xhr.open("POST", formData._p+"/o=" +o+ "?r=" + (new Date()).getTime(), true);

				if(autoDarken){
					shared.DOM.entireBodyDiv.classList.add("show");
					shared.DOM.progressbarDiv.classList.add("show");
				}

				setTimeout(function() { xhr.send(fd); }, 1);
			});
	},
};

//
var funcs = {
	// APPLICATIONS

	showHideRunButton : function(){
		// Clear the output.
		shared.DOM.output_text.innerText="";
		shared.DOM.output_text.innerHTML="";

		if     (this.id=="cmd_select"){
			let select  = shared.DOM.cmd_select;
			let select2 = shared.DOM.app_select;

			let canrunfromweb = parseInt(select.options[select.selectedIndex].getAttribute("canrunfromweb"),10);

			if(canrunfromweb){
				shared.DOM.cmd_run.classList.remove("run_hidden");
				shared.DOM.sshPhpInstructions.classList.remove("show");
				shared.DOM.output.classList.remove("hide");
			}
			else             {
				shared.DOM.cmd_run.classList.add("run_hidden");
				shared.DOM.sshPhpInstructions.classList.add("show");
				shared.DOM.output.classList.add("hide");

				shared.DOM.selected_appid.innerHTML=select2.value;
				shared.DOM.selected_cmdid.innerHTML=select.value;
			}
		}
		else if(this.id=="cmd_select_base"){
			let select = shared.DOM.cmd_select_base;
			let canrunfromweb = parseInt(select.options[select.selectedIndex].getAttribute("canrunfromweb"),10);
			if(canrunfromweb){
				shared.DOM.cmd_run_base.classList.remove("run_hidden");
			}
			else             {
				shared.DOM.cmd_run_base.classList.add("run_hidden");
			}
		}
		else { return; }
	},

	resort_cmds : function(){
		let table = shared.DOM.modal_cmd_reorder_table ;

		let updatedData = [];

		for(let i=0; i<table.rows.length; i+=1){
			// Skip the first row.
			if(i==0){ continue; }

			let row = table.rows[i];
			let sortorder = row.querySelector("td:nth-child(1) input").value;
			let appid     = row.querySelector("td:nth-child(2) ").innerText;
			let comid     = row.querySelector("td:nth-child(3) ").innerText;
			let label     = row.querySelector("td:nth-child(4) ").innerText;

			updatedData.push({
				"sortorder" : sortorder ,
				"appid"     : appid     ,
				"comid"     : comid     ,
				// "label"     : label     ,
			});
			// console.log(
				// 	"sortorder:", sortorder ,
				// 	", appid:",    appid     ,
				// 	", comid:",   comid     ,
			// 	", label:",     label     ,
			// 	""
			// );
		}

		var formData = {
			'_p'          : 'api/api_p.php'        ,
			'o'           : 'massReorder_commands' ,
			'updatedData' : JSON.stringify(updatedData)            ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){
				// funcs.display_apps(res.data);
				// window.reload();
				// funcs.getAppData();
				modals.hideAndClear_all();
				shared.DOM.entireBodyDiv.classList.remove("show");
				shared.DOM.modal_new_cmd.classList.remove("show");
				funcs.getAppData();
			},
			function(){}
		);

	},
	// Get the apps list from the database.
	getAppsList : function(){
		// Get the apps list from the DB.
		var formData = {
			'_p'        : 'api/api_p.php' ,
			'o'         : 'getAppsList' ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){ funcs.display_apps(res.data); },
			function(){}
		);
	},
	// Populate the apps list.
	display_apps : function(json){
		let select = shared.DOM.app_select;
		select.length=1;
		let option;
		let len = json.length;
		let frag = document.createDocumentFragment();

		let defaultAppid=undefined;

		for(let i=0; i<len; i+=1){
			let row = json[i];
			option=document.createElement("option");
			option.value=row.appid;
			option.text=row.appname + " -- " + row.description + (row.default==1 ? " (DEFAULT)" : "");
			option.setAttribute("appname"    , row.appname);
			option.setAttribute("appspath"   , row.appspath);
			option.setAttribute("appcodepath", row.appcodepath);

			if( undefined==defaultAppid && row.default=="1" ){ defaultAppid=row.appid; };

			frag.appendChild(option);
		}
		select.appendChild(frag);

		if(undefined != defaultAppid){
			select.value=defaultAppid;
			funcs.getAppData();
		};
	},
	// Create new app.
	create_app : function(){
		let appname     = shared.DOM.modal_new_app_appname.value     ;
		let description = shared.DOM.modal_new_app_description.value ;
		let appcodepath = shared.DOM.modal_new_app_appcodepath.value ;
		let appspath    = appname.replace(/[\W_]+/g,"_").replace(/ /g, "_");

		var formData = {
			'_p'         : 'api/api_p.php' ,
			'o'          : 'app_new'       ,
			'appname'    : appname         ,
			'description': description     ,
			'appspath'   : appspath        ,
			'appcodepath': appcodepath     ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){
				modals.hideAndClear_all();
				shared.DOM.app_select.length = 1  ;
				shared.DOM.app_select.value  = "" ;
				shared.DOM.cmd_select.length = 1  ;
				shared.DOM.cmd_select.value  = "" ;
				funcs.getAppsList();
			},
			function(){}
		);

	},
	// Get the command list and data for the selected app.
	getAppData : function(){
		let app_select = shared.DOM.app_select;
		let app_selected = app_select.options[app_select.selectedIndex];

		var formData = {
			'_p'        : 'api/api_p.php'    ,
			'o'         : 'getAppData'       ,
			'appid'     : app_selected.value ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){
				funcs.display_cmds(res.data);
			},
			function(){}

	);

	},
	// Populate the command list for the specific app.
	display_cmds : function(json){
		let select = shared.DOM.cmd_select;
		let prevSelectValue = select.value;
		let prevSelectLength = select.options.length;

		select.length=1;
		let option;
		let len = json.length;
		let frag = document.createDocumentFragment();

		for(let i=0; i<len; i+=1){
			let row = json[i];
			option=document.createElement("option");
			option.value=row.commandId;

			// option.text=row.label + " (U:"+(row.lastuse?row.lastuse:'UNUSED')+", C:"+row.created+")";

			let canrunfromweb = parseInt(row.canrunfromweb,10) ;
			if(canrunfromweb){ option.text = "(WEB) => " + row.label; }
			else             { option.text = "(CMD) => " + row.label; }

			option.setAttribute("appId"        , row.appId        );
			option.setAttribute("command"      , row.command      );
			option.setAttribute("sortorder"    , row.sortorder    );
			option.setAttribute("canrunfromweb", row.canrunfromweb);
			option.setAttribute("_label"       , row.label        );

			frag.appendChild(option);
		}
		select.appendChild(frag);

		if(prevSelectLength == select.options.length){
			select.value = prevSelectValue;
		}
	},

	// display_app_commands : function(){
	// 	shared.DOM.cmd_select.length=1;
	// },

	// COMMANDS

	//
	// let cmd_canrunfromweb = shared.DOM.modal_edit_cmd_canrunfromweb.checked ? true : false;
	// shared.DOM.modal_new_cmd_canrunfromweb
	//

	// Edit existing command for the selected app.
	edit_cmd : function(){
		let app_select = shared.DOM.app_select;
		let cmd_select = shared.DOM.cmd_select;

		let appid         = parseInt(shared.DOM.modal_edit_cmd.querySelector(".modal_app_appid"      ).innerText, 10);
		let comid         = parseInt(shared.DOM.modal_edit_cmd.querySelector(".modal_app_comid"      ).innerText, 10);
		let cmd_label     = shared.DOM.modal_edit_cmd_label   ;
		let cmd_command   = shared.DOM.modal_edit_cmd_command ;
		let cmd_sortorder = parseInt(shared.DOM.modal_edit_cmd_sortorder.value,10);
		let cmd_canrunfromweb = shared.DOM.modal_edit_cmd_canrunfromweb.checked ? 1 : 0;

		// Make sure there is an app id and that it matches the selected appid.
		if(! ((appid==app_select.value) && app_select.value!="" && appid!="") ){ alert("Error: Unmatched/missing appid."); return; }

		// Make sure there is a value for the command id and that the same id is selected.
		if(! ((comid==cmd_select.value) && cmd_select.value!="" && comid!="") ){ alert("Error: Unmatched/missing comid."); return; }

		// Make sure that a value for cmd_label was entered.
		if(! (cmd_label.value.length) ){ alert("Error: Missing value for label."); return; }

		// Make sure that a value for cmd_command was entered.
		if(! (cmd_command.value.length) ){ alert("Error: Missing value for command."); return; }

		// Make sure that a value for cmd_command was entered.
		if(  cmd_sortorder.value == "" ){ alert("Error: Missing value for sortorder."); return; }

		var formData = {
			'_p'            : 'api/api_p.php'    ,
			'o'             : 'command_edit'     ,
			'appid'         : appid              ,
			'comid'         : comid              ,
			'label'         : cmd_label.value    ,
			'command'       : cmd_command.value  ,
			'sortorder'     : cmd_sortorder      ,
			'canrunfromweb' : cmd_canrunfromweb  ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){
				modals.hideAndClear_all();
				shared.DOM.entireBodyDiv.classList.remove("show");
				shared.DOM.modal_new_cmd.classList.remove("show");
				funcs.getAppData();
			},
			function(){}
		);

	},
	// Create new command for the selected app.
	create_cmd : function(){
		let app_select = shared.DOM.app_select;
		// let app_selected = app_select.options[app_select.selectedIndex];

		let appid=parseInt(shared.DOM.modal_new_cmd.querySelector(".modal_app_appid"      ).innerText, 10);
		let cmd_label   = shared.DOM.modal_new_cmd_label   ;
		let cmd_command = shared.DOM.modal_new_cmd_command ;
		let cmd_canrunfromweb = shared.DOM.modal_new_cmd_canrunfromweb ;

		// Make sure there is an app id and that it matches the selected appid.
		if(! ((appid==app_select.value) && app_select.value!="" && appid!="") ){ alert("Error: Unmatched/missing appid."); return; }

		// Make sure that a value for cmd_label was entered.
		if(! (cmd_label.value.length) ){ alert("Error: Missing value for label."); return; }

		// Make sure that a value for canrunfromweb was entered.
		if(! (cmd_command.value.length) ){ alert("Error: Missing value for command."); return; }

		var formData = {
			'_p'      : 'api/api_p.php' ,
			'o'       : 'command_new'   ,
			'appid'   : appid           ,
			'label'   : cmd_label.value   ,
			'command' : cmd_command.value ,
			'canrunfromweb' : cmd_canrunfromweb.checked ? 1 : 0 ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){
				modals.hideAndClear_all();
				shared.DOM.entireBodyDiv.classList.remove("show");
				shared.DOM.modal_new_cmd.classList.remove("show");
				funcs.getAppData();
			},
			function(){}
		);

	},
	// Run the selected custom command for the selected app.
	cmd_run : function(){
		let app_select = shared.DOM.app_select;
		let cmd_select = shared.DOM.cmd_select;

		// Make sure that both an app and a command are selected.
		if(app_select.value==""){ alert("Error: An application was not selected."); return; }
		if(cmd_select.value==""){ alert("Error: A command was not selected.");      return; }

		//
		let canrunfromweb = parseInt(cmd_select.options[cmd_select.selectedIndex].getAttribute("canrunfromweb"),10);
		if(!canrunfromweb){
			alert("ERROR: This command can NOT be run from the web interface.");
			return;
		}

		var formData = {
			'_p'        : 'api/api_p.php'  ,
			'o'         : 'runCommand'     ,
			'appid'     : app_select.value ,
			'commandid' : cmd_select.value ,
			'canrunfromweb' : canrunfromweb ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){
				// modals.hideAndClear_all();
				// shared.DOM.entireBodyDiv.classList.remove("show");
				// shared.DOM.modal_new_cmd.classList.remove("show");
				shared.DOM.output_text.innerHTML=res.output;
			},
			function(){}
		);

	},
	// Run the selected base command for the selected app.
	cmd_run_base : function(){
		let app_select     = shared.DOM.app_select;
		let cmd_select = shared.DOM.cmd_select_base;

		// Make sure that both an app and a command are selected.
		if(app_select.value==""){ alert("Error: An application was not selected."); return; }
		if(cmd_select.value==""){ alert("Error: A command was not selected.");      return; }

		var formData = {
			'_p'      : 'api/api_p.php'   ,
			'o'       : 'runCommand_base' ,
			'app'     : app_select.options[app_select.selectedIndex].getAttribute("appspath") ,
			'command' : cmd_select.options[cmd_select.selectedIndex].text ,
		};
		var prom = shared.serverRequest( formData ).then(
			function(res){
				// modals.hideAndClear_all();
				// shared.DOM.entireBodyDiv.classList.remove("show");
				// shared.DOM.modal_new_cmd.classList.remove("show");
				shared.DOM.output_text.innerHTML=res.output;
			},
			function(){}
		);

	},
	// Remove the selected custom command for the selected app.
	cmd_del : function(appid, comid){
		var formData = {
			'_p'    : 'api/api_p.php'  ,
			'o'     : 'command_delete'     ,
			'appid' : app_select.value ,
			'comid' : cmd_select.value ,
		};

		var prom = shared.serverRequest( formData ).then(
			function(res){
				shared.DOM.cmd_select.value = "";
				funcs.getAppData();
			},
			function(){}
		);
	},

	// MODAL CLEAR

	// Hide modals and the entireBodyDiv div.
	entireBodyDiv_clicked : function(){
		if( document.querySelectorAll(".modals.show").length ){
			let conf = confirm("Are you sure you want to close and clear the model?");
			if(!conf){ return; }
			modals.hideAndClear_all();
		}
		shared.DOM.entireBodyDiv  .classList.remove("show");
		shared.DOM.progressbarDiv .classList.remove("show");
	},

	// MISC
	outputWrapping : function(){
		if(this.checked==true){
			shared.DOM.output_text.classList.add("pre_nowrap");
		}
		else{
			shared.DOM.output_text.classList.remove("pre_nowrap");
		}
	}

};

//
var modals = {
	// MODAL CLEAR

	// Hides and clears all modals.
	hideAndClear_all: function(){
		let len = shared.DOM.modals.length;
		for(let i=0; i<len; i+=1){
			// Hide the model.
			shared.DOM.modals[i].classList.remove("show");

			// Clear the values in the modal.
			shared.DOM.modals[i].querySelectorAll("input[type='checkbox']"   ).forEach(function(d){ d.checked=false; });
			shared.DOM.modals[i].querySelectorAll("input[type='text']"   ).forEach(function(d){ d.value=""; });
			shared.DOM.modals[i].querySelectorAll("textarea").forEach(function(d){ d.value=""; });

			// Clear the application title.
			shared.DOM.modals[i].querySelectorAll(".modal_app_appid").forEach(function(d){ d.innerHTML=""; });
			shared.DOM.modals[i].querySelectorAll(".modal_app_appname").forEach(function(d){ d.innerHTML=""; });

			// Clear previous output.
			shared.DOM.output_text.innerHTML="";
		}

		shared.DOM.entireBodyDiv  .classList.remove("show");
		shared.DOM.progressbarDiv .classList.remove("show");

	},

	// APPLICATIONS

	// Shows the new application modal.
	app_new : function(){
		modals.hideAndClear_all();
		shared.DOM.entireBodyDiv.classList.add("show");
		shared.DOM.modal_new_app.classList.add("show");
		shared.DOM.modal_new_app_appname.focus();
	},

	// COMMANDS

	// Shows the new command modal.
	cmd_new : function(){
		modals.hideAndClear_all();

		// Make sure that both an app and a command are selected.
		let app_select = shared.DOM.app_select;
		let app_selected = app_select.options[app_select.selectedIndex];
		if(app_select.value==""){ alert("Error: An application was not selected."); return; }

		// Update the displayed app name for this command.
		shared.DOM.modal_new_cmd.querySelector(".modal_app_appid"  ).innerHTML=app_selected.value;
		shared.DOM.modal_new_cmd.querySelector(".modal_app_appname").innerHTML=app_selected.getAttribute("appname");
		shared.DOM.modal_new_cmd.querySelector(".modal_app_appspath").innerHTML=app_selected.getAttribute("appspath");
		shared.DOM.modal_new_cmd.querySelector(".modal_app_appcodepath").innerHTML=app_selected.getAttribute("appcodepath");

		// Put a default value in for the command.
		let cmd_label   = shared.DOM.modal_new_cmd_label ;
		cmd_label.value="NEW_LABEL";
		let cmd_command = shared.DOM.modal_new_cmd_command ;
		cmd_command.value = "../APPS/runCommand.sh " + app_selected.getAttribute("appspath") + " " + "COMMANDNAME";

		// Set the default value for the canrunfromweb checkbox.
		shared.DOM.modal_new_cmd_canrunfromweb.checked=false;

		// Activate the modal.
		shared.DOM.entireBodyDiv.classList.add("show");
		shared.DOM.modal_new_cmd.classList.add("show");
		shared.DOM.modal_new_cmd_label.focus();
		shared.DOM.modal_new_cmd_label.select();
	},
	// Shows the edit command modal.
	cmd_edit : function(){
		modals.hideAndClear_all();

		// Make sure that both an app and a command are selected.
		let app_select   = shared.DOM.app_select;
		let app_selected = app_select.options[app_select.selectedIndex];
		let cmd_select   = shared.DOM.cmd_select;
		let cmd_selected = cmd_select.options[cmd_select.selectedIndex];
		if(app_select.value==""){ alert("Error: An application was not selected."); return; }
		if(cmd_select.value==""){ alert("Error: A command was not selected.");      return; }

		// Update the displayed app name for this command.
		shared.DOM.modal_edit_cmd.querySelector(".modal_app_appid"  )    .innerHTML=app_selected.value;
		shared.DOM.modal_edit_cmd.querySelector(".modal_app_comid"  )    .innerHTML=cmd_selected.value;
		shared.DOM.modal_edit_cmd.querySelector(".modal_app_appname")    .innerHTML=app_selected.getAttribute("appname");
		shared.DOM.modal_edit_cmd.querySelector(".modal_app_appspath")   .innerHTML=app_selected.getAttribute("appspath");
		shared.DOM.modal_edit_cmd.querySelector(".modal_app_appcodepath").innerHTML=app_selected.getAttribute("appcodepath");

		// Set the existing values for the label and the command.
		shared.DOM.modal_edit_cmd_label    .value=cmd_selected.getAttribute("_label");
		shared.DOM.modal_edit_cmd_command  .value=cmd_selected.getAttribute("command");
		shared.DOM.modal_edit_cmd_sortorder.value=cmd_selected.getAttribute("sortorder");

		// Set the existing value for the canrunfromweb checkbox.
		shared.DOM.modal_edit_cmd_canrunfromweb.checked = parseInt(cmd_selected.getAttribute("canrunfromweb"),10);

		// Activate the modal.
		shared.DOM.entireBodyDiv.classList.add("show");
		shared.DOM.modal_edit_cmd.classList.add("show");

		// Focus the command box.
		shared.DOM.modal_edit_cmd_command.focus();
		shared.DOM.modal_edit_cmd_command.select();
	},
	// Shows the command deletion confirmation prompt.
	cmd_del : function(){
		// cmd_del
		let app_select   = shared.DOM.app_select;
		let cmd_select   = shared.DOM.cmd_select;
		let cmd_selected = cmd_select.options[cmd_select.selectedIndex];

		if(app_select.value==""){ alert("Error: An application was not selected."); return; }
		if(cmd_select.value==""){ alert("Error: A command was not selected.");      return; }

		let str = "Are you sure that you want to delete the selected command?\n";
		str    += "LABEL: " + cmd_selected.getAttribute("_label");

		let conf = confirm(str);
		if(!conf){ return; }

		funcs.cmd_del(app_select.value, cmd_selected.value);
	},

	// Shows all commands for the selected app. Allows for mass update of their sortorders.
	resort_cmds : function(){
		// Make sure that both an app and a command are selected.
		let app_select   = shared.DOM.app_select;
		let app_selected = app_select.options[app_select.selectedIndex];
		let cmd_select   = shared.DOM.cmd_select;
		let cmd_selected = cmd_select.options[cmd_select.selectedIndex];
		if(app_select.value==""){ alert("Error: An application was not selected."); return; }
		// if(cmd_select.value==""){ alert("Error: A command was not selected.");      return; }

		// shared.DOM.modal_cmd_reorder_table
		// shared.DOM.edit_cmd_sort

		let APP_NAME    = app_select.options[app_select.selectedIndex].getAttribute("appname")     ;
		let APP_ID      = app_select.options[app_select.selectedIndex].getAttribute("value")       ;
		let APPSPATH    = app_select.options[app_select.selectedIndex].getAttribute("appspath")    ;
		let APPCODEPATH = app_select.options[app_select.selectedIndex].getAttribute("appcodepath") ;

		shared.DOM.modal_sort_cmds.querySelector(".modal_app_appname")    .innerHTML = APP_NAME    ;
		shared.DOM.modal_sort_cmds.querySelector(".modal_app_appid")      .innerHTML = APP_ID      ;
		shared.DOM.modal_sort_cmds.querySelector(".modal_app_appspath")   .innerHTML = APPSPATH    ;
		shared.DOM.modal_sort_cmds.querySelector(".modal_app_appcodepath").innerHTML = APPCODEPATH ;

		var table    = shared.DOM.modal_cmd_reorder_table;
		for(let i = table.rows.length - 1; i > 0; i--){ table.deleteRow(i); }
		var fragTable=document.createDocumentFragment();

		// Go through the command list. Get commandid value, appid, and label.
		for(let i=0; i<cmd_select.options.length; i+=1){
			// Skip blank entries.
			if( ! cmd_select.options[i].value && cmd_select.options[i].value != "0" ) {
				console.log("Skipping the blank entry.", cmd_select.options[i]);
				continue;
			}

			let value     = cmd_select.options[i].getAttribute("value")     ;
			let appid     = cmd_select.options[i].getAttribute("appid")     ;
			let label     = cmd_select.options[i].getAttribute("_label")    ;
			let sortorder = cmd_select.options[i].getAttribute("sortorder") ;

			var temp_tr   = document.createElement("tr");
			var temp_sortorder  = document.createElement("td"); temp_tr.appendChild(temp_sortorder);
			var temp_appid      = document.createElement("td"); temp_tr.appendChild(temp_appid);
			var temp_value      = document.createElement("td"); temp_tr.appendChild(temp_value);
			var temp_label      = document.createElement("td"); temp_tr.appendChild(temp_label);

			temp_sortorder.innerHTML = '<input type="number" onclick="this.select();" class="cmds_sortorder" min="1" max="1000" step="1" value="'+sortorder+'"></input>' ;

			temp_appid    .innerText = appid    ;
			temp_value    .innerText = value    ;
			temp_label    .innerText = label    ;

			fragTable.appendChild(temp_tr);
		}
		table.appendChild(fragTable);

		// Activate the modal.
		shared.DOM.entireBodyDiv.classList.add("show");
		shared.DOM.modal_sort_cmds.classList.add("show");

		// Focus the command box.
		table.querySelector("input").focus();
		table.querySelector("input").select();
	},
};

//
window.onload=function(){
	// Remove the onload listener.
	window.onload=null;

	// Init the program.
	shared.init();
};