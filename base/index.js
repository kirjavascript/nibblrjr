const config = require('../config.json');
const { ServerNode } = require('../irc/server-node');
const { initWeb } = require('../web/index');
const { Database } = require('../database/index');

process.env.TZ = config.timezone || 'Europe/London';

//observer
new (class Nibblr {
    constructor() {
        Object.assign(this, config);
        // trigger, web, servers

        // load web interface
        const webServer = initWeb(this);

        // load databases
        this.database = new Database(this);

        // load server nodes
        this.servers = this.servers.map(server => (
            new ServerNode(this, server)
        ));

        // setup databases



        console.log(this);
        // save config
    }
});
