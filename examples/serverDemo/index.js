#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');
/**
 * @name websocket服务端
 * @desc 本地调试使用的websocket服务端代码
 */
const clientConnectMap = new Map();
const hostRemoteMap = new Map();
let hostClientId = '';
let remoteClientId = '';
const getUniqueID = function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4();
};
var server = http.createServer(function(request, response) {
    console.log(new Date() + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8085, function() {
    console.log(new Date() + ' Server is listening on port 8085');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function(request) {
    const query = request.resourceURL.query;
    let isHost = query.isHost === 'true';
    if (isHost) {
        hostClientId = query.localClientId;
    } else {
        remoteClientId = query.localClientId;
        hostClientId = query.relationClientId;
    }

    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log(new Date() + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    if (!hostClientId) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log(new Date() + '没有相应的主机端');
        return;
    }
    if (remoteClientId && !clientConnectMap.get(hostClientId)) {
        request.reject();
        console.log(new Date() + '响应的主机id没有连接');
        return;
    }

    var connection = request.accept(null, request.origin);
    if (isHost) {
        // 保存主机的连接
        clientConnectMap.set(hostClientId, connection);
    } else {
        // 保存远程端的连接
        clientConnectMap.set(remoteClientId, connection);
    }
    console.log(new Date() + ' Connection accepted.');

    connection.sendUTF(JSON.stringify({ messageType: 'connectSuccess', messageContent: 'success' }));
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            let data = JSON.parse(message.utf8Data);
            if (data.messageType === 'heart') {
                connection.sendUTF(JSON.stringify({ messageType: 'heart', messageContent: 'success' }));
            }
            if (data.messageType === 'forward') {
                if (isHost) {
                    if (clientConnectMap.get(remoteClientId)) clientConnectMap.get(remoteClientId).sendUTF(JSON.stringify(data));
                } else {
                    if (clientConnectMap.get(hostClientId)) clientConnectMap.get(hostClientId).sendUTF(JSON.stringify(data));
                    else {
                        console.log('没有响应的主机');
                        connection.close();
                    }
                }
            }
            // connection.sendUTF(message.utf8Data);
        } else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log(new Date() + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});
