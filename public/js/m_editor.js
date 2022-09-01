// SECTION/GROUP/COMMAND EDITOR.
_APP.editor = {
    parent: null,

    nav: {
        parent: null,
        tabs:[],
        views:[],

        hideAllViews: function(){
            // Deactivate all tabs and views. 
            this.tabs.forEach(d=>{ d.classList.remove("active"); })
            this.views.forEach(d=>{ d.classList.remove("active"); })
        },
        showOneView: function(tabElem){
            // Deactivate all tabs and views. 
            this.hideAllViews();

            // Get the view.
            let viewElem = document.getElementById( tabElem.getAttribute("view") ); 

            // Set the active class for this tab and view. 
            tabElem.classList.add("active");
            viewElem.classList.add("active");
        },
        init : function(){
            // Save the tabs and views. 
            this.tabs =   document.querySelectorAll(`.nav_tab[group='editor']`);
            this.views =  document.querySelectorAll(`.view[group='editor']`);

            // Deactivate all tabs and views. 
            this.hideAllViews();

            // Add event listeners to the tabs.
            this.tabs.forEach( (tab) => tab.addEventListener("click", () => this.showOneView(tab), false) ); 
    
            // Show the Command Editor tab and view. 
            this.showOneView( this.tabs[2] );
        },
    },
    selects: {
        parent:null,
        DOM:{
            // Add objects for each section.
            shared        : {},
            sectionEditor : {},
            groupEditor   : {},
            commandEditor : {},
        },

        // POPULATES.
        populate_sections: function(){
            let frag = document.createDocumentFragment();
            let option;
            let count = 0;
            for(let i=0; i<this.parent.parent.commands.sections.length; i+=1){
                let rec = this.parent.parent.commands.sections[i];
                count +=1;
                option = document.createElement("option");
                option.value = `${rec.sId}`;
                option.innerText = `(${("S:"+rec.sId)}) ${rec.name}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }
            this.DOM.commandEditor["section_select"].options[0].innerText = `...Sections (${count})`;
            this.DOM.commandEditor["section_select"].options.length = 1;  
            this.DOM.commandEditor["section_select"].append(frag);
        },
        populate_groups: function(sId){
            let frag = document.createDocumentFragment();
            let option;
            let count = 0;
            for(let i=0; i<this.parent.parent.commands.groups.length; i+=1){
                let rec = this.parent.parent.commands.groups[i];
                if(rec.sId != sId){ continue; }
                count +=1;

                option = document.createElement("option");
                option.value = `${rec.gId}`;
                // option.innerText = `${rec.name}`;
                option.innerText = `(${("G:"+rec.gId)}) ${rec.name}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }
            this.DOM.commandEditor["group_select"].options[0].innerText = `...Groups (${count})`;
            this.DOM.commandEditor["group_select"].options.length = 1;  
            this.DOM.commandEditor["group_select"].append(frag);
        },
        populate_commands: function(gId){
            let frag = document.createDocumentFragment();
            let option;
            let count = 0;
            for(let i=0; i<this.parent.parent.commands.commands.length; i+=1){
                let rec = this.parent.parent.commands.commands[i];
                if(rec.gId != gId){ continue; }
                count +=1;

                option = document.createElement("option");
                option.value = `${rec.cId}`;
                // option.innerText = `${rec.title}`;
                option.innerText = `(${("C:"+rec.cId)}) ${rec.title}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }
            this.DOM.commandEditor["command_select"].options[0].innerText = `...Commands (${count})`;
            this.DOM.commandEditor["command_select"].options.length = 1;  
            this.DOM.commandEditor["command_select"].append(frag);
        },
        populate_command: function(cId){
            this.parent.commands.display(cId);
        },
        populateSelectsBy_cId: function(cId){
            let rec = this.parent.parent.commands.commands.find(d=>d.cId == cId);

            // Change the section select.
            this.DOM.commandEditor["section_select"].value = rec.sId;
            this.DOM.commandEditor["section_select"].dispatchEvent(new Event("change")); 
            
            // Change the group select.
            this.DOM.commandEditor["group_select"].value = rec.gId;
            this.DOM.commandEditor["group_select"].dispatchEvent(new Event("change")); 
            
            // Change the command select.
            this.DOM.commandEditor["command_select"].value = rec.cId;
            this.DOM.commandEditor["command_select"].dispatchEvent(new Event("change")); 
        },

        // CHANGES.
        sectionChange:function(sId){
            if(!sId){ return; }
            // Clear/reset group select.
            this.DOM.commandEditor["group_select"].length = 1;
            this.DOM.commandEditor["group_select"].selectedIndex = 0;
            
            // Clear/reset command select.
            this.DOM.commandEditor["command_select"].length = 1;
            this.DOM.commandEditor["command_select"].selectedIndex = 0;

            // Clear the editor table.
            this.parent.commands.clearEditorTable();
            
            // Disable the editor table actions. 
            this.parent.commands.disableEditorTableActions();

            // Populate.
            this.populate_groups(sId);
        },
        groupChange:function(gId){
            if(!gId){ return; }
            // Clear/reset command select.
            this.DOM.commandEditor["command_select"].length = 1;
            this.DOM.commandEditor["command_select"].selectedIndex = 0;
            
            // Clear the editor table.
            this.parent.commands.clearEditorTable();

            // Disable the editor table actions. 
            this.parent.commands.disableEditorTableActions();

            // Populate.
            this.populate_commands(gId);
        },
        commandChange:function(cId){
            if(!cId){ return; }
            // Display command.
            this.populate_command(cId);
        },

        // DEFAULT SELECTIONS.
        selectDefault: function(){
            // Pick the first section (if options has length > 1).
            if(this.DOM.commandEditor["section_select"].options.length > 1){ 
                this.DOM.commandEditor["section_select"].selectedIndex = 1; 
                this.DOM.commandEditor["section_select"].dispatchEvent(new Event("change")); 
            }
            
            // Pick the first group (if options has length > 1).
            if(this.DOM.commandEditor["group_select"].options.length > 1){
                this.DOM.commandEditor["group_select"].selectedIndex = 1; 
                this.DOM.commandEditor["group_select"].dispatchEvent(new Event("change")); 
            }
            
            // Pick the first command (if options has length > 1).
            if(this.DOM.commandEditor["command_select"].options.length > 1){
                this.DOM.commandEditor["command_select"].selectedIndex = 1; 
                this.DOM.commandEditor["command_select"].dispatchEvent(new Event("change")); 
            }
        },

        // INIT
        init: function(){
            // Command Editor
            this.DOM.commandEditor["section_select"] = document.getElementById("commandEditor_section_select");
            this.DOM.commandEditor["group_select"]   = document.getElementById("commandEditor_group_select");
            this.DOM.commandEditor["command_select"] = document.getElementById("commandEditor_command_select");

            // When changing section:
            this.DOM.commandEditor["section_select"].addEventListener("change", (ev)=>{ this.sectionChange(ev.target.value); }, false);

            // When changing group:
            this.DOM.commandEditor["group_select"]  .addEventListener("change", (ev)=>{ this.groupChange  (ev.target.value); }, false);
            
            // When changing command:
            this.DOM.commandEditor["command_select"].addEventListener("change", (ev)=>{ this.commandChange(ev.target.value); }, false);

            // Populate the sections select.
            this.populate_sections();

            // Select the first options from each select.
            this.selectDefault();
        },
    },

    // TODO
    sections: {
        parent: null,
        editor_table:{
            table : null,
            id    : null,
            name  : null,
            order : null,
        },
        actions: {
            // Section
            add    : null,
            reset  : null,
            remove : null,
            update : null,
        },
        clearEditorTable          : function(){
            this.editor_table.id   .innerText = ``;
            this.editor_table.name .value     = ``;
            this.editor_table.order.value     = ``;
        },
        // TODO
        disableEditorTableActions : function(){
            return true; 
            console.log("disableEditorTableActions");
            this.actions.add   .classList.add("disabled");
            this.actions.reset .classList.add("disabled");
            this.actions.remove.classList.add("disabled");
            this.actions.update.classList.add("disabled");
        },
        // TODO
        enableEditorTableActions : function(){
            return true; 
            console.log("enableEditorTableActions");
            this.actions.add   .classList.remove("disabled");
            this.actions.reset .classList.remove("disabled");
            this.actions.remove.classList.remove("disabled");
            this.actions.update.classList.remove("disabled");
        },
        update: async function(){},
        add   : async function(){},
        remove: async function(){},
        display: async function(){},
    },
    // TODO
    groups: {
        parent: null,
        editor_table:{
            table : null,
            id    : null,
            name  : null,
            order : null,
        },
        actions: {
            // Section
            add    : null,
            reset  : null,
            remove : null,
            update : null,
        },
        clearEditorTable          : function(){
            this.editor_table.id   .innerText = ``;
            this.editor_table.name .value     = ``;
            this.editor_table.order.value     = ``;
        },
        // TODO
        disableEditorTableActions : function(){
            return true; 
            console.log("disableEditorTableActions");
            this.actions.add   .classList.add("disabled");
            this.actions.reset .classList.add("disabled");
            this.actions.remove.classList.add("disabled");
            this.actions.update.classList.add("disabled");
        },
        // TODO
        enableEditorTableActions : function(){
            return true; 
            console.log("enableEditorTableActions");
            this.actions.add   .classList.remove("disabled");
            this.actions.reset .classList.remove("disabled");
            this.actions.remove.classList.remove("disabled");
            this.actions.update.classList.remove("disabled");
        },
        update: async function(){},
        add   : async function(){},
        remove: async function(){},
        display: async function(){},
    },
    commands: {
        parent: null,
        editor_table:{
            table       : null,
            ids         : null,
            sectionGroup: null,
            title       : null,
            cmd         : null,
            f_ctrlc     : null,
            f_enter     : null,
            f_hidden    : null,
            order       : null,
        },
        actions: {
            add    : null,
            reset  : null,
            remove : null,
            update : null,
        },
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
        // TODO
        disableEditorTableActions : function(){
            return true; 
            console.log("disableEditorTableActions");
            this.actions.add   .classList.add("disabled");
            this.actions.reset .classList.add("disabled");
            this.actions.remove.classList.add("disabled");
            this.actions.update.classList.add("disabled");
        },
        // TODO
        enableEditorTableActions : function(){
            return true; 
            console.log("enableEditorTableActions");
            this.actions.add   .classList.remove("disabled");
            this.actions.reset .classList.remove("disabled");
            this.actions.remove.classList.remove("disabled");
            this.actions.update.classList.remove("disabled");
        },
        update: async function(cId){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }
            
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
        add   : async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            // Ignore existing loaded command. Make a blank command other than having a matching sId and gId and new cId.
            // Requesting the add should automatically display the new command.
            // After that, use the normal update function.
        },
        remove: async function(){
            // Updates require Websockets. 
            if(!this.parent.parent.ws_control.ws_utilities.isWsConnected()){ console.log("WS not connected."); return; }

            // Confirm.

            // Request the server to remove the command.
            // Requesting the removal should automatically display the command at the previous selectedIndex unless it was 0.
            // In that case, select 0.
        },
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
            for(let i=0; i<this.parent.parent.commands.groups.length; i+=1){
                let rec = this.parent.parent.commands.groups[i];
                
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

            // Append the fragments. 
            this.editor_table.sectionGroup.append(frag_sectionGroup);
        },
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
        findCommandIndexBy_cId: function(cId){
            for(let i=0; i<this.parent.parent.commands.commands.length; i+=1){
                if(this.parent.parent.commands.commands[i].cId == cId){ return i; }
            }
            return false;
        },
        
        init: function(){
            // Cache the command editor table DOM.
            this.editor_table.table       = document.getElementById("commandEditor_table");
            this.editor_table.ids         = document.getElementById("commandEditor_table_ids");
            this.editor_table.sectionGroup= document.getElementById("commandEditor_table_sectionGroup");
            this.editor_table.title       = document.getElementById("commandEditor_table_title");
            this.editor_table.cmd         = document.getElementById("commandEditor_table_cmd");
            this.editor_table.f_ctrlc     = document.getElementById("commandEditor_table_f_ctrlc");
            this.editor_table.f_enter     = document.getElementById("commandEditor_table_f_enter");
            this.editor_table.f_hidden    = document.getElementById("commandEditor_table_f_hidden");
            this.editor_table.order       = document.getElementById("commandEditor_table_order");

            // Cache the command editor action buttons. 
            this.actions.add    = document.getElementById("commandEditor_table_add");
            this.actions.reset  = document.getElementById("commandEditor_table_reset");
            this.actions.remove = document.getElementById("commandEditor_table_remove");
            this.actions.update = document.getElementById("commandEditor_table_update");

            // Event listeners for section/group changes for one command.
            // this.commandSelectPopulates(rec);

            // Event listeners for actions. 
            this.actions.add    .addEventListener("click", ()=> { 
                console.log(this.add, "add"); 
            }, false);

            this.actions.reset  .addEventListener("click", ()=> {
                this.parent.selects.populate_command( Number(this.parent.selects.DOM.commandEditor.command_select.value) );
            }, false);

            this.actions.remove .addEventListener("click", ()=> { 
                console.log(this.remove, "remove"); 
            }, false);

            this.actions.update .addEventListener("click", ()=> { 
                this.update( Number(this.parent.selects.DOM.commandEditor.command_select.value) );
            }, false);
        },
    },

    init: function(parent){
        return new Promise(async (resolve,reject)=>{
            // Set the parent object of all the first-level objects within this object. 
            this.parent          = parent;

            this.nav.parent      = this;
            this.selects.parent  = this;
            this.sections.parent = this;
            this.groups.parent   = this;
            this.commands.parent = this;

            // Cache the section editor table DOM.
            this.sections.editor_table.table = document.getElementById("sectionEditor_table");
            this.sections.editor_table.id    = document.getElementById("sectionEditor_table_id");
            this.sections.editor_table.name  = document.getElementById("sectionEditor_table_name");
            this.sections.editor_table.order = document.getElementById("sectionEditor_table_order");

            // Cache the section editor action buttons. 
            this.sections.actions.add    = document.getElementById("sectionEditor_table_add");
            this.sections.actions.reset  = document.getElementById("sectionEditor_table_reset");
            this.sections.actions.remove = document.getElementById("sectionEditor_table_remove");
            this.sections.actions.update = document.getElementById("sectionEditor_table_update");


            // Cache the group editor table DOM.
            this.groups.editor_table.table = document.getElementById("groupEditor_table");
            this.groups.editor_table.id    = document.getElementById("groupEditor_table_id");
            this.groups.editor_table.name  = document.getElementById("groupEditor_table_name");
            this.groups.editor_table.order = document.getElementById("groupEditor_table_order");

            // Cache the group editor action buttons. 
            this.groups.actions.add    = document.getElementById("groupEditor_table_add");
            this.groups.actions.reset  = document.getElementById("groupEditor_table_reset");
            this.groups.actions.remove = document.getElementById("groupEditor_table_remove");
            this.groups.actions.update = document.getElementById("groupEditor_table_update");

            // Section editor.
            // this.section.init();

            // Group editor.
            // this.groups.init();

            // Command editor.
            this.commands.init();

            // Init the nav.
            this.nav.init();
            
            // Init the selects.
            this.selects.init();

            resolve();
        });
    },
};