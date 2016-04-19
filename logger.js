var path = require('path');
var fs = require('fs');
var winston = require('winston');

var config = global.appconfig;

var logDir = path.join(__dirname, '/logs');

fs.open(logDir, 'r', function (err, fd) {
    if (err && err.code == 'ENOENT') {
        /* the directory doesn't exist */
        console.log("Creating logs directory ...");
        fs.mkdir(logDir, function (err) {
            if (err) {
                // failed to create the log directory, most likely due to insufficient permission
                console.log("Error in creating logs directory: " + err.message ? err.message : err);
            }
            else {
                console.log("Logs directory created");
            }
        });
    }
});

var logfilePath = path.join(__dirname, '/logs/application.log');
var exceptionFileLog = path.join(__dirname, '/logs/exception.log');

var level = config && config.log && config.log.level ? config.log.level : "error";

var logger = new (winston.Logger)({
    exitOnError: false,
    transports: [
        new winston.transports.Console({
            level: 'debug',
            json: false,
            colorize: true
        }),
        new (winston.transports.File)({
            filename: logfilePath,
            level: level,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: exceptionFileLog,
            json: true
        }),
        new winston.transports.Console({
            level: 'debug',
            json: false,
            colorize: true
        })
    ]
});

function log_log(level, msg, val1, val2, val3, val4) {
    try {        
        if (msg) {
            //  most of js exceptions have a "message" field
            //  try to use that to get a friendly error message
            if (msg.message) {
                logger.log(level, msg.message);
            }
            else {
                if (val1 && val2 && val3 && val4) {
                    logger.log(level, msg, val1, val2, val3, val4);
                }
                else if (val1 && val2 && val3) {
                    logger.log(level, msg, val1, val2, val3);
                }
                else if (val1 && val2) {
                    logger.log(level, msg, val1, val2);
                }
                else if (val1) {
                    logger.log(level, msg, val1);
                }
                else {
                    logger.log(level, msg);
                }
            }
        }
    }
    catch (e) {
        if (msg) {
            // still log to the console
            console.log(msg.message ? msg.message : msg);
        }
        }
    }

function log_error(msg, val1, val2, val3, val4) {
	log_log('error', msg, val1, val2, val3, val4);
}

function log_info(msg, val1, val2, val3, val4) {
	log_log('info', msg, val1, val2, val3, val4);
            }

function log_debug(msg, val1, val2, val3, val4) {
	log_log('debug', msg, val1, val2, val3, val4);
}

// write stream object
var log_stream = {
    write: function(message, encoding){
        log_info(message);
    }
};

exports.error = log_error;
exports.info = log_info;
exports.debug = log_debug;
exports.stream = log_stream;
