var applog = require('../../logger'); // the logger name is used by express internally so call here the log obj "applog"
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var exphbs = require('express-handlebars');
var main_routes = require('./routes/main');
var api_routes = require('./routes/api');
var favicon = require('serve-favicon');

var config = global.appconfig;

applog.info("WoT Express server start");

//  init the express app
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.engine('handlebars', exphbs({
    // the server runs in a sub directory instead of in the root (which is the default implementation) 
    // and the layouts directory must be specified here
    layoutsDir: path.join(__dirname, 'views/layouts'), 
    defaultLayout: 'main',
    helpers: {
        section: function (name, options) {
            if (!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
}));

app.set('view engine', 'handlebars');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', main_routes);
app.use('/api', api_routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;

var port = config.servers.web.port;
app.set('port', port);

var server = app.listen(app.get('port'), function () {
    applog.info('WoT Express server listening on port ' + server.address().port);
});


