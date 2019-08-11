function initAPI({ parent, app }) {
    const { commands } = parent.database;

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
    app.get('/api/command/list', (req, res) => {
        res.json(commands.list());
    });
}

module.exports = initAPI;
