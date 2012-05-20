var http_utils = require('../utils/http_utils');
var data_utils = require('../utils/data_utils');

module.exports = function(app){

    app.param('serverId', function(req, res, next, serverId) {
        var server;

        if(!req.session.hasOwnProperty('plexServers')) {
            retrieveServersList(req.session.plexToken, function(data) {
                data_utils.makeSureIsArray(data, "Server");
                req.session.plexServers = data.Server;
                server = findServerById(req.session.plexServers, serverId);
                if(!server) {
                    res.status = 404;
                    res.end("Could not find server in list");
                    return;
                }
                req.server = server;
                next();
                return;
            }, function(err) {
                console.log(err.msg);
                res.statusCode = err.statusCode;
                res.end(err.msg);
            });
            return;

        }
        server = findServerById(req.session.plexServers, serverId);
        if(!server) {
            //TODO: fail would be probably better to send that up the chain
            res.statusCode = 404;
            res.end("Could not find server in list");
            return;

        }

        req.server = server;
        next();
        return;
    });

    app.get('/servers/', function(req,res) {
        retrieveServersList(req.session.plexToken, function(data) {
            data_utils.makeSureIsArray(data, "Server");;
            req.session.plexServers = data.Server;
            res.render('servers/list.jade', { plexServers: req.session.plexServers });
            return;
        }, function(err) {
            console.log(err.msg);
            res.statusCode = err.statusCode;
            res.end(err.msg);
            return;
        });
    });

    app.get('/servers/:serverId/', function(req, res, next){
        res.end();
        return;
    });

    function findServerById(servers, id) {
        var server;

        for(var i=0;i<servers.length;i++) {
            if(servers[i].machineIdentifier == id) {
                server = servers[i];
                break;
            }
        }
        return server;
    }

    function retrieveServersList(authToken, success, failure) {
        var headers = {
            'Content-Length': 0,
            'X-Plex-Platform': 'NodeJS',
            'X-Plex-Platform-Version': process.versions.node,
            'X-Plex-Provides': 'player',
            'X-Plex-Product': 'Plex Web Client',
            'X-Plex-Version': '0.1',
            'X-Plex-Device': '',
            'X-Plex-Client-Identifier': '123456789'
        };
        var options = {
            host: 'my.plexapp.com',
            headers: headers,
            path: '/pms/servers?X-Plex-Token=' + authToken
        };
        http_utils(true, options, 'xml', success, failure);
    }
};