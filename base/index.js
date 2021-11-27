const fs = require('fs');
const config = require('../config.json');
const { ServerNode } = require('../irc/server-node');
const { initWeb } = require('../web/server');
const { Database } = require('../database/index');

// setup env

process.env.TZ = config.timezone || 'Europe/London';
process.on('uncaughtException', console.error); // pls dont crash

// create storage dirs

['cache', 'storage']
    .forEach(dir => {
        const path = __dirname + '/../' + dir;
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    });

// init

new (class Nibblr {
    constructor() {
        this.dev = process.argv.includes('--dev');

        this.epoch = new Date();

        this.config = config;

        // load databases
        this.database = new Database(this);

        // load server nodes
        this.servers = this.config.servers.map(server => (
            new ServerNode(this, server)
        ));

        // load web interface
        if (this.config.web) {
            initWeb(this);
        }
    }
});
