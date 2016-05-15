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


'use strict';

var streembit = streembit || {};

streembit.DEFS = (function (module) {
    return {
        APP_PORT: 8905,             //  Appliction port
        BOOT_PORT: 32319,           //  Discovery port for the Streembit network
        WS_PORT: 32318,             //  Default Web Socket port
        
        TRANSPORT_TCP: "tcp",       //  TCP/IP
        TRANSPORT_WS: "ws",         //  websocket
        
        PRIVATE_NETWORK: "private",
        PUBLIC_NETWORK: "public",
        
        USER_TYPE_HUMAN: "human",
        USER_TYPE_DEVICE: "device",
        USER_TYPE_SERVICE: "service",
        
        ERR_CODE_SYSTEMERR: 0x1000,
        ERR_CODE_INVALID_CONTACT: 0x1001,
        
        PEERMSG_CALL_WEBRTC: "CALL_WEBRTC",
        PEERMSG_CALL_WEBRTCSS: "CALL_WEBRTCSS", // offer share screen
        PEERMSG_CALL_WEBRTCAA: "CALL_WEBRTCAA", // auto audio call (audio call with screen sharing without prompting the user)
        PEERMSG_FILE_WEBRTC: "FILE_WEBRTC",
        PEERMSG_TXTMSG: "TXTMSG",
        PEERMSG_FSEND: "FSEND",
        PEERMSG_FRECV: "FRECV",
        PEERMSG_FEXIT: "FEXIT",
        PEERMSG_DEVDESC_REQ: "DEVDESCREQ",
        PEERMSG_DEVDESC: "DEVDESC",
        PEERMSG_DEVREAD_PROP: "DEVREADPROP",
        PEERMSG_DEVREAD_PROP_REPLY: "DEVREADPROP_REPLY",
        PEERMSG_DEVSUBSC: "DEVSUBSC",
        PEERMSG_DEVSUBSC_REPLY: "DEVSUBSC_REPLY",
        PEERMSG_DEV_EVENT: "DEV_EVENT",
        
        MSG_TEXT: "text",
        MSG_ADDCONTACT: "addcontact",
        MSG_ACCEPTCONTACT: "acceptcontact",
        MSG_DECLINECONTACT: "declinecontact"
    }

}(streembit.DEFS || {}))

module.exports = streembit.DEFS;