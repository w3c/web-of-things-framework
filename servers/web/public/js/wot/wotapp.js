var WoT = WoT || {};

(function (WoT, $, ko) {

    WoT.App = WoT.App || {};
    
    WoT.App.ShowError = function (err, time, mode) {
        var errmsg = '';

        try { 
            if (typeof err == 'string') {
                errmsg = err;
            }
            else {
                if (err && err.message != null) {
                    errmsg = err.message;
                }
            }                
        }
        catch (e) { }
        
        if (!errmsg) {
            errmsg = "WoT application error";
        }
        
        if (mode && mode.type && mode.type == 'dialog') {
            BootstrapDialog.alert({
                title: "Error",
                message: errmsg,
                closable: true,
                type: BootstrapDialog.TYPE_DANGER
            });
        }
        else {
            ko.postbox.publish("AppAlert", WoT.App.CreateAlert("danger", errmsg, time ? time : 8000));
        }
    }

    WoT.App.CreateAlert = function (type, message, visibleTime) {
        return {
            alertClass: type,
            alertMessage: message,
            alertTime: visibleTime
        };
    };    

})(WoT, $, ko);


(function ($, ko) {
    
    ko.postbox.subscribe("AppAlert", function (msg) {
        var classname = msg.alertClass == "danger" ? "danger" : "clean";
        var title = msg.alertClass == "danger" ? "Error" : "Info";
        $.gritter.add({
            position: 'top-right',
            title: title,
            text: msg.alertMessage,
            class_name: classname,
            time: msg.alertTime ? msg.alertTime : 8000
        });
    });
    

})($, ko);



(function ($, ko) {
    
    WoT.ViewModelBase = function () {

        this.showdialog = function (dlgview) {
            var dlgcontent = $('#dlg-container').find('.modal-content');
            $(dlgcontent).empty();
            
            // TODO get the dialog
        };        
        
        this.hidedlg = function () {
            var dlgcontent = $('#dlg-container').find('.modal-content');
            $(dlgcontent).empty();
            $('#dlg-container').modal('hide');
        };

        this.blockitems = ko.observableArray([]);
        
        this.getBlockItems = function (request) {
            var items = [];
            for (i = 0; i < this.blockitems().length; i++) {
                if (request.event = this.blockitems()[i].event) {
                    items.push(this.blockitems()[i]);
                }
                if (request.target) {
                    if (request.target = this.blockitems()[i].target) {
                        items.push(this.blockitems()[i]);
                    }
                }
            }
            return items;
        }
        
        this.showBlockUi = function (request) {
            var styles = { padding: '20px 40px', border: '2px solid #ddd', backgroundColor: '#f6f6f6', width: '500px' };
            var element = null;
            if (request.id) {
                var id = request.id;
                element = document.getElementById(id);
            }
            else if (request.target) {
                element = request.target;
            }
            if (element && request.message) {
                $(element).block({ message: request.message, css: styles });
                this.blockitems.push(request);
            }
        }
        
        this.hideBlockUi = function (request) {
            if (!request) return;
            
            var force = request.force;
            if (force == true) {
                for (i = 0; i < this.blockitems().length; i++) {
                    var item = this.blockitems()[i];
                    var id = item.id;
                    var element = document.getElementById(id);
                    $(element).unblock();
                    this.blockitems.remove(items[i]);
                }
            }
            else {
                var items = this.getBlockItems(request);
                if (items) {
                    for (var i = 0; i < items.length; i++) {
                        var element = null;
                        if (items[i].id) {
                            var id = items[i].id;
                            element = document.getElementById(id);
                        }
                        else if (items[i].target) {
                            element = items[i].target
                        }
                        if (element) {
                            $(element).unblock();
                            this.blockitems.remove(items[i]);
                        }
                    }
                }
            }
        }

    };

})($, ko);


(function ($, ko) {
    WoT.Utils = WoT.Utils || {};
    
    WoT.Utils.toFixed = function (number, precision) {
        var val = +(Math.round(+(number.toString() + 'e' + precision)).toString() + 'e' + -precision);
        return val.toString();
    }
    
    WoT.Utils.formatDigits = function (val, digits) {
        var value = 0;
        if (!isNaN(val)) {
            value = parseFloat(val);
            var strval = ('' + value);
            var pos = strval.indexOf('.');
            var decimals = pos == -1 ? digits : strval.substr(pos + 1).length;
            digits = decimals < digits ? digits : decimals;
        }
        
        return value.toFixed(digits).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
    }    

})($, ko);


ko.bindingHandlers.bellring = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        try {
            var allBindings = allBindingsAccessor();
            var interval = allBindings.interval || 5000;
            var obj = valueAccessor();
            var signalled = ko.utils.unwrapObservable(obj);
            if (signalled) {
                $(element).show();
                setTimeout(function () {
                    $(element).hide();
                    obj(false);
                }, interval);
            }
            else {
                $(element).hide();
            }
        }
        catch (e) { }
    }
};


ko.bindingHandlers.digitsnum =  {    
    update: function (element, valueAccessor, allBindings) {
        var value = ko.utils.unwrapObservable(valueAccessor()) || 0;
        var digits = allBindings.get('digits') ? parseInt(allBindings.get('digits')) : 4;
        var num = isNaN(value) ? 0 : parseFloat(value);
        if (isNaN(num)) {
            var zeroText = "0.";
            for (var i = 0; i < digits; i++) {
                zeroText += "0";
            }
            $(element).val(zeroText);
            return;
        }
        value = num;
        var amount = WoT.Utils.formatDigits(value, digits);
        $(element).text(amount);
    }
}