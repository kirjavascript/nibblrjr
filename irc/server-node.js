const { Client } = require('irc');
Client.prototype._updateMaxLineLength = () => {this.maxLineLength = 400};

const { printFactory, noticeFactory, actionFactory } = require('./printer');
const { evaluate } = require('./evaluate');
const { fetchURL } = require('./fetch-url');
const { getContext } = require('./context');
const { parseCommand } = require('./parse-command');

class ServerNode {
    constructor(parent, server) {

        Object.assign(this, server, { parent });
        // { address, channels, trigger, nickname, password, colors }

        this.get = (key, _default) => {
            return typeof this[key] != 'undefined'
                ? this[key]
                : typeof this.parent[key] != 'undefined'
                    ? this.parent[key]
                    : _default;
        }

        this.client = new Client(this.address, this.nickname, {
            channels: this.channels,
            userName: this.get('userName', 'eternium'),
            realName: this.get('realName', 'nibblrjr IRC framework'),
            floodProtection: this.get('floodProtection', true),
            floodProtectionDelay: this.get('floodProtectionDelay', 250),
            autoRejoin: true,
            debug: true,
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
        this.tick = setInterval(() => {
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
                            evaluate({ input: commandData.command, context });
                        }
                        this.database.eventFns.delete(row.idx);
                    });
            }
        }, 5000);

        this.getEnvironment = (msgData) => {
            const print = printFactory(this, msgData);
            const notice = noticeFactory(this, msgData);
            const action = actionFactory(this, msgData);
            const context = getContext({
                print,
                notice,
                action,
                msgData,
                node: this,
            });
            return { context, print, notice, action };
        };

        this.client.addListener('message', (from, to, text, message) => {
            const isPM = to == this.client.nick;
            const target = isPM ? from : to;
            const msgData = { from, to, text, message, target, isPM };
            const { context, print } = this.getEnvironment(msgData);

            // check speak events that have elapsed
            this.database.eventFns.speakElapsed(from)
                .forEach(row => {
                    const { context } = this.getEnvironment(msgData);
                    context.IRC.setEvent(row);
                    const commandData = parent.database.commands.get(row.callback);
                    if (commandData) {
                        evaluate({ input: commandData.command, context });
                    }
                    this.database.eventFns.delete(row.idx);
                });

            // handle commands
            const trigger = this.get('trigger', '!');

            if (text.startsWith(trigger)) {
                const command = parseCommand({ trigger, text });

                if (parent.dev) {
                    print.log(command, msgData.target, true);
                }

                context.input = command.input;
                context.IRC.command = command;

                // eval
                // > - print output
                // #/% - no output, async IIFE
                if (['>','#','%'].includes(command.path)) {
                    const { input, path } = command;
                    context.store = this.database.storeFactory('__eval__');
                    const isAsync = path != '>';
                    evaluate({
                        input,
                        context,
                        printOutput: !isAsync,
                        wrapAsync: isAsync,
                    });
                }
                // normal commands
                else {
                    context.store = this.database.storeFactory(command.list[0]);

                    const commandData = parent.database.commands.get(command.path);

                    if (commandData) {
                        evaluate({ input: commandData.command, context });
                    }
                }
            }
            // handle IBIP (https://git.teknik.io/Teknikode/IBIP)
            else if (this.get('enableIBIP', true) && text == '.bots') {
                print('Reporting in! [JavaScript] https://github.com/kirjavascript/nibblrjr');
            }
            // parse URLs
            else if (this.get('fetchURL', true)) {
                fetchURL(text, print);
            }

        });

    }
}

module.exports = {
    ServerNode,
};
