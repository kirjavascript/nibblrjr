const WebSocket = require('ws');
const { stringify, parse } = require('zipson');

module.exports = function initSocket({parent, server}) {
    const wss = new WebSocket.Server({server});

    // type, data
    wss.sendAll = (_type, obj = {}) => {
        wss.clients.forEach((client) => {
            if (client.readyState == WebSocket.OPEN) {
                client.send(stringify({ ...obj, _type, }));
            }
        });
    };

    wss.on('connection', (ws) =>  {
        ws.sendObj = (_type, obj = {}) => {
            ws.send(stringify({ ...obj, _type, }));
        };

        ws.on('message', (message) => {
            try {
                const { _type, ...obj }= parse(message);
                console.log(_type);
            }
            catch (e) {
                console.error(e);
            }
        });
    });

    return wss;
};
