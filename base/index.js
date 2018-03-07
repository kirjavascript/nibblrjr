const config = require('../config.json');
const { ServerNode } = require('../irc/server-node');

process.env.TZ = config.timezone || 'Europe/London';

//observer
new (class Nibblr {
    constructor() {
        Object.assign(this, config);
        // trigger, web, servers

        // load server nodes
        this.servers = this.servers.map(server => (
            new ServerNode(this, server)
        ));

        console.log(this);
        // save config
    }
});
