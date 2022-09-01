_APP.terminals = {
    parent: null, 
    
    init: function(parent){
        return new Promise(async (resolve,reject)=>{
            this.parent = parent;
            resolve();
        });
    },
};