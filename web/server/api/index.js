const vimAPI = require('./vim');
const statsAPI = require('./stats');

function initAPI({ parent, app }) {

    app.get('/api/socketURL', (req, res) => {
        const protocol = req.protocol.includes('https') ? 'wss' : 'ws';
        const url = `${protocol}://${req.hostname}:${parent.web.port}`;
        res.send(parent.web.socketURL || url);
    });

    vimAPI({ parent, app });
    statsAPI({ parent, app });
}

module.exports = initAPI;
