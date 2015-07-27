var winston = require('winston');
var path = require('path');
var config = require("./config");

var logfilePath = path.join(__dirname, '/logs/application.log');
var exceptionFileLog = path.join(__dirname, '/logs/exception.log');

var level = config.log.level ? config.log.level : "error";

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

function log_error(err) {
    try {
        if (err) {
            //  most of js exceptions have a "message" field
            //  try to use that to get a friendly error message
            if (err.message) {
                logger.error(err.message);
            }
            else {
                logger.error(err);
            }
        }
    }
    catch (e) { }
}

exports.error = log_error;
exports.info = logger.info;
exports.debug = logger.debug;
