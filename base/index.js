const fs = require('fs');
const { join } = require('path');
const { initWeb } = require('../web/server');
const { Database } = require('../database/index');
const { loadAcquire } = require('../irc/evaluate/acquire');

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

        // called when commands are changed
        this.reloadEvents = () => {
            this.servers.forEach(node => {
                node.events.reloadEvents().catch(console.error);
            });
        };

        this.database = new Database(this);

        this.servers = [];

        this.loadConfig = () => {
            console.log(`loading ${configPath}`);
            const { ServerNode } = require('../irc/server-node');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.config = config;
            process.env.TZ = config.timezone || 'Europe/London';

            // update + create

            config.servers.forEach((server) => {
                const node = this.servers.find(
                    (node) => node.config.address === server.address,
                );
                if (node) {
                    node.setConfig(server);
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
                    node.dispose();
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

        let debounce;
        fs.watch(configPath, () => {
            if (!debounce) {
                debounce = true;
                setTimeout(() => {
                    debounce = false;
                    this.loadConfig();
                }, 500);
            }
        });

        loadAcquire(() => {
            this.loadConfig();
        });
    }
})();
