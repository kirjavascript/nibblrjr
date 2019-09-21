const fs = require('fs');
const path = require('path');
const vimAPI = require('./vim');
const statsAPI = require('./stats');

function initAPI({ parent, app }) {

    app.get('/api/socketURL', (req, res) => {
        const protocol = req.protocol.includes('https') ? 'wss' : 'ws';
        const url = `${protocol}://${req.hostname}:${parent.web.port}`;
        res.send(parent.web.socketURL || url);
    });

    app.get('/api/docs', (req, res) => {
        const docs = path.join(__dirname, '../../../DOCUMENTATION.md');
        fs.readFile(docs, 'utf8', (err, src) => {
            res.send(src);
        });
    });

    vimAPI({ parent, app });
    statsAPI({ parent, app });
}

module.exports = initAPI;
