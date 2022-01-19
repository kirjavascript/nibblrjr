module.exports = function({ parent, app }) {
    app.post('/api/webhook/:name', (req, res, next) => {
        const { name } = req.params;
        parent.servers.forEach(node => {
            node.events.broadcast(`webhook.${name}`, {
                body: req.body,
            });
        });
        res.json({});
    });
};
