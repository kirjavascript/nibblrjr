const { readFileSync } = require('fs');

module.exports = ({ app, parent }) => {

    const htmlTemplate = readFileSync(__dirname + '/index.html', 'utf8');

    app.get('/html/:cmd/:name', (_req, res) => {
        // handle 404
        res.send();

    });

    // IRC.copypasta
    app.get('/text/:cmd/:name', (_req, res) => {
        res.send();

    });
};
