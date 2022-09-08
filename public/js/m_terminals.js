_APP.terminals = {
    parent: null, 
    inited: false,
    DOM: {},
    terms: [],
    nextTermId: 1,
    
    //
    createNewTerminal: function(newTermId, config={}, type="TERM"){
        let prefix1;
        let prefix2;
        if     (type=="TERM"){ prefix1 = "term_"; prefix2 = "TERM #"; }
        else if(type=="MINI"){ 
            // Only allow 1 MINI terminal at a time.
            let miniTermViewElems = this.DOM.terms_windows.querySelectorAll(".termViewElem[type='MINI']");
            if(miniTermViewElems.length){
                let str = "Only one open MINI type term is allowed per client.";
                alert(str);
				console.log(str);
                return; 
            }

            prefix1 = "mini_"; 
            prefix2 = "MINI #"; 
        }
        else{ console.log("INVALID TYPE"); return; }
        
        // Create the WebSocket connection.
        let prePath = window.location.pathname.split("/");
        prePath.pop(); 
        prePath = prePath.join("/");
        prePath = prePath.indexOf("/") != 0 ? ("/") : (prePath + "/");
        let locUrl = `` +
        `${window.location.protocol == "https:" ? "wss" : "ws"}://` +
        `${location.hostname}` + 
        `${location.port ? ':'+location.port : ''}` +
        `${prePath}` +
        `TERM?uuid=${this.parent.ws_control.connectivity_status_update.data.uuid}` +
        `&termId=${prefix1 + newTermId}` +
        `&type=${type}`
        ;

        var ws = new WebSocket(locUrl);
        ws.onopen = async (event)=> {
            const terminal    = new Terminal(config);
            const fitAddon    = new FitAddon.FitAddon();
            const attachAddon = new AttachAddon.AttachAddon(ws);
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(attachAddon);

            // Create the terminal select option.
            let elem_option = document.createElement("option");
            elem_option.innerText = prefix2 + newTermId.toString().padStart(3, "0");
            elem_option.value = newTermId;
            
            // Create the terminal view.
            let elem_view = document.createElement("div");
            elem_view.classList.add("termViewElem");
            elem_view.classList.add("active");
            elem_view.setAttribute("termId", newTermId);
            elem_view.setAttribute("type", type);

            // Deactivate all tabs and views.
            this.deactivatate_terminalViews();

            // Add the tab and the view elements (activated).
            this.DOM.terms_list_select.append(elem_option);
            this.DOM.terms_list_select.value = newTermId;
            this.DOM.terms_windows.append(elem_view);

            // Add the terminal to the list.
            let obj = {
                termId : prefix1 + newTermId,
                termId2: newTermId,
                type   : type,
                ws     : ws,
                term: {
                    terminal   : terminal,
                    fitAddon   : fitAddon,
                    attachAddon: attachAddon,
                },
                elems: {
                    elem_option: elem_option,
                    elem_view  : elem_view,
                },
                funcs: {
                    parent : this,
                    obj : null,
                    removeTerm: function(fullRemoval=false){
                        this.parent.removeTerminal(this.obj, fullRemoval);
                    },
                },
            };
            obj.funcs.obj = obj;
            this.terms.push(obj);

            // Open the terminal and display.
            terminal.open( elem_view );
            this.refitActiveTerms();
            // fitAddon.fit();
        };

        // Increment nextTermId.
        this.nextTermId += 1;
    },
    // Switch to a different terminal or the terms_info view.
    switchTerminal: function(termId){
        // Try to find the matching terminal view. 
        let view = this.DOM.terms_windows.querySelector(`.termViewElem[termId='${termId}'`);
        if(view){ 
            // Hide all terminal views.
            this.deactivatate_terminalViews();
            
            // Show this terminal view.
            view.classList.add("active"); 
        }
        else{ 
            // Hide all terminal views.
            this.deactivatate_terminalViews();

            // Show statistics view.
            this.DOM.terms_info.classList.add("active"); 
        }
    },
    // 
    removeTerminal: function(obj, fullRemoval=false){
        // Get the select option of the terminal.
        let prevSelectedIndex = this.DOM.terms_list_select.selectedIndex;
        let option = this.DOM.terms_list_select.querySelector(`option[value='${obj.termId2}']`);

        // Add "(disconnected)" text to the select option. 
        option.innerText += " (disconnected)";
        
        // Add the disabled class to all canvases within the terminal view element. 
        let canvases = obj.elems.elem_view.querySelectorAll("canvas");
        canvases.forEach(d=>{ d.classList.add("disabled"); });
        
        // Close the ws connection of the terminal if ws is in the object. 
        if(obj.ws){ obj.ws.close(); }

        if(fullRemoval){
            // Remove the terminal select option.
            option.remove();
            
            // Switch to another terminal in the list.
            if(this.DOM.terms_list_select.options.length && prevSelectedIndex != 0){
                this.DOM.terms_list_select.selectedIndex = prevSelectedIndex - 1;
                let newTermId = this.DOM.terms_list_select.options[this.DOM.terms_list_select.selectedIndex].value;
                this.switchTerminal(newTermId);
            }
            
            // Remove the terminal view. 
            obj.elems.elem_view.remove();

            // Remove this terminal from the list of terminals. 
            this.terms = this.terms.filter( function(d){ if(d.termId2 != obj.termId2){ return d; }; } );
        }
    },
    // Hides all terminal views and the terms_info view.
    deactivatate_terminalViews: function(){
        // Hide the active terminal views.
        let termViewElems = this.DOM.terms_windows.querySelectorAll(".termViewElem");
        for(let i=0; i<termViewElems.length; i+=1){ termViewElems[i].classList.remove("active"); }

        // Hide terms_info.
        this.DOM.terms_info.classList.remove("active"); 
    },
    resizeTerminalContainer: function(){
        // Get a handle to the elements that are needed for this calculation.
        let main_cont     = this.DOM.main_cont;
        let main_navs     = this.DOM.main_navs;
        let terms_list    = this.DOM.terms_list;
        let rolodex       = this.rolodex.DOM.terminalRolodex;
        let terms_windows = this.DOM.terms_windows;

        // Get the heights.
        let main_cont_height  = main_cont.clientHeight  || main_cont.offsetHeight  || (main_cont.getBoundingClientRect()).height;
        let main_navs_height  = main_navs.clientHeight  || main_navs.offsetHeight  || (main_navs.getBoundingClientRect()).height;
        let terms_list_height = terms_list.clientHeight || terms_list.offsetHeight || (terms_list.getBoundingClientRect()).height;
        let rolodex_height    = rolodex.clientHeight    || rolodex.offsetHeight    || (rolodex.getBoundingClientRect()).height;
        
        // TODO: Need to better calculate padding/margin/border sizes.
        // Calculate the new height.
        let newHeight = (main_cont_height - (terms_list_height+rolodex_height) - main_navs_height) - 12;

        // Set the new height.
        terms_windows.style.height = newHeight + "px";
    },
    // Refit the "terms_windows" if needed.
    refitActiveTerms: function(){
        // If the activeTerm was found AND has visability and has the class "active".
        let activeTerm = this.getActiveTerminalData(); 
        if(activeTerm && activeTerm.termView.offsetParent != null){
            // Resize the terminal windows container. 
            this.resizeTerminalContainer();

            // Resize the terminal view.
            activeTerm.obj.term.fitAddon.fit();
        }

        // No activeTerm. Check terms_info visability and for the class "active".
        else if(this.DOM.terms_info.classList.contains("active")){
            if(this.DOM.terms_info.offsetParent != null){
                // Resize the terminal windows container. 
                this.resizeTerminalContainer();
            }
        }

    },
    // Get the data object for the active terminal. (return false if not found.)
    getActiveTerminalData: function(){
        let termView = this.DOM.terms_windows.querySelector(".termViewElem.active");
        if(!termView){ 
            // console.log("No active terminal view was found."); 
            return false; 
        }

        let termId = termView.getAttribute("termId");
        let activeTermObj = this.terms.find(d=>d.termId2 == termId);
        if(!activeTermObj){ 
            console.log("ERROR: No active terminal object was found."); 
            return false; 
        }

        return {
            termView : termView,
            termId   : termId,
            obj      : activeTermObj,
        };
    },

    rolodexFull: {
        parent: null,
        DOM: {},

        // Copy of esc_modalDismiss with "this" bound correctly. (Required for event listener removal.)
        esc_modalDismiss_bound: null,
        // Event listener function. Runs toggleFullTerminalRolodex when "Escape" is pressed.
        esc_modalDismiss: function(event){
            if(event.key == "Escape"){ this.toggleFullTerminalRolodex(); }
        },
        // Toggles the full terminal command rolodex.
        toggleFullTerminalRolodex: function(){
            // Toggle the "active" class.
            this.DOM.rolodexFull.classList.toggle("active");

            // Add remove the escape key event listener as needed.
            if(this.DOM.rolodexFull.classList.contains("active")){
                // console.log("esc_modalDismiss ev listener added.");
                document.body.addEventListener("keydown", this.esc_modalDismiss_bound, false);
            }
            else{
                // console.log("esc_modalDismiss ev listener removed.");
                document.body.removeEventListener("keydown", this.esc_modalDismiss_bound, false);
            }
        },
        // Populates the sections select.
        populateSections: function(){
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
            this.DOM.section.options[0].innerText = `...Sections (${count})`;
            
            // Remove all options other than the first. 
            this.DOM.section.options.length = 1;  
            
            // Append the new options. 
            this.DOM.section.append(frag);
        },
        // Populates the sectionGroup select.
        populateSectionGroups: function(){
            // Need to repopulate the sectionName and groupName selects.
            this.DOM.sectionGroup.options.length = 1;

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
                        // `${commandRec.gId==rec.gId?"*":decodeURI("%C2%A0")}` +
                        `(${("S:"+rec.sId)}) ${sectionName.padEnd(longest, decodeURI("%C2%A0"))}: ` +
                        `(${("G:"+rec.gId)}) ${groupName}`;
                    option.setAttribute("sId", `${rec.sId}`);
                    option.setAttribute("gId", `${rec.gId}`);
                    frag_sectionGroup.append(option);
                }
            }

            // Append the fragments. 
            this.DOM.sectionGroup.append(frag_sectionGroup);
        },
        // Used by "displayCommands_filterBySection" and "displayCommands_filterBySectionGroup" to create command rows.
        createRow:function(table, rec, empty=false){
            if(empty){
                let tr = table.insertRow(-1);
                for(let i=0; i<6; i+=1){
                    let td = tr.insertCell(-1); td.innerText = "";
                    td.classList.add("spacer");
                }
                return; 
            }
            tr = table.insertRow(-1);
            
            td = tr.insertCell(-1); td.innerText = rec.sectionName;
            
            td = tr.insertCell(-1); td.innerText = rec.groupName;

            td = tr.insertCell(-1); td.innerText = rec.title;

            td = tr.insertCell(-1);
            let editButton = document.createElement("button");
            editButton.innerText = "Edit";
            editButton.addEventListener("click", (ev)=>{ 
                this.parent.rolodex.populate_selects_for_specific_command(rec.cId);
                this.toggleFullTerminalRolodex();
                this.parent.rolodex.editCommand(); 
            }, false);
            td.append(editButton);
            
            td = tr.insertCell(-1);
            let sendButton = document.createElement("button");
            sendButton.innerText = "Send";
            sendButton.addEventListener("click", (ev)=>{ 
                this.parent.rolodex.populate_selects_for_specific_command(rec.cId);
                this.toggleFullTerminalRolodex();
                this.parent.rolodex.sendCommand(); 
            }, false);
            td.append(sendButton);
            
            td = tr.insertCell(-1); td.innerText = rec.cmd;
        },
        // Display command rows associated with a section. 
        displayCommands_filterBySection:function(){
            // Deselect the sectionGroup select.
            this.DOM.sectionGroup.value = "";
            
            // Get the selected sId.
            let sId = Number( this.DOM.section.value );

            // Clear the output first.
            this.DOM.cmdDisplay.innerHTML = "";
            let table = document.createElement("table");
            let tr_headers = table.insertRow(-1);

            let headers = [ "Section", "Group", "Command Title", "Edit", "Send", "Command" ];
            headers.forEach(function(d){
                let th = tr_headers.insertCell(-1).outerHTML = `<th>${d}</th>`; th.outerHTML = `<th>${d}</th>`;
            });

            // Display each command as a row.
            let lastGroupName = "";
            for(let i=0; i<this.parent.parent.commands.commands.length; i+=1){
                let rec = this.parent.parent.commands.commands[i];
                if(rec.f_hidden){ continue; }
                if(rec.sId != sId){ continue; }
                if(rec.groupName != lastGroupName){
                    lastGroupName = rec.groupName;
                    this.createRow(table, null, true);
                }
                this.createRow(table, rec);
            }
            this.createRow(table, null, true);
            this.DOM.cmdDisplay.append(table);
        },
        // Display command rows associated with a section and a group. 
        displayCommands_filterBySectionGroup:function(){
            // Deselect the section select.
            this.DOM.section.value = "";
            
            // Get the selected sId and gId from the selected option.
            let sectionGroup_option = this.DOM.sectionGroup.options[this.DOM.sectionGroup.options.selectedIndex];
            let sId = Number( sectionGroup_option.getAttribute("sId") );
            let gId = Number( sectionGroup_option.getAttribute("gId") );
            
            // Clear the output first.
            this.DOM.cmdDisplay.innerHTML = "";
            let table = document.createElement("table");
            let tr_headers = table.insertRow(-1);

            let headers = [ "Section", "Group", "Command Title", "Edit", "Send", "Command" ];
            headers.forEach(function(d){
                let th = tr_headers.insertCell(-1); th.outerHTML = `<th>${d}</th>`;
            });
            
            // Display each command as a row.
            for(let i=0; i<this.parent.parent.commands.commands.length; i+=1){
                let rec = this.parent.parent.commands.commands[i];
                if(rec.f_hidden){ continue; }
                if(rec.sId != sId){ continue; }
                if(rec.gId != gId){ continue; }
                this.createRow(table, rec);
            }
            this.DOM.cmdDisplay.append(table);
        },

        init: function(parent, configObj){
            this.parent = parent;

            // Load from config.
            for(let key in configObj.DOM){ this.DOM[key] = configObj.DOM[key]; }

            // DOM.
            for(let key in this.DOM){
                if(typeof this.DOM[key] == "string"){
                    this.DOM[key] = document.getElementById( this.DOM[key] );
                }
            }

            // Event listeners.
            this.DOM.rolodexModal_btn.addEventListener("click", (ev)=>{ this.toggleFullTerminalRolodex(); }, false);
            this.DOM.closeBtn        .addEventListener("click", (ev)=>{ this.toggleFullTerminalRolodex(); }, false);
            this.DOM.section         .addEventListener("change", (ev)=>{ this.displayCommands_filterBySection(); }, false);
            this.DOM.sectionGroup    .addEventListener("change", (ev)=>{ this.displayCommands_filterBySectionGroup(); }, false);

            // BoundEventHandlers.
            this.esc_modalDismiss_bound = this.esc_modalDismiss.bind(this);

            // Remove the disableds.
            this.DOM.rolodexModal_btn.classList.remove("disabled");

            // Pre-populate sections.
            this.populateSections();
            
            // Pre-populate sectionGroups.
            this.populateSectionGroups();
        },
    },

    rolodex: {
        parent: null,
        DOM: {},

        // Open/close the command rolodex.
        toggleTerminalRolodex     : function(){
            // Open the command rolodex.
            this.DOM.terminalRolodex.classList.toggle("active");
            // let rolodexIsOpen = this.DOM.terminalRolodex.classList.contains("active");

            // Shrink the terminal views to fit.
            this.parent.refitActiveTerms();
        },

        // Menus and sections.
        populate_sections: function(){
            // Populate new options based on the sections in commands. 
            let frag = document.createDocumentFragment();
            let option;
            for(let i=0; i<this.parent.parent.commands.sections.length; i+=1){
                let rec = this.parent.parent.commands.sections[i];
                option = document.createElement("option");
                option.value = `${rec.sId}`;
                option.innerText = `(${("S:"+rec.sId)}) ${rec.name}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }
            
            // Clear the options list other than the first option.
            this.DOM.terminalRolodex_section_select.options.length = 1;
            
            // Add the new options. 
            this.DOM.terminalRolodex_section_select.append(frag);
            
            // Clear selects for groups, commands, and the clear the displayed command.
            this.DOM.terminalRolodex_group_select.options.length = 1;
            this.DOM.terminalRolodex_group_select.value = "";
            this.DOM.terminalRolodex_command_select.options.length = 1;
            this.DOM.terminalRolodex_command_select.value = "";
            this.DOM.terminalRolodex_command.innerText = "";
            this.DOM.terminalRolodex_command.setAttribute("title", "");
        },
        populate_groups  : function(){
            // Get the currently selected sId.
            let sId = Number(this.DOM.terminalRolodex_section_select.value);
            if(!sId){ console.log("populate_groups: Section record not found:", sId); return; }

            // Create the options. 
            let frag = document.createDocumentFragment();
            let option;
            for(let i=0; i<this.parent.parent.commands.groups.length; i+=1){
                let rec = this.parent.parent.commands.groups[i];
                if(rec.sId != sId){ continue; }
                option = document.createElement("option");
                option.value = `${rec.gId}`;
                option.innerText = `(${("G:"+rec.gId)}) ${rec.name}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }

            // Clear the options list other than the first option.
            this.DOM.terminalRolodex_group_select.options.length = 1;

            // Add the new options. 
            this.DOM.terminalRolodex_group_select.append(frag);
            
            // Clear selects for commands, and the clear the displayed command.
            this.DOM.terminalRolodex_command_select.options.length = 1;
            this.DOM.terminalRolodex_command_select.value = "";
            this.DOM.terminalRolodex_command.innerText = "";
            this.DOM.terminalRolodex_command.setAttribute("title", "");
        },
        populate_commands: function(){
            // Get the currently selected gId.
            let gId = Number(this.DOM.terminalRolodex_group_select.value);
            if(!gId){ console.log("populate_commands: Group record not found:", gId); return; }

            // Create the options.
            let frag = document.createDocumentFragment();
            let option;
            for(let i=0; i<this.parent.parent.commands.commands.length; i+=1){
                let rec = this.parent.parent.commands.commands[i];
                if(rec.gId != gId){ continue; }
                option = document.createElement("option");
                option.value = `${rec.cId}`;
                option.innerText = `(${("C:"+rec.cId)}) ${rec.title}`;
                option.setAttribute("order", `${rec.order}`);
                frag.append(option);
            }

            // Clear the options list other than the first option.
            this.DOM.terminalRolodex_command_select.options.length = 1;

            // Add the new options. 
            this.DOM.terminalRolodex_command_select.append(frag);

            // Clear the displayed command.
            this.DOM.terminalRolodex_command.innerText = "";
            this.DOM.terminalRolodex_command.setAttribute("title", "");
        },
        populate_command: function(){
            // Get the currently selected cId.
            let cId = Number(this.DOM.terminalRolodex_command_select.value);
            let rec = this.parent.parent.commands.commands.find(d=>d.cId==cId);
            if(!rec){ console.log("populate_command: Command record not found:", cId); return; }
            this.DOM.terminalRolodex_command.innerText = rec.cmd;
            this.DOM.terminalRolodex_command.setAttribute("title", rec.cmd);
        },
        populate_selects_for_specific_command: function(cId){
            let rec = this.parent.parent.commands.commands.find(d=>d.cId==cId);
            if(!rec){ console.log("Command record not found:", cId); return; }

            // Set the selects to the matching sId, gId, and cId. It will all display.
            this.populate_sections();
            this.DOM.terminalRolodex_section_select.value = Number(rec.sId);

            this.populate_groups();
            this.DOM.terminalRolodex_group_select  .value = Number(rec.gId);

            this.populate_commands();
            this.DOM.terminalRolodex_command_select.value = Number(rec.cId);
            
            this.populate_command();
        },

        // Sending and editing of existing commands.
        sendCommand: function(){
            // Get the cId.
            let cId = Number(this.DOM.terminalRolodex_command_select.value);
            if(!cId){ console.log("Command not selected:", cId); return; }
            
            // Get the command record.
            let rec = this.parent.parent.commands.commands.find(d=>d.cId == cId);
            if(!rec){ console.log("Command rec not found:", rec); return; }
            
            // Send this command to the terminal.
            let obj = this.parent.getActiveTerminalData();
            if(!obj){ console.log("Active terminal object not found:", obj); return; }
            // obj.obj.ws.send( ` ${rec.f_ctrlc ? "\u0003" : ""}${rec.cmd}${rec.f_enter ? "\r\n" : ""}` );
            // obj.obj.ws.send( ` ${rec.f_ctrlc ? "\u0003" : ""}${rec.cmd}${rec.f_enter ? "\n" : ""}` );
            obj.obj.ws.send( ` ${rec.c ? "\u0003" : ""}${rec.cmd}${rec.f_enter ? "\r" : ""}` );
        },
        editCommand: function(){
            // Load this section/group/command in the DB editor.
            let cId = Number(this.DOM.terminalRolodex_command_select.value);
            if(!cId){ console.log("Command not selected:", cId); return; }
            
            // Make the selections. 
            this.parent.parent.editor.selects.populateSelectsBy_cId(cId);

            // Display the DB editor view. 
            this.parent.parent.mainNav.nav.showOneView("editor");
        },

        init:function(parent, configObj){
            this.parent = parent;

            // Load from config.
            for(let key in configObj.DOM){ this.DOM[key] = configObj.DOM[key]; }

            // DOM.
            for(let key in this.DOM){
                if(typeof this.DOM[key] == "string"){
                    this.DOM[key] = document.getElementById( this.DOM[key] );
                }
            }

            // Add event listeners for the command rolodex open/close.
            this.DOM.terminalRolodex_btn.addEventListener("click", (ev)=>{ this.toggleTerminalRolodex(); }, false);

            // Add event listeners for editing/sending a command.
            this.DOM.terminalRolodex_command_edit.addEventListener("click", (ev)=>{ this.editCommand(); }, false);
            this.DOM.terminalRolodex_command_send.addEventListener("click", (ev)=>{ this.sendCommand(); }, false);
            
            // Populate based on selected section/group/command.
            this.DOM.terminalRolodex_section_select.addEventListener("change", (ev)=>{ this.populate_groups(); }, false);
            this.DOM.terminalRolodex_group_select.addEventListener("change", (ev)=>{ this.populate_commands(); }, false);
            this.DOM.terminalRolodex_command_select.addEventListener("change", (ev)=>{ this.populate_command(); }, false);
            
            this.DOM.terminalRolodex_btn.classList.remove("disabled");
            this.DOM.terminalRolodex.classList.remove("disabled");

            // Pre-populate sections. 
            this.populate_sections();
        },
    },

    init: function(parent, configObj){
        return new Promise(async (resolve,reject)=>{
            if(this.inited){ console.log("m_terminals has already been inited."); return; }
            this.parent = parent;

            // Load from config.
            for(let key in configObj.DOM){ this.DOM[key] = configObj.DOM[key]; }

            // DOM.
            for(let key in this.DOM){
                if(typeof this.DOM[key] == "string"){
                    this.DOM[key] = document.getElementById( this.DOM[key] );
                }
            }

            // Add Event Listener for the change terminal select menu.
            this.DOM.terms_list_select.addEventListener("change", (ev)=>{ this.switchTerminal(ev.srcElement.value); }, false);
            this.DOM.terminalClose.addEventListener("click", (ev)=>{ 
                let activeTermElem = this.DOM.terms_windows.querySelectorAll(".termViewElem.active");
                if(activeTermElem.length == 1){
                    activeTermElem = activeTermElem[0];
                    let termId = Number(activeTermElem.getAttribute("termId"));
                    let activeTermObj = this.terms.find(d=>d.termId2 == termId);

                    // Term object still exists. Run it's removal method. 
                    if(activeTermObj){
                        activeTermObj.funcs.removeTerm(true);
                    }

                    // Term object does NOT exist. Remove it from view.
                    else{
                        console.log("doesn't exist.");

                        this.removeTerminal({
                            termId2:termId,
                            activeTermElem:activeTermElem,
                        });
                    }
                }
            }, false);

            // Create the first terminal.
            // this.createNewTerminal(this.nextTermId, _APP.config.config.terms, "TERM");

            // Do maintenance tasks based on a timer. 
            this.parent.timedTasks.addTask(
                {
                    "name": "terminalMaintenance",
                    delay_ms: 500,
                    lastRun: performance.now(),
                    func: ()=>{
                        if(this.terms.length){
                            // Refit the actively displayed terminals to their parents.
                            this.refitActiveTerms();

                            let hasRemovals = false;
                            for(let i=0; i<this.terms.length; i+=1){
                                // Detect and remove closed websocket terms.
                                if(this.terms[i].ws.readyState == 3 && !this.terms[i].REMOVEME){
                                    console.log("Found a dead terminal", this.terms[i].termId);
                                    this.terms[i].REMOVEME = true;
                                    this.terms[i].ws.close();
                                    hasRemovals = true; 
                                }
                            }
        
                            // Partially remove dead terminals.
                            if(hasRemovals){
                                // Determine what is to be removed.
                                let toRemove = this.terms = this.terms.filter( function(d){ if(d.REMOVEME){ return d; }; } );
        
                                // Run the removal functions for each term to remove. 
                                // NOTE: Leaves the terminals visible until the user actually closes them. 
                                for(let i=0; i<toRemove.length; i+=1){
                                    toRemove[i].funcs.removeTerm(false);
                                }
        
                                // Remove the dead terminals from the terms array.
                                // this.terms = this.terms.filter( function(d){ if(!d.REMOVEME){ return d; }; } );
                            }
                        }
                    }
                }
            );

            this.DOM.addTerm.classList.remove("disabled");
            this.DOM.addMini.classList.remove("disabled");
            this.DOM.terms_list_select.classList.remove("disabled");

            this.rolodex.init(this, configObj.rolodex);
            this.rolodexFull.init(this, configObj.rolodexFull);
            this.inited = true;
            resolve();
        });
    },
};
