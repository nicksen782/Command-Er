// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';

_APP.terminals = {
    parent: null, 
    inited: false,
    DOM: {
        terms_list          : "terms_list",
        terms_list_select   : "terms_list_select",
        terms_windows       : "terms_windows",
        terms_info          : "terms_info",
        addTerm             : "addTerm",
        addMini             : "addMini",
        terminalClose       : "terminalClose",

        // terminalRolodex_btn            : "terminalRolodex_btn",
        // terminalRolodex                : "terminalRolodex",
        // terminalRolodex_section_select : "terminalRolodex_section_select",
        // terminalRolodex_group_select   : "terminalRolodex_group_select",
        // terminalRolodex_command_select : "terminalRolodex_command_select",
        // terminalRolodex_command        : "terminalRolodex_command",
        // terminalRolodex_command_edit   : "terminalRolodex_command_edit",
        // terminalRolodex_command_send   : "terminalRolodex_command_send",
    },
    terms: [],
    nextTermId: 1,
    
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
        let locUrl = `` +
        `${window.location.protocol == "https:" ? "wss" : "ws"}://` +
        `${location.hostname}` + 
        `${location.port ? ':'+location.port : ''}` +
        // `${location.pathname != "/" ? ''+location.pathname : '/'}` +
        `/`+
        `TERM?uuid=${this.parent.ws_control.connectivity_status_update.data.uuid}` +
        `&termId=${prefix1 + newTermId}` +
        `&type=${type}`
        ;

        var ws = new WebSocket(locUrl);
        ws.onopen = async (event)=> {
            // console.log("OPEN", event);
            // console.log("config:",_APP.config.config.terms);
            
            const terminal    = new Terminal(config);
            const fitAddon    = new FitAddon.FitAddon();
            const attachAddon = new AttachAddon.AttachAddon(ws);
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(attachAddon);

            // Create the terminal tab.
            // let elem_tab = document.createElement("div");
            // elem_tab.classList.add("termTabElem");
            // elem_tab.classList.add("active");
            // elem_tab.innerText = prefix2 + newTermId.toString().padStart(3, "0");

            // Create the terminal selectoption.
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
            // this.DOM.terms_list.append(elem_tab);
            this.DOM.terms_list_select.append(elem_option);
            this.DOM.terms_list_select.value = newTermId;
            this.DOM.terms_windows.append(elem_view);

            // Open the terminal and display.
            terminal.open( elem_view );
            fitAddon.fit();

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
                    // elem_tab   : elem_tab,
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
        };

        // Increment nextTermId.
        this.nextTermId += 1;
    },
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
    removeTerminal: function(obj, fullRemoval=false){
        // Get the select option of the terminal.
        let prevSelectedIndex = this.DOM.terms_list_select.selectedIndex;
        let option = this.DOM.terms_list_select.querySelector(`option[value='${obj.termId2}']`);

        // Add "(disconnected" text to the select option. 
        option.innerText += " (disconnected)";
        
        // Add the disabled class to all canvases within the terminal view element. 
        let canvases = obj.elems.elem_view.querySelectorAll("canvas");
        canvases.forEach(d=>{
            d.classList.add("disabled");
        });
        
        // Close the ws connection of the terminal if ws is in the object. 
        if(obj.ws){ obj.ws.close(); }

        if(fullRemoval){
            // Remove the terminal select option.
            option.remove();
            
            if(this.DOM.terms_list_select.options.length && prevSelectedIndex != 0){
                this.DOM.terms_list_select.selectedIndex = prevSelectedIndex - 1;
                let newTermId = this.DOM.terms_list_select.options[this.DOM.terms_list_select.selectedIndex].value;
                this.switchTerminal(newTermId);
            }
            
            // Remove the terminal view. 
            obj.elems.elem_view.remove();

            // Remove all the dead terminals from the terms array.
            // this.terms = this.terms.filter( function(d){ if(!d.REMOVEME){ return d; }; } );

            // Remove this terminal from the list of terminals. 
            this.terms = this.terms.filter( function(d){ if(d.termId2 != obj.termId2){ return d; }; } );
        }
    },
    deactivatate_terminalViews: function(){
        let termViewElems = this.DOM.terms_windows.querySelectorAll(".termViewElem");
        for(let i=0; i<termViewElems.length; i+=1){ termViewElems[i].classList.remove("active"); }

        // Hide statistics view.
        this.DOM.terms_info.classList.remove("active"); 
    },
    // Refit the view but only if it is currently displayed.
    refitActiveTerms: function(){
        let activeTerm = this.getActiveTerminalData(); 

        if(activeTerm && activeTerm.termView.classList.contains("active")){
            if(activeTerm.termView.offsetParent != null){
                activeTerm.obj.term.fitAddon.fit();
            }
        }
    },
    getActiveTerminalData: function(){
        let termView = this.DOM.terms_windows.querySelector(".termViewElem.active");
        if(!termView){ console.log("No active terminal view was found."); return false; }
        let termId = termView.getAttribute("termId");
        let activeTermObj = this.terms.find(d=>d.termId2 == termId);
        if(!activeTermObj){ console.log("No active terminal object was found."); return false; }
        return {
            termView : termView,
            termId   : termId,
            obj      : activeTermObj,
        };
    },

    rolodex: {
        parent: null,
        DOM: {
            // Rolodex toggle button and display div:
            terminalRolodex_btn            : "terminalRolodex_btn",
            terminalRolodex                : "terminalRolodex",

            // Rolodex selectors.
            terminalRolodex_section_select : "terminalRolodex_section_select",
            terminalRolodex_group_select   : "terminalRolodex_group_select",
            terminalRolodex_command_select : "terminalRolodex_command_select",
            terminalRolodex_command        : "terminalRolodex_command",
            terminalRolodex_command_edit   : "terminalRolodex_command_edit",
            terminalRolodex_command_send   : "terminalRolodex_command_send",
        },

        // Open/close the command rolodex.
        toggleTerminalRolodex     : function(){
            // Open the command rolodex.
            this.DOM.terminalRolodex.classList.toggle("active");
            let rolodexIsOpen = this.DOM.terminalRolodex.classList.contains("active");


            // Shrink the terminal views to fit.
            let termViewElems = this.parent.DOM.terms_windows.querySelectorAll(".termViewElem");
            for(let i=0; i<termViewElems.length; i+=1){
                // Get a handle to this terminal view in the DOM.
                let term = termViewElems[i];

                // If the rolodex is open then add the "smaller" class. 
                if(rolodexIsOpen){ term.classList.add("smaller");  }

                // If the rolodex is closed then remove the "smaller" class. 
                else{ term.classList.remove("smaller");  }
            }

            // Refit the actively displayed terminals to their parents.
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
        },
        populate_groups  : function(){
            // Get the currently selected sId.
            let sId = Number(this.DOM.terminalRolodex_section_select.value);
            if(!sId){ console.log("Section record not found:", sId); return; }

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
        },
        populate_commands: function(){
            // Get the currently selected gId.
            let gId = Number(this.DOM.terminalRolodex_group_select.value);
            if(!gId){ console.log("Group record not found:", gId); return; }

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
        },
        populate_command: function(){
            // Get the currently selected cId.
            let cId = Number(this.DOM.terminalRolodex_command_select.value);
            let rec = this.parent.parent.commands.commands.find(d=>d.cId==cId);
            if(!rec){ console.log("Command record not found:", cId); return; }
            this.DOM.terminalRolodex_command.innerText = rec.cmd;
        },
        populate_selects_for_specific_command: function(cId){
            let rec = this.parent.parent.commands.commands.find(d=>d.cId==cId);
            if(!rec){ console.log("Command record not found:", cId); return; }

            // Set the selects to the matching sId, gId, and cId. It will all display.
            this.DOM.terminalRolodex_section_select.value = Number(rec.sId);
            this.DOM.terminalRolodex_group_select  .value = Number(rec.gId);
            this.DOM.terminalRolodex_command_select.value = Number(rec.cId);
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
            obj.obj.ws.send( ` ${rec.f_ctrlc ? "\u0003" : ""}${rec.cmd}${rec.f_enter ? "\r\n" : ""}` );
        },
        editCommand: function(){
            // Load this section/group/command in the DB editor.
            let cId = Number(this.DOM.terminalRolodex_command_select.value);
            if(!cId){ console.log("Command not selected:", cId); return; }
            
            // Make the selections. 
            this.parent.parent.editor.selects.populateSelectsBy_cId(cId);

            // Display the DB editor view. 
            document.getElementById("top_nav_nav_editor").click();
        },

        init:function(parent){
            this.parent = parent;

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

    init: function(parent){
        return new Promise(async (resolve,reject)=>{
            if(this.inited){ console.log("m_terminals has already been inited."); return; }
            this.parent = parent;

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
            this.createNewTerminal(this.nextTermId, _APP.config.config.terms, "TERM");

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

            this.rolodex.init(this);
            this.inited = true;
            resolve();
        });
    },
};
