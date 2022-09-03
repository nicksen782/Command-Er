// Shared variables.
let _APP = {
    // Holds the server/client config. 
    config: null,

    // Holds a cache of the server DB commands. 
    commands: [],
    
    // Holds the current appView.
    appView: "",
    
    // Holds timed tasks.
    timedTasks : {
        inited: false,
        debug: false,
        
        // Holds the task objects. 
        tasks: {
        },

        //'Adds a new task. 
        addTask: function(task){ 
            this.tasks[task.name] = task; 
        },

        // Timed runner to determine if a task is ready to be run.
        func: function(){
            let debugLines = [];
            for(let key in this.tasks){
                let timeSince = performance.now() - this.tasks[key].lastRun;
                if(timeSince > this.tasks[key].delay_ms){
                    // DEBUG:
                    if(this.debug){
                        let data = {
                            key      : key.padEnd(30, " "), 
                            timeSince: timeSince.toFixed(2), 
                            overBy   : (timeSince - this.tasks[key].delay_ms).toFixed(2), 
                            delay_ms : this.tasks[key].delay_ms.toFixed(2), 
                        };
                        debugLines.push(data);
                    }

                    // Run the task. 
                    this.tasks[key].func(); this.tasks[key].lastRun = performance.now();
                }
            }

            if(this.debug && debugLines.length){
                console.table(debugLines);
            }

        },

        init: function(parent){
            this.parent = parent;
            setInterval( ()=>{ this.func(); }, 1000 );
        },
    },
};
