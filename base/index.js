process.env.TZ = 'Europe/London';
const config = require('../config.json');
const { ServerNode } = require('../irc/server-node');

//observer
new (class Nibblr {
    constructor() {
        Object.assign(this, config); // trigger, web, servers

        // load server nodes
        this.servers = this.servers.map(server => (
            new ServerNode(this, server)
        ));

        console.log(this);
        // save config
    }
});
