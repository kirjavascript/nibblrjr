module.exports = function({ parent, app }) {
    app.use('/api/webhook/:name', (req, res, next) => {
        const { name } = req.params;
        parent.servers.forEach(node => {
            node.events.broadcast(`webhook.${name}`, {
                method: req.method,
                body: req.body,
                query: req.query,
                ip: req.ip,
            });
        });
        res.json({});
    });
};
