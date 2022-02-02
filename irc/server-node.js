const { Client } = require('irc-upd');
const reserved = require('../base/reserved');

const { mod, updateLoader } = require('./hot-loader');

class ServerNode {
    constructor(parent, config) {

        this.updateLoader = updateLoader;

        this.parent = parent;

        this.get = (key, _default) => {
            return typeof this.config[key] != 'undefined'
                ? this.config[key]
                : typeof this.parent.config[key] != 'undefined'
                    ? this.parent.config[key]
                    : _default;
        }

        this.getTargetCfg = (target, key, _default) => {
            const chan = this.channelLookup[target];
            return chan && (key in chan) ? chan[key] : this.get(key, _default);
        };

        this.getPrintCfg = (target) => {
            return {
                lineLimit: this.getTargetCfg(target, 'lineLimit', 10),
                charLimit: this.getTargetCfg(target, 'charLimit', false),
                colLimit: this.getTargetCfg(target, 'colLimit', 400),
                hasColors: this.getTargetCfg(target, 'colors', true),
            };
        };

        this.setConfig = (config) => {
            this.config = config;

            this.channelLookup = {};

            this.channels = this.config.channels.map(ch => {
                let channel;
                if (typeof ch == 'string') {
                    channel = { name: ch.toLowerCase() };
                } else {
                    ch.name = ch.name.toLowerCase();
                    channel = ch;
                }
                return this.channelLookup[channel.name] = channel;
            });


            this.trigger = this.get('trigger', '~');
        };

        this.createEventManager = () => mod.createEventManager(this);

        this.setConfig(config);

        this.createEventManager();

        this.client = new Client(this.config.address, this.config.nickname, {
            channels: this.channels.map(c => c.name),
            userName: this.get('userName', 'eternium'),
            realName: this.get('realName', 'nibblrjr'),
            floodProtection: this.get('floodProtection', true),
            floodProtectionDelay: this.get('floodProtectionDelay', 250),
            autoRejoin: this.get('autoRejoin', false),
            debug: this.get('debug', false),
        });

        this.setDebug = (active) => {
            const handler = (...args) => {
                if (active) {
                    const prefix = (new Date()).toISOString().slice(11,19) + ' -';
                    console.log(prefix, ...args);
                }
            };
            this.client.out.debug = handler;
            this.client.out.error = handler;
        };

        this.resetBuffer = () => {
            this.client._clearCmdQueue();
        };

        this.dispose = () => {
            clearInterval(this.tick);
            this.client.disconnect(this.get('quitMessage', '._.'));
            this.events.dispose();
            this.database.db.close();
        };

        this.sendRaw = (type, target, text) => {
            if (this.registered) {
                this.client[type](target, text);
            }
        };

        this.database = parent.database.createServerDB(this);

        this.client.addListener('registered', (_message) => {
            this.registered = true;
            if (this.config.password) {
                this.client.say('nickserv', `identify ${this.config.password}`);
            }
            // this gets trashed after each connect
            this.client.conn.addListener('close', (_message) => {
                this.registered = false;
                this.resetBuffer();
            });
        });

        this.client.addListener('error', (message) => {
            console.error(message);
        });

        this.client.addListener('raw', (message) => {
            setTimeout(() => {
                // ensure message enters the log after vm has run
                this.database.log(this, message);
            }, 200);
        });

        this.tick = setInterval(() => {
            this.events.broadcast('tick');
        }, 1000);

        this.client.addListener('message', (from, to, text, message) => {
            if (this.get('ignoreHosts', []).includes(message.host)) return;
            const isPM = to == this.client.nick;
            const target = isPM ? from : to;
            from = from[0] == '#' ? from.toLowerCase() : from;
            to = to[0] == '#' ? to.toLowerCase() : to;
            const msgData = { from, to, text, message, target, isPM };

            this.events.emit('message', {
                target,
                server: this.config.address,
                message: msgData,
            });

            // handle commands

            const { trigger } = this;
            if (text.startsWith(trigger)) {
                const command = mod.parseCommand({ trigger, text });

                // eval
                // > - print output
                // >>/#/% - no output, async IIFE
                if (reserved.includes(command.path)) {
                    const { input, path } = command;
                    const isAsync = path != '>';
                    mod.evaluate({
                        script: input,
                        msgData,
                        node: this,
                        printResult: !isAsync,
                        command,
                    });
                }
                // normal commands
                else if (this.getTargetCfg(target, 'enableCommands', true)) {
                    const cmdData = parent.database.commands.get(command.path);
                    const canBroadcast = this.get('broadcastCommands', [])
                        .includes(command.root);

                    cmdData && !cmdData.event && mod.evaluate({
                        script: cmdData.command,
                        msgData,
                        node: this,
                        canBroadcast,
                        command,
                    });
                }
            }
        });

    }
}

module.exports = {
    ServerNode,
};
