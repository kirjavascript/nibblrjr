const fs = require('fs');
const path = require('path');
const commandsAPI = require('./commands');
const statsAPI = require('./stats');

function initAPI({ parent, app }) {

    app.get('/api/socketURL', (req, res) => {
        const protocol = req.protocol.includes('https') ? 'wss' : 'ws';
        const url = `${protocol}://${req.hostname}:${parent.web.port}`;
        res.send(parent.web.socketURL || url);
    });

    app.get('/api/docs', (_req, res) => {
        const docs = path.join(__dirname, '../../../DOCUMENTATION.md');
        fs.readFile(docs, 'utf8', (_err, src) => {
            res.send(src || 'missing documentation');
        });
    });

    app.get('/api/readme', (_req, res) => {
        const docs = path.join(__dirname, '../../../README.md');
        fs.readFile(docs, 'utf8', (_err, src) => {
            res.send(src || 'missing README');
        });
    });

    statsAPI({ parent, app });

    // auth

    const basicAuth = /^\s*basic\s+(.+)$/i
    app.use('/api/*', (req, _res, next) => {
        const Xauth = req.headers['x-authorization'];
        const authorization = Xauth || req.headers.authorization;
        if (authorization && basicAuth.test(authorization)) {
            const [, creds] = authorization.match(basicAuth);
            const credsString = Buffer.from(creds, 'base64').toString();
            const [, password] = credsString.match(/^(?:[^:]*):(.*)$/);
            req.isAdmin = password === parent.web.password;
        } else {
            req.isAdmin = false;
        }
        next();
    });

    app.use('/api/is-admin', (req, res) => {
        res.json(req.isAdmin);
    });

    // auth APIs

    commandsAPI({ parent, app });
}

module.exports = initAPI;
