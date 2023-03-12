// SECTION/GROUP/COMMAND EDITOR.
_APP.editor = {
    parent: null,

    // Navigation tabs/views for the editor.
    nav: {
        parent: null,
        defaultTabKey: null,
        tabs:{},
        views:{},

        hideAllViews: function(){
            // Deactivate all tabs and views. 
            for(let key in this.tabs) { this.tabs[key].classList.remove("active"); }
            for(let key in this.views){ this.views[key].classList.remove("active"); }
        },

        showOneView: function(tabKey){
            // Deactivate all tabs and views. 
            this.hideAllViews();

            // Get the tab and the view.
            let tabElem  = this.tabs [ tabKey ];
            let viewElem = this.views[ tabKey ];

            // Set the active class for this tab and view. 
            tabElem .classList.add("active");
            viewElem.classList.add("active");
        },

        init : function(configObj){
            // Load from config.
            this.defaultTabKey = configObj.defaultTabKey;
            for(let key in configObj.tabs){ this.tabs[key] = configObj.tabs[key]; }
            for(let key in this.tabs){
                if(typeof this.tabs[key] == "string"){ 
                    this.tabs[key]  = document.getElementById( this.tabs[key] ); 
                    this.views[key] = document.getElementById( this.tabs[key].getAttribute("view") ); 
                }
            }

            // Deactivate all tabs and views. 
            this.hideAllViews();

            // Add event listeners to the tabs.
            for(let key in this.tabs){
                this.tabs[key].addEventListener("click", () => this.showOneView(key), false); 
            }
    
            // Show the default view.
            this.showOneView(this.defaultTabKey);
        },
    },

    // Governs the select menus at the top for section/group/command.
    selects: {
        parent:null,
        DOM:{},

        // POPULATES. (creates options for a select menu.)
        populate_sections: function(){
            let frag = document.createDocumentFragment();
            let option;
            let count = 0;
            for(let i=0; i<this.parent.parent.commands.sections.length; i+=1){
                let rec = this.parent.parent.commands.sections[i];
                count += 1;
                option = document.createElement("option");
                option.value = `${rec.sId}`;
                option.innerText = `(${("S:"+rec.sId)}) ${rec.name}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }

            // Change the text on the first option. 
            this.DOM["section_select"].options[0].innerText = `...Sections (${count})`;
            
            // Remove all options other than the first. 
            this.DOM["section_select"].options.length = 1;  
            
            // Append the new options. 
            this.DOM["section_select"].append(frag);
        },

        populate_groups: function(sId){
            let frag = document.createDocumentFragment();
            let option;
            let count = 0;
            for(let i=0; i<this.parent.parent.commands.groups.length; i+=1){
                let rec = this.parent.parent.commands.groups[i];
                if(rec.sId != sId){ continue; }
                count += 1;
                option = document.createElement("option");
                option.value = `${rec.gId}`;
                option.innerText = `(${("G:"+rec.gId)}) ${rec.name}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }

            // Change the text on the first option. 
            this.DOM["group_select"].options[0].innerText = `...Groups (${count})`;

            // Remove all options other than the first. 
            this.DOM["group_select"].options.length = 1;  
            
            // Append the new options. 
            this.DOM["group_select"].append(frag);
        },

        populate_commands: function(gId){
            // console.log("populate_commands:", gId);
            let frag = document.createDocumentFragment();
            let option;
            let count = 0;
            for(let i=0; i<this.parent.parent.commands.commands.length; i+=1){
                let rec = this.parent.parent.commands.commands[i];
                if(rec.gId != gId){ continue; }
                count += 1;
                option = document.createElement("option");
                option.value = `${rec.cId}`;
                option.innerText = `(${("C:"+rec.cId)}) ${rec.title}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }

            // Change the text on the first option. 
            this.DOM["command_select"].options[0].innerText = `...Commands (${count})`;

            // Remove all options other than the first. 
            this.DOM["command_select"].options.length = 1;  

            // Append the new options. 
            this.DOM["command_select"].append(frag);
        },

        // Display a command in the command editor after selecting from the commands select menu.
        populate_command: function(cId){
            this.parent.commands.display(cId);
        },

        // Populate/set section/group/command selects based on a specified cId.
        populateSelectsBy_cId: function(cId){
            // Get the record by cId.
            let rec = this.parent.parent.commands.commands.find(d=>d.cId == cId);

            // Change the section select.
            this.DOM["section_select"].value = rec.sId;
            this.DOM["section_select"].dispatchEvent(new Event("change")); 
            
            // Change the group select.
            this.DOM["group_select"].value = rec.gId;
            this.DOM["group_select"].dispatchEvent(new Event("change")); 
            
            // Change the command select.
            this.DOM["command_select"].value = rec.cId;
            this.DOM["command_select"].dispatchEvent(new Event("change")); 
        },

        // CHANGES.
        sectionChange:function(sId){
            // console.log("sectionChange: sId:", sId);
            if(!sId){ 
                console.log("sectionChange: No sId. Will clear this editor.");

                this.parent.sections.disableEditorTableActions();
                this.parent.groups.disableEditorTableActions();
                this.parent.commands.disableEditorTableActions();

                this.parent.sections.clearEditorTable();
                this.parent.groups.clearEditorTable();
                this.parent.commands.clearEditorTable();

                this.populate_sections(null);
                this.populate_groups(null);
                this.populate_commands(null);
                return; 
            }

            // Clear/reset group select.
            this.DOM["group_select"].length = 1;
            this.DOM["group_select"].selectedIndex = 0;
            
            // Clear/reset command select.
            this.DOM["command_select"].options[0].innerText = `...Commands`;
            this.DOM["command_select"].length = 1;
            this.DOM["command_select"].selectedIndex = 0;

            // Clear the editor tables.
            this.parent.sections.clearEditorTable();
            this.parent.groups.clearEditorTable();
            this.parent.commands.clearEditorTable();
            
            // Enable the editor table actions. 
            this.parent.sections.enableEditorTableActions();
            // this.parent.groups.enableEditorTableActions();
            // this.parent.commands.enableEditorTableActions();
            
            // Disable the editor table actions. 
            // this.parent.sections.disableEditorTableActions();
            this.parent.groups.disableEditorTableActions();
            this.parent.commands.disableEditorTableActions();

            // Populate.
            this.parent.sections.display(sId);
            this.populate_groups(sId);

            // Show the Section Editor tab and view. 
            this.parent.nav.showOneView( "section" );
        },

        groupChange:function(gId){
            // console.log("groupChange: gId:", gId);
            if(!gId){ 
                // console.log("groupChange: No gId. Will clear this editor.");
                this.parent.groups.clearEditorTable();
                this.parent.groups.disableEditorTableActions();
                this.parent.commands.clearEditorTable();
                this.parent.commands.disableEditorTableActions();
                this.populate_commands(null);
                return; 
            }

            // Clear/reset command select.
            this.DOM["command_select"].length = 1;
            this.DOM["command_select"].selectedIndex = 0;
            
            // Clear the editor tables.
            // this.parent.sections.clearEditorTable();
            this.parent.groups.clearEditorTable();
            this.parent.commands.clearEditorTable();

            // Enable the editor table actions. 
            // this.parent.sections.enableEditorTableActions();
            this.parent.groups.enableEditorTableActions();
            // this.parent.commands.enableEditorTableActions();
            
            // Disable the editor table actions. 
            // this.parent.sections.disableEditorTableActions();
            // this.parent.groups.disableEditorTableActions();
            this.parent.commands.disableEditorTableActions();

            // Populate the group edit table.
            this.parent.groups.display(gId);

            // Populate.
            this.populate_commands(gId);

            // Show the Group Editor tab and view. 
            this.parent.nav.showOneView( "group" );
        },

        commandChange:function(cId){
            // console.log("commandChange: cId:", cId);
            if(!cId){ 
                // console.log("commandChange: No cId. Will clear this editor.");
                this.parent.commands.clearEditorTable();
                this.parent.commands.disableEditorTableActions();
                return; 
            }

            // Clear the editor tables.
            // this.parent.sections.clearEditorTable();
            // this.parent.groups.clearEditorTable();
            this.parent.commands.clearEditorTable();

            // Enable the editor table actions. 
            // this.parent.sections.enableEditorTableActions();
            // this.parent.groups.enableEditorTableActions();
            this.parent.commands.enableEditorTableActions();
            
            // Disable the editor table actions. 
            // this.parent.sections.disableEditorTableActions();
            // this.parent.groups.disableEditorTableActions();
            // this.parent.commands.disableEditorTableActions();

            // Display command.
            this.populate_command(cId);

            // Show the Command Editor tab and view. 
            this.parent.nav.showOneView( "command" );
        },

        // DEFAULT SELECTIONS.
        selectDefault: function(){
            // Pick the first section (if options has length > 1).
            if(this.DOM["section_select"].options.length > 1){ 
                this.DOM["section_select"].selectedIndex = 1; 
                this.DOM["section_select"].dispatchEvent(new Event("change")); 
            }
            
            // Pick the first group (if options has length > 1).
            if(this.DOM["group_select"].options.length > 1){
                this.DOM["group_select"].selectedIndex = 1; 
                this.DOM["group_select"].dispatchEvent(new Event("change")); 
            }
            
            // Pick the first command (if options has length > 1).
            if(this.DOM["command_select"].options.length > 1){
                this.DOM["command_select"].selectedIndex = 1; 
                this.DOM["command_select"].dispatchEvent(new Event("change")); 
            }
        },

        // INIT
        init: function(configObj){
            // Load from config.
            for(let key in configObj.DOM){ this.DOM[key] = configObj.DOM[key]; }
            for(let key in this.DOM){
                if(typeof this.DOM[key] == "string"){ 
                    this.DOM[key]  = document.getElementById( this.DOM[key] ); 
                }
            }

            // When changing section:
            this.DOM["section_select"].addEventListener("change", (ev)=>{ this.sectionChange(ev.target.value); }, false);

            // When changing group:
            this.DOM["group_select"]  .addEventListener("change", (ev)=>{ this.groupChange  (ev.target.value); }, false);
            
            // When changing command:
            this.DOM["command_select"].addEventListener("change", (ev)=>{ this.commandChange(ev.target.value); }, false);

            // Populate the sections select.
            this.populate_sections();

            // Select the first options from each select.
            // this.selectDefault();
        },
    },

    // Section Editor
    sections: {
        parent: null,
        editor_table:{},
        actions: {},

        clearEditorTable          : function(){
            this.editor_table.id   .innerText = ``;
            this.editor_table.name .value     = ``;
            this.editor_table.order.value     = ``;
        },

        disableEditorTableActions : function(){
            // return true; 
            // console.log("disableEditorTableActions", this.editor_table, this.actions.add);
            
            // this.editor_table.table.classList.add("disabled");
            // this.actions.add   .classList.add("disabled");
            this.actions.reset .classList.add("disabled");
            this.actions.remove.classList.add("disabled");
            this.actions.update.classList.add("disabled");
        },

        enableEditorTableActions : function(){
            // return true; 
            // console.log("enableEditorTableActions");
            this.editor_table.table.classList.remove("disabled");
            this.actions.add   .classList.remove("disabled");
            this.actions.reset .classList.remove("disabled");
            this.actions.remove.classList.remove("disabled");
            this.actions.update.classList.remove("disabled");
        },

        update: async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
            let obj = {
                // Needed to update the record. 
                sId: Number(this.parent.selects.DOM["section_select"].value),
                
                // Data that the record will be updated with.
                updated: {
                    name : this.editor_table.name .value,
                    order: Number(this.editor_table.order.value),
                },
            };

            // Request the server to update the group. 
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"UPDATE_ONE_SECTION", data: obj } ) );
        },

        add   : async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            let obj = {
                // Data for the new group.
                added: {
                    name  : "NEW - CHANGE ME",
                },
            };

            // Request the server to add the group. 
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"ADD_ONE_SECTION", data: obj } ) );
        },

        remove: async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            // Get the selected sId.
            let sId = this.parent.selects.DOM["section_select"].value;

            // Search for commands that are associated with this gId.
            let grps = this.parent.parent.commands.groups.filter(d=>d.sId == sId);
            if(grps.length){
                alert(
                    `ERROR: ${grps.length} groups(s) are associated to this section.\n\n` +
                    `You must delete those groups before removing this section.`
                );
                return;
            }

            // Break-out the names/title for the removal confirmation. 
            let sectionName  = this.parent.selects.DOM["section_select"].options[this.parent.selects.DOM["section_select"].selectedIndex].innerText;
            
            // Confirm.
            if( !confirm(
                `Are you sure that you want to remove the section:\n` +
                ` sectionName : ${sectionName}\n`
            ) ){ return; }

            let obj = {
                // Ids of the record that will be removed.
                removed: {
                    sId : Number(this.parent.selects.DOM["section_select"].value), 
                },
            };

            // Request the server to remove the command.
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"REMOVE_ONE_SECTION", data: obj } ) );
        },

        display: async function(sId){
            let rec = this.parent.parent.commands.sections.find(d=>d.sId == sId);
            this.editor_table.id   .innerText = `sId: ${rec.sId}`;
            this.editor_table.name .value     = rec.name;
            this.editor_table.order.value     = rec.order;
        },

        //
        findSectionIndexBy_sId: function(sId){
            for(let i=0; i<this.parent.parent.commands.sections.length; i+=1){
                if(this.parent.parent.commands.sections[i].sId == sId){ return i; }
            }
            return false;
        },

        init: function(configObj){
            // Load from config.
            for(let key in configObj.editor_table){ this.editor_table[key] = configObj.editor_table[key]; }
            for(let key in configObj.actions){ this.actions[key] = configObj.actions[key]; }
            for(let key in this.editor_table){ if(typeof this.editor_table[key] == "string"){ this.editor_table[key] = document.getElementById( this.editor_table[key] ); } }
            for(let key in this.actions)     { if(typeof this.actions[key]      == "string"){ this.actions[key]      = document.getElementById( this.actions[key] ); } }

            // Event listeners for actions. 
            this.actions.add    .addEventListener("click", ()=> { 
                this.add();
            }, false);

            this.actions.reset  .addEventListener("click", ()=> {
                this.display( Number(this.parent.selects.DOM.section_select.value) );
            }, false);

            this.actions.remove .addEventListener("click", ()=> { 
                this.remove();
            }, false);

            this.actions.update .addEventListener("click", ()=> { 
                this.update();
            }, false);
        },

    },

    // Group Editor
    groups: {
        parent: null,
        editor_table:{},
        actions: {},

        clearEditorTable          : function(){
            this.editor_table.id   .innerText = ``;
            this.editor_table.section.value   = "";
            this.editor_table.name .value     = ``;
            this.editor_table.order.value     = ``;
        },

        disableEditorTableActions : function(){
            // return true; 
            // console.log("disableEditorTableActions");
            this.editor_table.table.classList.add("disabled");
            this.actions.add   .classList.add("disabled");
            this.actions.reset .classList.add("disabled");
            this.actions.remove.classList.add("disabled");
            this.actions.update.classList.add("disabled");
        },

        enableEditorTableActions : function(){
            // return true; 
            // console.log("enableEditorTableActions");
            this.editor_table.table.classList.remove("disabled");
            this.actions.add   .classList.remove("disabled");
            this.actions.reset .classList.remove("disabled");
            this.actions.remove.classList.remove("disabled");
            this.actions.update.classList.remove("disabled");
        },

        //
        update: async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
            let obj = {
                // Needed to update the record. 
                gId: Number(this.parent.selects.DOM["group_select"].value),
                
                // Data that the record will be updated with.
                updated: {
                    sId  : Number(this.editor_table.section.value), 
                    name : this.editor_table.name .value,
                    order: Number(this.editor_table.order.value),
                },
            };
            
            // Request the server to update the group. 
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"UPDATE_ONE_GROUP", data: obj } ) );
        },

        // 
        add   : async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            let obj = {
                // Data for the new group.
                added: {
                    sId   : Number(this.parent.selects.DOM["section_select"].value), 
                    gId   : null, 
                    name  : "NEW - CHANGE ME",
                },
            };

            // Request the server to add the group. 
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"ADD_ONE_GROUP", data: obj } ) );
        },
        
        // 
        remove: async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            // Get the selected gId.
            let gId = this.parent.selects.DOM["group_select"].value;

            // Search for commands that are associated with this gId.
            let cmds = this.parent.parent.commands.commands.filter(d=>d.gId == gId);
            if(cmds.length){
                alert(
                    `ERROR: ${cmds.length} command(s) are associated to this group.\n\n` +
                    `You must either move those commands to other groups or delete those commands ` + 
                    `before removing this group.`
                );
                return;
            }

             // Break-out the names/title for the removal confirmation. 
             let sectionName  = this.parent.selects.DOM["section_select"].options[this.parent.selects.DOM["section_select"].selectedIndex].innerText;
             let groupName    = this.parent.selects.DOM["group_select"].options[this.parent.selects.DOM["group_select"].selectedIndex].innerText;
             
             // Confirm.
             if( !confirm(
                 `Are you sure that you want to remove the group:\n` +
                 ` sectionName : ${sectionName}\n` +
                 ` groupName   : ${groupName} ?`
             ) ){ return; }

             let obj = {
                // Ids of the record that will be removed.
                removed: {
                    sId : Number(this.parent.selects.DOM["section_select"].value), 
                    gId : Number(this.parent.selects.DOM["group_select"].value), 
                },
            };

            // Request the server to remove the command.
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"REMOVE_ONE_GROUP", data: obj } ) );
        },

        display: async function(gId){
            let rec = this.parent.parent.commands.groups.find(d=>d.gId == gId);
            // this.editor_table.section
            // console.log("group display:", gId, rec);

            // Populate the section select menu.
            this.createSectionSelectOptions();

            this.editor_table.id   .innerText = `gId: ${rec.gId}`;
            this.editor_table.section.value   = rec.sId;
            this.editor_table.name .value     = rec.name;
            this.editor_table.order.value     = rec.order;
        },

        //
        findGroupIndexBy_gId: function(gId){
            for(let i=0; i<this.parent.parent.commands.groups.length; i+=1){
                if(this.parent.parent.commands.groups[i].gId == gId){ return i; }
            }
            return false;
        },

        createSectionSelectOptions: function(){
            let frag = document.createDocumentFragment();
            let option;
            for(let i=0; i<this.parent.parent.commands.sections.length; i+=1){
                let rec = this.parent.parent.commands.sections[i];
                option = document.createElement("option");
                option.value = `${rec.sId}`;
                option.innerText = `(${("S:"+rec.sId)}) ${rec.name}`;
                frag.append(option);
            }
            this.editor_table.section.options.length = 1;
            this.editor_table.section.append(frag);
        },

        init: function(configObj){
            // Load from config.
            for(let key in configObj.editor_table){ this.editor_table[key] = configObj.editor_table[key]; }
            for(let key in configObj.actions){ this.actions[key] = configObj.actions[key]; }
            for(let key in this.editor_table){ if(typeof this.editor_table[key] == "string"){ this.editor_table[key] = document.getElementById( this.editor_table[key] ); } }
            for(let key in this.actions)     { if(typeof this.actions[key]      == "string"){ this.actions[key]      = document.getElementById( this.actions[key] ); } }

            // Populate the section select menu.
            this.createSectionSelectOptions();
            
            // Event listeners for actions. 
            this.actions.add    .addEventListener("click", ()=> { this.add(); }, false);
            this.actions.reset  .addEventListener("click", ()=> { this.display( Number(this.parent.selects.DOM.group_select.value) ); }, false);
            this.actions.remove .addEventListener("click", ()=> { this.remove(); }, false);
            this.actions.update .addEventListener("click", ()=> { this.update(); }, false);
        },
    },
    
    // Command Editor
    commands: {
        parent: null,

        // Elements of the command editor table. 
        editor_table:{},

        // Action elements of the command editor table.
        actions: {},

        //
        clearEditorTable          : function(){
            this.editor_table.ids         .innerText = ``;
            this.editor_table.sectionGroup.value     = "";
            this.editor_table.sectionGroup.setAttribute("sId", "");
            this.editor_table.sectionGroup.setAttribute("gId", "");
            this.editor_table.title       .value     = "";
            this.editor_table.cmd         .value     = "";
            this.editor_table.f_ctrlc     .checked   = false;
            this.editor_table.f_enter     .checked   = false;
            this.editor_table.f_hidden    .checked   = false;
            this.editor_table.order       .value     = "";
        },

        disableEditorTableActions : function(){
            // return true; 
            // console.log("disableEditorTableActions");
            this.editor_table.table.classList.add("disabled");
            this.actions.add   .classList.add("disabled");
            this.actions.reset .classList.add("disabled");
            this.actions.remove.classList.add("disabled");
            this.actions.update.classList.add("disabled");
        },

        enableEditorTableActions : function(){
            // return true; 
            // console.log("enableEditorTableActions");
            this.editor_table.table.classList.remove("disabled");
            this.actions.add   .classList.remove("disabled");
            this.actions.reset .classList.remove("disabled");
            this.actions.remove.classList.remove("disabled");
            this.actions.update.classList.remove("disabled");
        },

        //
        update: async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
            
            let cId = Number(this.parent.selects.DOM.command_select.value);

            // Need to get a handle on the actual selected option for sectionGroup.
            let sectionGroup_option = this.editor_table.sectionGroup.options[this.editor_table.sectionGroup.options.selectedIndex];

            let obj = {
                // Needed to update the record. 
                cId:cId,
                
                // Data that the record will be updated with.
                updated: {
                    sId      : Number(sectionGroup_option.getAttribute("sId")), 
                    gId      : Number(sectionGroup_option.getAttribute("gId")), 
                    title    : this.editor_table.title.value,
                    cmd      : this.editor_table.cmd.value,
                    f_ctrlc  : this.editor_table.f_ctrlc .checked ? true : false,
                    f_enter  : this.editor_table.f_enter .checked ? true : false,
                    f_hidden : this.editor_table.f_hidden.checked ? true : false,
                    order    : Number(this.editor_table.order.value),
                },
            };
            
            // Request the server to update the command. 
            // console.log(obj);
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"UPDATE_ONE_COMMAND", data: obj } ) );
        },

        //
        add   : async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            // Ignore existing loaded command. Make a blank command other than having a matching sId and gId.
            let obj = {
                // Data for the new command.
                added: {
                    cId:null,
                    sId      : Number(this.parent.selects.DOM["section_select"].value), 
                    gId      : Number(this.parent.selects.DOM["group_select"].value), 
                    title    : "NEW - CHANGE ME",
                    cmd      : "",
                    f_ctrlc  : false,
                    f_enter  : true,
                    f_hidden : false,
                    order    : 0,
                },
            };
            
            // Request the server to update the command. 
            // console.log(obj);
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"ADD_ONE_COMMAND", data: obj } ) );

            // Requesting the add should automatically display the new command.
            // After that, use the normal update function.
        },

        //
        remove: async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            let obj = {
                // Ids of the record that will be removed.
                removed: {
                    cId : Number(this.parent.selects.DOM["command_select"].value), 
                    sId : Number(this.parent.selects.DOM["section_select"].value), 
                    gId : Number(this.parent.selects.DOM["group_select"].value), 
                },
            };

            // Break-out the names/title for the removal confirmation. 
            let commandTitle = this.parent.selects.DOM["command_select"].options[this.parent.selects.DOM["command_select"].selectedIndex].innerText;
            let sectionName  = this.parent.selects.DOM["section_select"].options[this.parent.selects.DOM["section_select"].selectedIndex].innerText;
            let groupName    = this.parent.selects.DOM["group_select"].options[this.parent.selects.DOM["group_select"].selectedIndex].innerText;
            
            // Confirm.
            if( !confirm(
                `Are you sure that you want to remove the command:\n` +
                ` sectionName : ${sectionName}\n` +
                ` groupName   : ${groupName}\n` + 
                ` commandTitle: ${commandTitle} ?`
            ) ){ return; }

            // Request the server to remove the command.
            this.parent.parent.ws_control.activeWs.send( JSON.stringify( { mode:"REMOVE_ONE_COMMAND", data: obj } ) );
        },

        // This is for the section/group select menu in the command editor. 
        commandSelectPopulates: function(commandRec){
            // Need to repopulate the sectionName and groupName selects.
            this.editor_table.sectionGroup.options.length = 0;

            let frag_sectionGroup = document.createDocumentFragment();
            let option;

            // Determine the longest section name for padding.
            let longest = 0; 
            for(let i=0; i<this.parent.parent.commands.sections.length; i+=1){
                let rec = this.parent.parent.commands.sections[i];
                if(rec.name.length > longest){ longest = rec.name.length; }
            }

            // Create an entry for each group and include it's section name and both the sId and the gId.
            let entries = 1;
            for(let i=0; i<this.parent.parent.commands.sections.length; i+=1){
                let sId = this.parent.parent.commands.sections[i].sId;
                for(let i=0; i<this.parent.parent.commands.groups.length; i+=1){
                    let rec = this.parent.parent.commands.groups[i];
                    if(rec.sId != sId){ continue; }
                    
                    // Get the names. 
                    let sectionName = this.parent.parent.commands.sections.find(d=>d.sId==rec.sId).name;
                    let groupName   = rec.name;

                    // Create the option. 
                    option = document.createElement("option");
                    option.value = entries.toString(); // FAKE VALUE... lookup only. Do NOT send.
                    entries += 1;
                    option.innerText = `` +
                        `${commandRec.gId==rec.gId?"*":decodeURI("%C2%A0")}` +
                        `(${("S:"+rec.sId)}) ${sectionName.padEnd(longest, decodeURI("%C2%A0"))}: ` +
                        `(${("G:"+rec.gId)}) ${groupName}`;
                    option.setAttribute("sId", `${rec.sId}`);
                    option.setAttribute("gId", `${rec.gId}`);
                    frag_sectionGroup.append(option);
                }
            }

            // Append the fragments. 
            this.editor_table.sectionGroup.append(frag_sectionGroup);
        },

        //
        display: async function(cId){
            let rec = this.parent.parent.commands.commands.find(d=>d.cId == cId);

            // let t_table       = this.editor_table.table;
            let t_ids         = this.editor_table.ids;
            let t_sectionGroup   = this.editor_table.sectionGroup;

            let t_title       = this.editor_table.title;
            let t_cmd         = this.editor_table.cmd;
            let t_f_ctrlc     = this.editor_table.f_ctrlc;
            let t_f_enter     = this.editor_table.f_enter;
            let t_f_hidden    = this.editor_table.f_hidden;
            let t_order       = this.editor_table.order;

            this.commandSelectPopulates(rec);

            t_sectionGroup.setAttribute("sId", rec.sId);
            t_sectionGroup.setAttribute("gId", rec.gId);
            let foundIt = false;
            for(let i=0; i<t_sectionGroup.options.length; i+=1){
                let this_sId = Number(t_sectionGroup.options[i].getAttribute("sId"));
                let this_gId = Number(t_sectionGroup.options[i].getAttribute("gId"));
                if(this_sId == rec.sId && this_gId == rec.gId){
                    foundIt = true;
                    t_sectionGroup.selectedIndex = i;
                    break; 
                }
            }
            if(!foundIt){
                console.log("Could not find the matching sId and gId of this command");
                return; 
            }
            
            t_ids        .innerText = `sId: ${rec.sId}, gId: ${rec.gId}, cId: ${rec.cId}`;
            t_title      .value     = rec.title;
            t_cmd        .value     = rec.cmd;
            t_f_ctrlc    .checked   = rec.f_ctrlc  ? true : false;
            t_f_enter    .checked   = rec.f_enter  ? true : false;
            t_f_hidden   .checked   = rec.f_hidden ? true : false;
            t_order      .value     = rec.order;
        },

        //
        findCommandIndexBy_cId: function(cId){
            for(let i=0; i<this.parent.parent.commands.commands.length; i+=1){
                if(this.parent.parent.commands.commands[i].cId == cId){ return i; }
            }
            return false;
        },
        
        //
        init: function(configObj){
            // Load from config.
            for(let key in configObj.editor_table){ this.editor_table[key] = configObj.editor_table[key]; }
            for(let key in configObj.actions){ this.actions[key] = configObj.actions[key]; }
            for(let key in this.editor_table){ if(typeof this.editor_table[key] == "string"){ this.editor_table[key] = document.getElementById( this.editor_table[key] ); } }
            for(let key in this.actions)     { if(typeof this.actions[key]      == "string"){ this.actions[key]      = document.getElementById( this.actions[key] ); } }

            // Event listeners for actions. 
            this.actions.add    .addEventListener("click", ()=> { 
                this.add();
            }, false);

            this.actions.reset  .addEventListener("click", ()=> {
                this.parent.selects.populate_command( Number(this.parent.selects.DOM.command_select.value) );
            }, false);

            this.actions.remove .addEventListener("click", ()=> { 
                this.remove();
            }, false);

            this.actions.update .addEventListener("click", ()=> { 
                this.update();
            }, false);
        },
    },

    // Full editor init.
    init: function(parent, configObj){
        return new Promise(async (resolve,reject)=>{
            // Set the parent object of all the first-level objects within this object. 
            this.parent          = parent;
            this.nav.parent      = this;
            this.selects.parent  = this;
            this.sections.parent = this;
            this.groups.parent   = this;
            this.commands.parent = this;

            // Init the nav.
            this.nav.init(configObj.nav);

            // Section editor.
            this.sections.init(configObj.sections);

            // Group editor.
            this.groups.init(configObj.groups);

            // Command editor.
            this.commands.init(configObj.commands);

            // Init the selects.
            this.selects.init(configObj.selects);

            // Disable all table actions.
            this.sections.disableEditorTableActions();
            this.groups  .disableEditorTableActions();
            this.commands.disableEditorTableActions();

            resolve();
        });
    },
};
