/*
 
This file is part of W3C Web-of-Things-Framework.

W3C Web-of-Things-Framework is an open source project to create an Internet of Things framework.
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by 
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

W3C Web-of-Things-Framework is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with W3C Web-of-Things-Framework.  If not, see <http://www.gnu.org/licenses/>.
 
File created by Tibor Zsolt Pardi

Copyright (C) 2015 The W3C WoT Team
 
*/


var ECFieldElementFp = require('./field-element')
var ECPointFp = require('./point')
var ECCurveFp = require('./curve')
var getECParams = require('./names')

//for legacy compatibility, remove in the future
ECCurveFp.ECPointFp = ECPointFp

module.exports = {
    ECCurveFp: ECCurveFp,
    ECFieldElementFp: ECFieldElementFp,
    ECPointFp: ECPointFp,
    getECParams: getECParams
}

