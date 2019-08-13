function initAPI({ parent, app }) {
    const { commands } = parent.database;

    app.use('/api/*', (req, res, next) => {
        req.isAdmin = req.body.password === parent.web.password;
        next();
    });

    app.get('/api/command/get/:name', (req, res) => {
        const { name } = req.params;
        const command = commands.get(name);
        if ('raw' in req.query) {
            res.set('Content-Type', 'text/plain')
                .send(command.command);
        } else {
            res.json(command || { error: 'no such command ' + name });
        }
    });

    app.post('/api/command/set/:name', (req, res) => {
        const { name } = req.params;
        const { command } = req.body;
        const info = commands.get(name);
        if (!info) {
            res.json({ error: 'no such command' + name })
        } else if (!info.locked || req.isAdmin) {
            commands.set(name, command);
            res.json({});
        } else {
            res.json({ error: 'no access' });
        }
    });

    app.get('/api/command/list', (req, res) => {
        res.json(commands.list());
    });
}

module.exports = initAPI;
