WoT.ViewModels = WoT.ViewModels || {};

WoT.ViewModels.ThingProperty = function (_property, _prop, _on_propertychanged) {
    var viewModel = {
        property: ko.observable(_property),
        type: ko.observable(_prop.type),
        iswriteable: ko.observable((_prop.writeable && _prop.writeable == true) ? true : false),       
        data: ko.observable(_prop.value),
        on_propertychanged: _on_propertychanged,

        //  need this variable to avoid an infinite loop when the property set by the server
        //  so the above subscribe listener don't send back the very same value to the server
        setbyserver: false,

        set_value: function (val) {
            viewModel.setbyserver = true;
            viewModel.data(val);
        }
    };
    
    if (viewModel.iswriteable()) {
        viewModel.data.subscribe(function (newValue) {
            if (viewModel.setbyserver ==  false) {
                console.log(viewModel.property() + ' property has changed');
                viewModel.on_propertychanged(viewModel.property(), newValue);
            }
            else {
                // reset the flag that tracks server/local changes
                viewModel.setbyserver = false;
            }
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


WoT.ViewModels.ThingEvent = function (_event) {
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

    self.on_propertychanged = function (property, value) {
        console.log("setting " + property + " = " + value);
        self.property_values[property] = value;
        var message = {
            name: self.name(),
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
        
        //for (var ev in events) {
        //    if (events.hasOwnProperty(ev)) {
        //        self.observers[ev] = [];
        //        self.observers[ev].push( 
        //            (function (name, data) {
        //                console.log('event name: ' + name + ', data: ' + data);
        //            })
        //        );
        //    }
        //}        
        
        // initialise properties viewmodels
        var properties_array = [];
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                var property = new WoT.ViewModels.ThingProperty(prop, properties[prop], self.on_propertychanged);
                properties_array.push(property);
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
            url: 'api/get_thing_model',
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