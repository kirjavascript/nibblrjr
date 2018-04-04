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
        // { address, channels, trigger, nickname, password }

        this.get = (key, _default) => {
            return this[key] || this.parent[key] || _default;
        }

        this.client = new Client(this.address, this.nickname, {
            channels: this.channels,
            userName: this.get('userName', 'eternium'),
            realName: this.get('realName', 'none'),
            floodProtection: this.get('floodProtection', true),
            floodProtectionDelay: this.get('floodProtectionDelay', 250),
            autoRejoin: true,
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
            this.nickname = message.args[0];
            if (this.password) {
                this.client.say('nickserv', `identify ${this.password}`);
            }
            // this gets trashed after each connect
            this.client.conn.addListener('close', (message) => {
                this.resetBuffer();
            });
        });

        this.client.addListener('error', (message) => {
            console.error(message);
        });

        this.client.addListener('raw', (message) => {
            // track nickname
            if (message.command == 'NICK' && this.nickname == message.nick) {
                this.nickname = message.args[0];
            }
            // log
            this.database.log(message);
        });

        this.client.addListener('message', (from, to, text, message) => {
            const isPM = to == this.nickname;
            const target = isPM ? from : to;
            const msgData = { from, to, text, message, target, isPM };

            // init print API
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

            // TODO: check memo, reminds

            // handle commands
            const trigger = this.get('trigger', '!');

            if (text.startsWith(trigger)) {
                const firstChar = text[trigger.length];
                // eval
                if (['>','#'].includes(firstChar)) {
                    const input = text.slice(trigger.length + 1);
                    // add store for testing
                    context.store = this.database.storeFactory('__eval__');
                    const { output, error } = evaluate({ input, context });
                    if (input.length && firstChar == '>' || error) {
                        print(output);
                    }
                }
                // normal commands
                else {
                    const command = parseCommand({ trigger, text });

                    if (parent.dev) {
                        print.log(command, msgData.target, true);
                    }

                    // update context with command info
                    context.input = command.input;
                    context.IRC.command = command;
                    context.store = this.database.storeFactory(command.list[0]);

                    // TODO: attach commands for memo and remind

                    const commandData = parent.database.commands.get(command.path);

                    if (commandData) {
                        const {
                            output,
                            error,
                        } = evaluate({ input: commandData.command, context });
                        if (error) {
                            print(output);
                        }
                    }
                }
            }
            // parse URLs
            else {
                fetchURL(text, print);
            }

        });

    }
}

module.exports = {
    ServerNode,
};
