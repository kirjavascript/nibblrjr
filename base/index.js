const config = require('../config.json');
const { ServerNode } = require('../irc/server-node');
const { initWeb } = require('../web/server');
const { Database } = require('../database/index');

process.env.TZ = config.timezone || 'Europe/London';

new (class Nibblr {
    constructor() {
        this.dev = process.argv.includes('--dev');

        Object.assign(this, config);
        // trigger, web, servers

        // load web interface
        this.web = initWeb(this);

        // load databases
        this.database = new Database(this);

        // load server nodes
        this.servers = this.servers.map(server => (
            new ServerNode(this, server)
        ));
    }
});
