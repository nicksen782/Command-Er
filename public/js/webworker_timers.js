(
	function timersWithWebWorkers(){
		let obj = {
			// Stores the web worker instance.
			worker: undefined,

			// Stores the next value that can be used for an id.
			nextId : 1,

			// Stores a list of timeout/interval callbacks where the key of the object is the id.
			callbacks: {},

			// Create the webworker. (This is the code that the web worker will run.)
			createWebWorker: function (){
				// This will be the body of the web worker. 
				let container = function(){
					// Holds the ids used by setInterval and setTimeout.
					let ids = {};

					// Listen for messages.
					self.onmessage = function(e){
						let id    = e.data.id;
						let delay = e.data.delay;
						let type  = e.data.type;

						switch(type){
							case "setInterval"  : { 
								// Create a new setInterval that sends the "fire" message to the client when the time is up.
								ids[id] = setInterval(function () {
									// Send the message.
									self.postMessage({ type: 'fire', id  : id });
								}, delay);
								break; 
							}

							case "clearInterval": { 
								// Clear the setInterval.
								clearInterval(ids[id]);

								// Remove this id from the ids list.
								delete ids[id];
								break; 
							}

							case "setTimeout"   : { 
								// Create a new setTimeout that sends the "fire" message to the client when the time is up.
								ids[id] = setTimeout(function () {
									// Send the message.
									self.postMessage({ type: 'fire', id: id });

									// Remove this id from the ids list.
									delete ids[id];
								}, delay);
								break; 
							}
							
							case "clearTimeout" : { 
								// Clear the setTimeout.
								clearTimeout(ids[id]);

								// Remove this id from the ids list.
								delete ids[id];
								break; 
							}

						};
					};
				}

				// Return a reference to this web worker.
				return new Worker(
					URL.createObjectURL(
						new Blob(
							[ `(${container.toString()})();` ], 
							{ type: 'application/javascript' }
						)
					)
				);
			},

			// Get the next id to use.
			generateId      : function(){
				// Return the next id and increment by one for the next usage. 
				return obj.nextId += 1;
			},

			// Emulates setInterval with a webworker for the actual timing.
			setInterval_ww  : function(callback, delay){
				// Get an id for this timer.
				var id = obj.generateId();

				// Add the callback to the list (key is the id, value is the function.)
				obj.callbacks[id] = callback;

				// Ask the webworker to use setInterval and then tell us when to run the callback.
				obj.worker.postMessage({
					type: 'setInterval',
					delay: delay,
					id: id
				});

				// Return the new setInterval id.
				return id;
			},

			// Emulates clearInterval with a webworker for the actual timing.
			clearInterval_ww: function(id){
				// Ask the web worker to remove the setInterval.
				obj.worker.postMessage({
					type: 'clearInterval',
					id: id
				});
				
				// Remove the callback for this setInterval.
				delete obj.callbacks[id];
			},

			// Emulates setTimeout with a webworker for the actual timing.
			setTimeout_ww   : function(callback, delay){
				// Get an id for this timer.
				var id = obj.generateId();

				// Add the callback to the list (key is the id, value is the function.)
				obj.callbacks[id] = function () {
					// Run the function. 
					callback();

					// Remove the callback for this setTimeout.
					delete obj.callbacks[id];
				};
	
				// Ask the webworker to use setTimeout and then tell us when to run the callback.
				obj.worker.postMessage({
					type: 'setTimeout',
					delay: delay,
					id: id
				});

				// Return the new setInterval id.
				return id;
			},

			// Emulates clearTimeout with a webworker for the actual timing.
			clearTimeout_ww : function(id){
				// Ask the web worker to remove the setTimeout.
				obj.worker.postMessage({
					type: 'clearInterval',
					id: id
				});
	
				// Remove the callback for this setTimeout.
				delete obj.callbacks[id];
			},
		};

		// Create the web worker instance.
		obj.worker = obj.createWebWorker();

		// Receive messages from the web worker that tell the client when to run the callback.
		obj.worker.onmessage = function (e) {
			let type = e.data.type;
			let id   = e.data.id;
			if (type === 'fire' && typeof (obj.callbacks[id]) === 'function') { obj.callbacks[id](); }
		};

		// Save new functions/values to window.
		window.timersWithWebWorkers = obj;
		window.setInterval_ww   = obj.setInterval_ww;
		window.clearInterval_ww = obj.clearInterval_ww;
		window.setTimeout_ww    = obj.setTimeout_ww;
		window.clearTimeout_ww  = obj.clearTimeout_ww;
	}
)();
