/*
 PlexJS - Node.JS Plex media player web client
 Copyright (C) 2012  Jean-François Remy (jeff@melix.org)

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
var http = require('http');
var https = require('https');
var xml2js = require('xml2js');
var negotiate = require('express-negotiate');

module.exports = (function() {
    function request(secure, options, type, success, failure) {
        var serverReq = (secure ? https : http).request(options, function(serverRes) {
            var result = "";
            serverRes.setEncoding('utf8');
            serverRes.on('data', function(chunk){
                result += chunk;
            });
            serverRes.on('end', function(){
                logRequestDetails(secure, options, serverRes.statusCode);
                if(serverRes.statusCode >= 400) {
                    failure({statusCode: serverRes.statusCode, msg: "Error contacting server"});
                    return;
                }
                if(type == 'xml') {
                    var parser = new xml2js.Parser({ mergeAttrs: true });
                    parser.parseString(result, function(err, data) {
                        if(data.hasOwnProperty('size')) {
                            if(data.size == "0") {
                                // Return 404 when accessing an empty MediaContainer
                                failure({statusCode: 404, msg: "Server returned an empty answer"});
                                return;
                            }
                        }
                        success(data);
                        return;
                    });
                    return;
                }
                if(type == 'json') {
                    success(JSON.parse(result));
                    return;
                }
                success(result);
                return;
            });

        }).on('error', function(err) {
                logRequestDetails(secure, options, err.message);
                failure({statusCode: 500, msg: err.message});
                return;
            }).end();
    }

    function logRequestDetails(secure, options, statusCode) {
        var message = 'HTTP_Utils [' + new Date().toUTCString() + '] "';
        message += (options.method ? options.method: 'GET') + ' ';
        message += (secure ? 'https':'http') +'://';
        message += options.host + ":" + options.port;
        message += options.path;
        message += '" ';
        message += statusCode;
        console.log(message);
    }

    function answerBasedOnAccept(req, res, viewName, data) {
        // Two options. Either Accept content-type is set to 'application/json', in which case, we just return
        // the json data in the response
        // Otherwise, we return the rendered page
        req.negotiate({
            "application/json": function() {
                res.contentType('application/json');
                res.json(data);
            },
            "html,default": function() {
                res.render(viewName, data);
            }
        });
    }

    return {
        request: request,
        answerBasedOnAccept: answerBasedOnAccept
    }
})();