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

        addServerMethods(this);

        this.client = new Client(this.address, this.nickname, {
            channels: this.channels,
            userName: this.get('userName', 'eternium'),
            realName: this.get('realName', 'none'),
            floodProtection: this.get('floodProtection', true),
            floodProtectionDelay: this.get('floodProtectionDelay', 250),
            autoRejoin: true,
        });

        this.database = parent.database.createServerDB(this);

        if (this.password) {
            this.client.addListener('registered', () => {
                this.client.say('nickserv', `identify ${this.password}`);
            });
        }

        // TODO: track nicklist? (get list every 30 sec?)

        this.client.addListener('error', (message) => {
            // TODO: log errors
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

            // log message
            // if (!isPM) {
            // }

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

            // check memo, reminds

            // handle commands
            const trigger = this.get('trigger', '!');

            if (text.startsWith(trigger)) {
                const firstChar = text[trigger.length];
                // eval
                if (['>','#'].includes(firstChar)) {
                    const input = text.slice(trigger.length + 1);
                    const { output, error } = evaluate({ input, context });
                    if (input.length && firstChar == '>' || error) {
                        print(output);
                    }
                }
                // normal commands
                else {
                    const command = parseCommand({ trigger, text });
                    context.input = command.input;
                    context.IRC.command = command;

                    // attach commands for memo and remind

                    parent
                        .database
                        .getCommand(command.path)
                        .then(({command, locked}) => {
                            evaluate({ input: command, context });
                        })
                        .catch(() => {});

                    print.log(command);
                }
            }
            // parse URLs
            else {
                fetchURL(text, print);
            }

        });

    }
}

function addServerMethods(node) {
    // for defaulting values
    node.get = (key, _default) => {
        return node[key] || node.parent[key] || _default;
    };
}

module.exports = {
    ServerNode,
};
