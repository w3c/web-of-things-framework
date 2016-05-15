/*
 
This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


var path = require('path');
var fs = require('fs');

exports.ensure_dbdir_exists = function (dbdir, callback) {
    
    var dbpath = path.join(__dirname, 'db', dbdir);

    fs.open(dbpath, 'r', function (err, fd) {
        if (err && err.code == 'ENOENT') {
            // not exists
            try {
                fs.mkdirSync(dbpath);
            }
            catch (e) {
                logger.error("creating " + dbpath + " directory error: " + e.message);
            }

            fs.open(dbpath, 'r', function (err, fd) {
                callback(err)
            });
        }
        else {
            // directory exists
            callback();
        }
    });
}
