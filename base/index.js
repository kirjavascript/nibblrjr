const config = require('../config.json');
const { ServerNode } = require('../irc/server-node');
const { initWeb } = require('../web/server');
const { Database } = require('../database/index');

process.env.TZ = config.timezone || 'Europe/London';
process.on('uncaughtException', console.error); // pls dont crash

new (class Nibblr {
    constructor() {
        this.dev = process.argv.includes('--dev');
        this.noWebpack = process.argv.includes('--no-webpack');

        this.epoch = new Date();

        Object.assign(this, config);

        // load databases
        this.database = new Database(this);

        // load web interface
        this.web = initWeb(this);

        // load server nodes
        this.servers = this.servers.map(server => (
            new ServerNode(this, server)
        ));
    }
});
