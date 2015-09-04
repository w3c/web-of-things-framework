WoT.ViewModels = WoT.ViewModels || {};

WoT.ViewModels.ThingsHandlerViewModel = function () {
    var self = new WoT.ViewModelBase();
    
    self.ws_send_proc = null;
    self.things = ko.observableArray([]);
    
    self.dispatch_message = function (message) {
        var thing_name = message.thing;
        if (!thing_name) {
            return WoT.App.ShowError("Invalid thing name at web socket dispatch_message()");;
        }


        if (message.event) // notify event to proxy
        {
            // find the thing in the things list
            for (var i = 0; i < self.things().length; i++) {
                var thing = self.things()[i];
                var name = thing.name();
                if (thing_name == name) {
                    thing.signal_event(message.event, message.data);
                    break;
                }
            }
        } 
        else if (message.state) // update all properties on proxy
        {
            // find the thing in the things list
            //for (var i = 0; i < self.things().length; i++) {
            //    var thing = self.things()[i];
            //    var name = thing.name();
            //    if (thing_name == name) {
            //        var obj = message.state;
            //        for (var property in obj) {
            //            if (obj.hasOwnProperty(property)) {
            //                thing.set_property(property, obj[property]);
            //            }
            //        }
            //        break;
            //    }
            //}
        } 
        else if (message.patch) // update named property on proxy
        {
            for (var i = 0; i < self.things().length; i++) {
                var thing = self.things()[i];
                var name = thing.name();
                if (thing_name == name) {  
                    thing.set_property(message.patch, message.data);                        
                    break;
                }
            }
        } 
        else {
            console.log("unknown message type: " + JSON.stringify(message));
        }
    }
    
    //  web socket initialization
    self.ws_init = function (callback) {
        // same origin policy restricts this library to connecting to
        // HTTP and WebSockets servers with same origin as web page.
        // does XHR resolve relative URLs with respect to page origin?
        
        // initialise web socket connection for thing messages
        // use single connection for all things on the server
        
        var host = window.document.location.host.replace(/:.*/, '');
        var ws = new WebSocket('ws://' + host + ':8080/webofthings');
        console.log("websocket connection opening ...");
        
        ws.onopen = function () {
            console.log("websocket connection opened");

            // the web socket connection is opened, call the callback to initialise the things collection
            callback();
        };
        
        ws.onclose = function () {
            console.log("websocket connection closed");
        };
        
        ws.onerror = function () {
            console.log("websocket connection error");
            WoT.App.ShowError("Websocket connection error");
        };
        
        ws.onmessage = function (message) {
            console.log("received message: " + message.data);
            try {
                var msg = JSON.parse(message.data);
                if (!msg) return;
                
                if (msg.error) {
                    return WoT.App.ShowError(msg.error);
                }
                
                self.dispatch_message(msg);
            } 
            catch (e) {
                WoT.App.ShowError("JSON syntax error in " + e.message);
            }
        };           
          
        self.ws_send_proc = function (message) {
            // the message should be string typically by using JSON.stringify
            ws.send(message);
        }
    }

    // Get the list of things for this client
    self.init = function (callback) {
            
        // first initialize the web socket client
        self.ws_init(function () {
            // the web socket is created, get the things collection
            // get the list of things from the server
            $.ajax({
                url: 'api/things/list',
                type: "POST",
                dataType: "json",
                contentType: "application/json"
            }).done(function (result) {
                if (result.error) {
                    return WoT.App.ShowError("Error in populating things list: " + result.error);
                }
                
                var things_array = ko.utils.arrayMap(result, function (thing) {
                    var thingobj = new WoT.ViewModels.ThingViewModel(thing.name, thing.id, self.ws_send_proc);
                    // intitialize from here
                    thingobj.init();
                    return thingobj;
                });
                
                self.things(things_array);
                callback();

            }).fail(function (jqXHR, textStatus) {
                WoT.App.ShowError(textStatus + " Error, " + jqXHR.responseText);
            });
        });
    }

    return self;
}