const { readFileSync } = require('fs');

module.exports = ({ app, parent }) => {
    const htmlTemplate = readFileSync(__dirname + '/index.html', 'utf8');
    const { pasta } = parent.database;
    const btoa = str => Buffer.from(str).toString('base64');

    app.get('/:type(html|text)/:cmd/:name', (req, res) => {
        const { cmd, name, type } = req.params;
        pasta.load(cmd, name)
            .then(data => {
                if (type === 'html') {
                    res.send(htmlTemplate.replace(/----content----/, btoa(data)));
                } else {
                    res.type('text');
                    res.send(data);
                }
            })
            .catch(() => {
                res.sendStatus(404);
            });
    });
};
