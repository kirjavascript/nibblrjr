function initAPI({ parent, app }) {
    const { commands } = parent.database;

    app.use('/api/*', (req, res, next) => {
        req.isAdmin = req.body.password === parent.web.password;
        res.getCommand = (name) => {
            const info = commands.get(name);
            if (!info) {
                res.json({ error: 'no such command ' + name }).end();
            }
            return info;
        };
        next();
    });

    app.get('/api/command/get/:name', (req, res) => {
        const { name } = req.params;
        const info = res.getCommand(name);
        if ('raw' in req.query) {
            res.set('Content-Type', 'text/plain')
                .send(info.command);
        } else {
            res.json(info);
        }
    });

    app.post('/api/command/set/:name', (req, res) => {
        const { name } = req.params;
        const { command } = req.body;
        const info = res.getCommand(name);
        if (!info.locked || req.isAdmin) {
            commands.set(name, command);
            res.json({});
        } else {
            res.json({ error: 'no access' });
        }
    });

    app.post('/api/command/new/:name', (req, res) => {
        const result = commands.new(req.params.name, req.isAdmin);
        res.json(result ? {} : { error: '???' });
    });

    app.post('/api/command/delete/:name', (req, res) => {
        const { name } = req.params;
        const info = res.getCommand(name);
        if (!info.locked || req.isAdmin) {
            commands.delete(name);
            res.json({});
        } else {
            res.json({ error: 'no access' });
        }
    });

    app.post('/api/command/set-config/:name', (req, res) => {
        if (req.isAdmin) {
            commands.setConfig(req.params.name, req.body);
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
