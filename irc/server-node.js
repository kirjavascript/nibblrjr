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

        this.client = new Client(this.address, this.nickname, {
            channels: this.channels.map(c => c.name),
            userName: this.get('userName', 'eternium'),
            realName: this.get('realName', 'nibblrjr IRC framework'),
            floodProtection: this.get('floodProtection', true),
            floodProtectionDelay: this.get('floodProtectionDelay', 250),
            autoRejoin: true,
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
            this.database.log(message);
        });

        // check tick events that have elapsed
        this.tick = () => {
            setTimeout(this.tick, 5000);
            if (this.registered) {
                this.database.eventFns.tickElapsed()
                    .forEach(row => {
                        const { context, print } = this.getEnvironment({
                            from: row.user,
                            to: row.target,
                            target: row.target,
                            isPM: row.user.toLowerCase() == row.target.toLowerCase(),
                        });
                        context.IRC.setEvent(row);
                        const commandData = parent.database.commands.get(row.callback);
                        if (commandData) {
                            mod.evaluate({ input: commandData.command, context });

                        }
                        this.database.eventFns.delete(row.idx);
                    });
            }
        };
        setTimeout(this.tick, 5000);

        this.getEnvironment = (msgData) => {
            const print = mod.printFactory(this, msgData);
            const notice = mod.noticeFactory(this, msgData);
            const action = mod.actionFactory(this, msgData);
            const context = mod.getContext({
                print,
                notice,
                action,
                msgData,
                node: this,
            });
            return { context, print, notice, action };
        };

        this.client.addListener('message', (from, to, text, message) => {
            if (this.get('ignore-hosts', []).includes(message.host)) return;
            const isPM = to == this.client.nick;
            const target = isPM ? from : to;
            from = from[0] == '#' ? from.toLowerCase() : from;
            to = to[0] == '#' ? to.toLowerCase() : to;
            const msgData = { from, to, text, message, target, isPM };
            const { context, print } = this.getEnvironment(msgData);

            // check speak events that have elapsed
            if (!this.getChannelConfig(to).ignoreSpeakEvents) {
                this.database.eventFns.speakElapsed(from)
                    .forEach(row => {
                        const { context } = this.getEnvironment(msgData);
                        context.IRC.setEvent(row);
                        const commandData = parent.database.commands.get(row.callback);
                        if (commandData) {
                            mod.evaluate({ input: commandData.command, context });
                        }
                        this.database.eventFns.delete(row.idx);
                    });
            }

            // handle commands
            const trigger = this.get('trigger', '!');

            if (text.startsWith(trigger)) {
                const command = mod.parseCommand({ trigger, text });

                context.input = command.input;
                context.IRC.command = command;

                // eval
                // > - print output
                // #/% - no output, async IIFE
                if (['>','#','%'].includes(command.path)) {
                    const { input, path } = command;
                    context.store = this.database.storeFactory('__eval__');
                    const isAsync = path != '>';
                    mod.evaluate({
                        input,
                        context,
                        printOutput: !isAsync,
                        wrapAsync: isAsync,
                        isREPL: true,
                    });
                }
                // normal commands
                else {
                    const baseCommand = command.list[0];
                    context.store = this.database.storeFactory(baseCommand);
                    // patch broadcasting
                    if (this.get('broadcast-commands', []).includes(baseCommand)) {
                        context.print = mod.printFactory(this, msgData, true);
                        context.notice = mod.noticeFactory(this, msgData, true);
                        context.action = mod.actionFactory(this, msgData, true);
                    }
                    const commandData = parent.database.commands.get(command.path);

                    if (commandData) {
                        mod.evaluate({ input: commandData.command, context });
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

        });

    }
}

module.exports = {
    ServerNode,
};
