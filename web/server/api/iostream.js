const listeners = new Map();

const ioStream = (string => listeners.forEach(value => value(string)));

const boundProcessStdout = process.stdout.write.bind(process.stdout)
const boundProcessStderr = process.stderr.write.bind(process.stderr)

process.stdout.write = (string, encoding, fd) => {
    boundProcessStdout(string, encoding, fd);
    ioStream(string, encoding, fd, false);
};

process.stderr.write = (string, encoding, fd) => {
    boundProcessStderr(string, encoding, fd);
    ioStream(string, encoding, fd, true);
};

module.exports = function({ app }) {
    app.get('/api/iostream', (req, res) => {
        if (!req.isAdmin) return res.send('no access');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // start server send events
        res.write('\uFEFF'); // BOM
        const key = Symbol();
        const listener = (args) => {
            res.write(args);
        };
        listeners.set(key, listener);
        res.on('close', () => {
            listeners.delete(key);
            res.end();
        });
    });
};
