
function initAPI(parent, app) {
    app.get('/api/get-command/:name', (req, res) => {
        res.json({test:1});
    });
}

module.exports = initAPI;
