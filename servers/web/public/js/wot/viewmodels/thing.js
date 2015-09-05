WoT.ViewModels = WoT.ViewModels || {};

WoT.ViewModels.ThingProperty = function (_property, _prop, _on_propertychanged, _name) {
    var viewModel = {
        thing_name: _name,
        template_name: ko.observable(_property + '-property-template'),
        property: ko.observable(_property),
        type: ko.observable(_prop.type),
        iswriteable: ko.observable((_prop.writeable && _prop.writeable == true) ? true : false),       
        data: ko.observable(_prop.value),
        on_propertychanged: _on_propertychanged,

        //  need this variable to avoid an infinite loop when the property set by the server
        //  so the above subscribe listener don't send back the very same value to the server
        setbyserver: false,

        set_value: function (val) {
            viewModel.data(val);
        },

        get_value: function () {
            var data = { thing: viewModel.thing_name, property: viewModel.property()};
            $.ajax({
                url: 'api/thing/property/get',
                type: "POST",
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(data)
            }).done(function (result) {
                
                if (result.error) {
                    return console.log("Error: " + result.error)
                }
                
                if (result.hasOwnProperty("value")) {
                    viewModel.set_value(result.value)
                }

            }).fail(function (jqXHR, textStatus) {
                WoT.App.ShowError(textStatus + " Error, " + jqXHR.responseText);
            });    
        }
    };
    
    if (viewModel.iswriteable()) {
        viewModel.data.subscribe(function (newValue) {
            var propname = viewModel.property();
            console.log('writeable property ' + propname + ' has changed to ' + newValue);
            viewModel.on_propertychanged(propname, newValue);
        });
    }

    return viewModel;
}

WoT.ViewModels.ThingAction = function (_action, _on_actioninvoked) {
    var viewModel = {
        template_name: ko.observable(_action + '-action-template'),
        action: ko.observable(_action),
        on_actioninvoked: _on_actioninvoked,

        handler: function () {
            viewModel.on_actioninvoked(viewModel.action());
        }
    };
    
    return viewModel;
}


WoT.ViewModels.ThingEvent = function (_event, fieldsdef) {
    var viewModel = {
        event: ko.observable(_event),
        template_name: ko.observable(_event + '-event-template'),
        signalled: ko.observable(false),
        handler: function (data) {
            if (data) {
                for (field in data) {
                    var val = data[field];
                    viewModel[field](val);
                }   
            }
            viewModel.signalled(true);
        }
    };
    
    if (fieldsdef && fieldsdef.fields) {
        var fields = fieldsdef.fields;
        for (i = 0; i < fields.length; i++) {
            viewModel[fields[i]] = ko.observable();
        }
    }
    
    return viewModel;
}



WoT.ViewModels.ThingViewModel = function (_name, _id, _wssendproc) {
    var self = new WoT.ViewModelBase();
    
    self.name = ko.observable(_name);
    self.id = ko.observable(_id);
    self.wssendproc = _wssendproc;

    self.model = ko.observable();
    
    self.properties = ko.observableArray([]);
    self.actions = ko.observableArray([]);
    self.observers = ko.observableArray([]);
    self.events = ko.observableArray([]);
    
    self.set_property = function (property, value) {
        for (var i = 0; i < self.properties().length; i++) {
            var prop = self.properties()[i];
            var prop_name = prop.property();
            if (prop_name == property) {
                prop.set_value(value);
                break;
            }
        }
    }
    
    self.signal_event = function (event, data) {
        for (var i = 0; i < self.events().length; i++) {
            var eventobj = self.events()[i];
            var event_name = eventobj.event();
            if (event_name == event) {
                eventobj.handler(data);
                break;
            }
        }
    }

    self.on_propertychanged = function (property, value) {
        console.log("sending to WoT new property value for " + property + " = " + value);
        var message = {
            thing: self.name(),
            patch: property,
            data: value
        };
        
        self.wssendproc(JSON.stringify(message));
    }
    
    self.on_actioninvoked = function (action, data) {
        try {
            console.log("action " + action + " invoked");
            var message = {};
            message.thing = self.name();
            message.action = action;
            message.data = data;
            self.wssendproc(JSON.stringify(message));
            console.log("action " + action + " sent to server");
        }
        catch (e) {
            WoT.App.ShowError("Error at on_actioninvoked: " + e.message);
        }
    }
    
    self.init_proxy = function () {
        var model = self.model();
        var events = model["@events"];
        var properties = model["@properties"];
        var actions = model["@actions"];        
        
        // initialise events viewmodels
        var events_array = [];
        for (var ev in events) {
            var eventvm = new WoT.ViewModels.ThingEvent(ev, events[ev]);
            events_array.push(eventvm);            
        }
        self.events(events_array); 
        
        // initialise properties viewmodels
        var properties_array = [];
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                var property = new WoT.ViewModels.ThingProperty(prop, properties[prop], self.on_propertychanged, self.name());
                properties_array.push(property);
                property.get_value();
            }
        }        
        self.properties(properties_array);
        
        // initialise the actions viewmodels
        var actions_array = [];        
        for (var act in actions) {
            if (actions.hasOwnProperty(act)) {
                var action = new WoT.ViewModels.ThingAction(act, self.on_actioninvoked);
                actions_array.push(action);
            }
        }        
        self.actions(actions_array);
        
        // now register proxy with thing's server        
        var message = {
            proxy: self.name()
        };        
        self.wssendproc(JSON.stringify(message));

        console.log("registered: " + self.name());
    }
    
    self.init = function () {
        var data = { thing: self.name() };
        $.ajax({
            url: 'api/thing/model',
            type: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(data)
        }).done(function (result) {
            
            if (result.error) {
                return console.log("Error: " + result.error)
            }
            
            console.log("Okay, " + JSON.stringify(result));
            
            self.model(result.model);
            self.init_proxy();

        }).fail(function (jqXHR, textStatus) {
            WoT.App.ShowError(textStatus + " Error, " + jqXHR.responseText);
        });    
    }

    return self;
}