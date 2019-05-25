const { Client } = require('irc');

const { mod, updateLoader } = require('./hot-loader');

class ServerNode {
    constructor(parent, server) {

        this.updateLoader = updateLoader;

        Object.assign(this, server, { parent });
        // { address, channels, trigger, nickname, password, colors }

        this.channels = this.channels.map(ch => {
            if (typeof ch == 'string') {
                return { name: ch.toLowerCase() };
            } else {
                ch.name = ch.name.toLowerCase();
                return ch;
            }
        });

        this.get = (key, _default) => {
            return typeof this[key] != 'undefined'
                ? this[key]
                : typeof this.parent[key] != 'undefined'
                    ? this.parent[key]
                    : _default;
        }

        this.getChannelConfig = (name) => {
            return this.channels.find(ch => ch.name == name) || {};
        };

        this.getLineLimit = (msgData) => {
            return this.getChannelConfig(msgData.to).lineLimit
                || (msgData.isPM ? 50 : 10);
        };

        this.trigger = this.get('trigger', '!');

        this.client = new Client(this.address, this.nickname, {
            channels: this.channels.map(c => c.name),
            userName: this.get('userName', 'eternium'),
            realName: this.get('realName', 'nibblrjr IRC framework'),
            floodProtection: this.get('floodProtection', true),
            floodProtectionDelay: this.get('floodProtectionDelay', 250),
            autoRejoin: this.get('autoRejoin', true),
            // debug: true,
        });

        this.timeouts = [];
        this.intervals = [];

        this.resetBuffer = () => {
            this.client._clearCmdQueue();
            this.intervals.forEach(clearInterval);
            this.timeouts.forEach(clearTimeout);
            this.intervals = [];
            this.timeouts = [];
        };

        this.sendRaw = (type, target, text) => {
            if (this.registered) {
                this.client[type](target, text);
            }
        };

        this.database = parent.database.createServerDB(this);

        this.client.addListener('registered', (message) => {
            this.registered = true;
            if (this.password) {
                this.client.say('nickserv', `identify ${this.password}`);
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
            this.database.log(this, message);
        });

        // check tick events that have elapsed
        this.tick = () => {
            setTimeout(this.tick, 5000);
            if (this.registered) {
                this.database.eventFns.tickElapsed()
                    .forEach(row => {
                        const msgData = {
                            from: row.user,
                            to: row.target.toLowerCase(),
                            target: row.target.toLowerCase(),
                            isPM: row.user.toLowerCase() == row.target.toLowerCase(),
                            // text, message
                        };
                        const { ignoreEvents } = this.getChannelConfig(msgData.to);
                        const inChannel = !!Object.entries(this.client.chans)
                            .find(([key]) => key.toLowerCase() == msgData.target);

                        if (msgData.isPM || (!ignoreEvents && inChannel)) {
                            const cmdData = parent.database.commands
                                .get(row.callback);
                            if (cmdData) {
                                const { command, name } = cmdData;
                                mod.evaluate({
                                    script: command,
                                    msgData,
                                    node: this,
                                    event: row,
                                    command: mod.parseCommand({ text: name })
                                });
                            }
                            this.database.eventFns.delete(row.idx);
                        }
                    });
            }
        };
        setTimeout(this.tick, 5000);

        this.client.addListener('message', (from, to, text, message) => {
            if (this.get('ignore-hosts', []).includes(message.host)) return;
            const isPM = to == this.client.nick;
            const target = isPM ? from : to;
            from = from[0] == '#' ? from.toLowerCase() : from;
            to = to[0] == '#' ? to.toLowerCase() : to;
            const msgData = { from, to, text, message, target, isPM };
            const { print } = mod.createNodeSend(this, msgData);
            const { trigger } = this;

            // handle commands

            if (text.startsWith(trigger)) {
                const command = mod.parseCommand({ trigger, text });

                // eval
                // > - print output
                // #/% - no output, async IIFE
                if (['>','#','%'].includes(command.path)) {
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
                else {
                    const cmdData = parent.database.commands.get(command.path);
                    const canBroadcast = this.get('broadcast-commands', [])
                        .includes(command.list[0]);

                    if (cmdData) {
                        mod.evaluate({
                            script: cmdData.command,
                            msgData,
                            node: this,
                            canBroadcast,
                            command,
                        });
                    }
                }
            }
            // handle IBIP (https://git.teknik.io/Teknikode/IBIP)
            else if (this.get('enableIBIP', true) && text == '.bots') {
                print(`Reporting in! [JavaScript] use ${trigger}help`);
            }
            // parse URLs
            else if (this.get('fetchURL', true)) {
                mod.fetchURL(text, print);
            }

            // check speak events that have elapsed

            if (isPM || !this.getChannelConfig(to).ignoreEvents) {
                this.database.eventFns.speakElapsed(from)
                    .forEach(row => {
                        const cmdData = parent.database.commands.get(row.callback);
                        if (cmdData) {
                            const { command, name } = cmdData;
                            mod.evaluate({
                                script: command,
                                msgData,
                                node: this,
                                event: row,
                                command: mod.parseCommand({ text: name })
                            });
                        }
                        this.database.eventFns.delete(row.idx);
                    });
            }
        });

    }
}

module.exports = {
    ServerNode,
};
