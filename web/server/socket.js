const WebSocket = require('ws');

module.exports = function initSocket({parent, server}) {
    const wss = new WebSocket.Server({server});

    wss.sendAll = (data) => {
        wss.clients.forEach((client) => {
            if (client.readyState == WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    };

    wss.on('connection', (ws) =>  {
        ws.sendObj = (obj) => {
            return ws.send(JSON.stringify(obj));
        };
        ws.on('message', (message) => {
            const data = JSON.parse(message);
            ws.sendObj({list: [1, 2, 3],});
        });
    });

    return wss;
};
