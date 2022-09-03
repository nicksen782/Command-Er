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
        terminalRolodex_btn : "terminalRolodex_btn",
        terminalRolodex     : "terminalRolodex",
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
                    remove: function(){
                        this.parent.removeTerminal(this.obj);
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
    removeTerminal: function(obj){
        // Remove the terminal select option.
        let prevSelectedIndex = this.DOM.terms_list_select.selectedIndex;
        let option = this.DOM.terms_list_select.querySelector(`option[value='${obj.termId2}']`);
        option.remove();
        if(this.DOM.terms_list_select.options.length && prevSelectedIndex != 0){
            this.DOM.terms_list_select.selectedIndex = prevSelectedIndex - 1;
            let newTermId = this.DOM.terms_list_select.options[this.DOM.terms_list_select.selectedIndex].value;
            this.switchTerminal(newTermId);
        }

        // Remove the terminal view. 
        obj.elems.elem_view.remove();
    },
    deactivatate_terminalViews: function(){
        // let termTabElems  = this.DOM.terms_list.querySelectorAll(".termTabElem");
        let termViewElems = this.DOM.terms_windows.querySelectorAll(".termViewElem");
        // for(let i=0; i<termTabElems .length; i+=1){ termTabElems[i] .classList.remove("active"); }
        for(let i=0; i<termViewElems.length; i+=1){ termViewElems[i].classList.remove("active"); }

        // Hide statistics view.
        this.DOM.terms_info.classList.remove("active"); 
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
            this.DOM.terminalRolodex_btn.addEventListener("click", (ev)=>{ console.log("Not ready - terminalRolodex_btn"); }, false);
            this.DOM.terminalClose.addEventListener("click", (ev)=>{ 
                let activeTermElem = this.DOM.terms_windows.querySelectorAll(".termViewElem.active");
                if(activeTermElem.length == 1){
                    activeTermElem = activeTermElem[0];
                    let termId = Number(activeTermElem.getAttribute("termId"));
                    let activeTermObj = this.terms.find(d=>d.termId2 == termId);
                    // console.log("termId        :", termId);
                    // console.log("activeTermElem:", activeTermElem);
                    console.log("activeTermObj :", activeTermObj);
                    // console.log("this.terms    :", this.terms);
                    activeTermObj.funcs.remove();
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
                            // console.log("fit");
                            let hasRemovals = false;
                            for(let i=0; i<this.terms.length; i+=1){
                                
                                // Refit the view but only if it is currently displayed.
                                if(this.terms[i].elems.elem_view.classList.contains("active")){
                                    if(this.terms[i].elems.elem_view.offsetParent != null){
                                        this.terms[i].term.fitAddon.fit();
                                    }
                                }
                                
                                // Detect and remove closed websocket terms.
                                if(this.terms[i].ws.readyState == 3){
                                    console.log("Dead terminal", this.terms[i].termId);
                                    this.terms[i].REMOVEME = true;
                                    hasRemovals = true; 
                                }
                            }
        
                            // Remove dead terminals.
                            if(hasRemovals){
                                // Determine what has been removed.
                                let toRemove = this.terms = this.terms.filter( function(d){ if(d.REMOVEME){ return d; }; } );
        
                                // Run the removal functions for each term to remove. 
                                for(let i=0; i<toRemove.length; i+=1){
                                    toRemove[i].funcs.remove();
                                }
        
                                // Remove the dead terminals from the terms array.
                                this.terms = this.terms.filter( function(d){ if(!d.REMOVEME){ return d; }; } );
                            }
                        }
                    }
                }
            );

            this.DOM.addTerm.classList.remove("disabled");
            this.DOM.addMini.classList.remove("disabled");
            this.DOM.terms_list_select.classList.remove("disabled");
            this.DOM.terminalRolodex_btn.classList.remove("disabled");
            this.inited = true;
            resolve();
        });
    },
};
