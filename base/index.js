const fs = require('fs');
const { join } = require('path');
const { ServerNode } = require('../irc/server-node');
const { initWeb } = require('../web/server');
const { Database } = require('../database/index');

process.on('uncaughtException', console.error);

// create storage dirs

['cache', 'storage'].forEach((dir) => {
    const path = join(__dirname, '..', dir);
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
});

const configPath = join(__dirname, '..', 'config.json');

new (class Nibblr {
    constructor() {
        this.dev = process.argv.includes('--dev');
        this.epoch = new Date();

        this.database = new Database(this);

        this.servers = [];

        this.loadConfig = () => {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.config = config;
            process.env.TZ = config.timezone || 'Europe/London';

            // update + create

            config.servers.forEach((server) => {
                const node = this.servers.find(
                    (node) => node.config.address === server.address,
                );
                if (node) {
                    node.config = server;
                } else {
                    this.servers.push(new ServerNode(this, server));
                }
            });

            // remove

            const configAddresses = config.servers.map(
                (server) => server.address,
            );
            this.servers = this.servers.filter((node) => {
                if (!configAddresses.includes(node.config.address)) {
                    node.disco();
                    return false;
                }
                return true;
            });

            // web interface

            if (config.web && !this.webServer) {
                this.webServer = initWeb(this);
            }
            if (!config.web && this.webServer) {
                this.webServer.close();
                this.webServer = undefined;
            }
        };

        let changing;
        fs.watch(configPath, () => {
            if (!changing) {
                changing = true;
                setTimeout(() => {
                    changing = false;
                    this.loadConfig();
                }, 500);
            }
        });

        this.loadConfig();

        // this.config = config;

        // load databases

        // load server nodes
        // this.servers = this.config.servers.map(server => (
        //     new ServerNode(this, server)
        // ));
    }
})();
