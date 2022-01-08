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

        this.setConfig = (config) => {
            this.config = config;

            this.channels = this.config.channels.map(ch => {
                if (typeof ch == 'string') {
                    return { name: ch.toLowerCase() };
                } else {
                    ch.name = ch.name.toLowerCase();
                    return ch;
                }
            });

            this.trigger = this.get('trigger', '~');
        };

        this.setConfig(config);

        mod.createEventManager(this);

        // TODO: make getChannelConfig inherit

        this.getChannelConfig = (name) => {
            return this.channels.find(ch => ch.name == name) || {};
        };

        this.getLineLimit = (target) => {
            return this.getChannelConfig(target).lineLimit || 10;
        };

        this.client = new Client(this.config.address, this.config.nickname, {
            channels: this.channels.map(c => c.name),
            userName: this.get('userName', 'eternium'),
            realName: this.get('realName', 'nibblrjr'),
            floodProtection: this.get('floodProtection', true),
            floodProtectionDelay: this.get('floodProtectionDelay', 250),
            autoRejoin: this.get('autoRejoin', false),
            debug: this.get('debug', false),
        });

        this.resetBuffer = () => {
            this.client._clearCmdQueue();
        };

        this.dispose = (...args) => {
            this.resetBuffer();
            // clearTimeout(this.tick);
            this.client.disconnect(...args);
            this.events.dispose();
        };

        this.sendRaw = (type, target, text) => {
            if (this.registered) {
                this.client[type](target, text);
            }
        };

        this.database = parent.database.createServerDB(this);

        this.client.addListener('registered', (message) => {
            this.registered = true;
            if (this.config.password) {
                this.client.say('nickserv', `identify ${this.config.password}`);
            }
            // this gets trashed after each connect
            this.client.conn.addListener('close', (message) => {
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

        // check tick events that have elapsed
        // this.tick = () => {
        //     setTimeout(this.tick, 1000);
        //     if (this.registered) {
        //         this.database.eventFns.tickElapsed()
        //             .forEach(row => {
        //                 const msgData = {
        //                     from: row.user,
        //                     to: row.target.toLowerCase(),
        //                     target: row.target.toLowerCase(),
        //                     isPM: row.user.toLowerCase() == row.target.toLowerCase(),
        //                     // text, message
        //                 };
        //                 const { ignoreEvents } = this.getChannelConfig(msgData.to);
        //                 const inChannel = !!Object.entries(this.client.chans)
        //                     .find(([key]) => key.toLowerCase() == msgData.target);

        //                 if (msgData.isPM || (!ignoreEvents && inChannel)) {
        //                     const cmdData = parent.database.commands
        //                         .get(row.callback);
        //                     if (cmdData) {
        //                         const { command, name } = cmdData;
        //                         mod.evaluate({
        //                             script: command,
        //                             msgData,
        //                             node: this,
        //                             event: row,
        //                             command: mod.parseCommand({ text: name })
        //                         });
        //                     }
        //                     this.database.eventFns.delete(row.idx);
        //                 }
        //             });
        //     }
        // };
        // setTimeout(this.tick, 5000);

        this.client.addListener('message', (from, to, text, message) => {
            if (this.get('ignoreHosts', []).includes(message.host)) return;
            const isPM = to == this.client.nick;
            const target = isPM ? from : to;
            from = from[0] == '#' ? from.toLowerCase() : from;
            to = to[0] == '#' ? to.toLowerCase() : to;
            const msgData = { from, to, text, message, target, isPM };

            // TODO: remove print once events are here
            const { print } = mod.createNodeSend(this, target);
            const { trigger } = this;

            this.events.emit('message', { ...msgData, server: this.config.address });

            // check speak events that have elapsed

            // if (isPM || !this.getChannelConfig(to).ignoreEvents) {
            //     this.database.eventFns.speakElapsed(from)
            //         .forEach(row => {
            //             const cmdData = parent.database.commands.get(row.callback);
            //             if (cmdData) {
            //                 const { command, name } = cmdData;
            //                 mod.evaluate({
            //                     script: command,
            //                     msgData,
            //                     node: this,
            //                     event: row,
            //                     command: mod.parseCommand({ text: name })
            //                 });
            //             }
            //             this.database.eventFns.delete(row.idx);
            //         });
            // }

            // handle commands

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
                else if (this.get('enableCommands', true)) {
                    const cmdData = parent.database.commands.get(command.path);
                    const canBroadcast = this.get('broadcastCommands', [])
                        .includes(command.root);

                    cmdData && mod.evaluate({
                        script: cmdData.command,
                        msgData,
                        node: this,
                        canBroadcast,
                        command,
                    });
                }
            }
            // handle IBIP (https://git.teknik.io/Teknikode/IBIP)
            else if (this.get('enableIBIP', true) && text == '.bots') {
                print(`Reporting in! [JavaScript] use ${trigger}help`);
            }
            // parse URLS
            else if (this.get('fetchURL', true)) {
                const showAll = this.getChannelConfig(msgData.to).fetchURLAll;
                mod.fetchURL({ text, print, showAll });
            }
        });

    }
}

module.exports = {
    ServerNode,
};
