const { Client } = require('irc');
Client.prototype._updateMaxLineLength = () => {this.maxLineLength = 400};

const { printFactory, noticeFactory } = require('./printer');
const { evaluate } = require('./evaluate');

class ServerNode {
    constructor(parent, server) {

        Object.assign(this, server, { parent });
        // { address, channels, trigger, nickname, password }

        addServerMethods(this);

        this.client = new Client(this.address, this.nickname, {
            channels: this.channels,
            userName: 'eternium',
            realName: 'none',
            floodProtection: true,
            floodProtectionDelay: 250,
            autoRejoin: true,
        });

        if (this.password) {
            this.client.addListener('registered', () => {
                this.client.say('nickserv', `identify ${this.password}`);
            });
        }

        // TODO: track nicklist?

        this.client.addListener('error', function(message) {
            // TODO: log errors to db
        });

        this.client.addListener('message', (from, to, text, message) => {
            const isPM = to == this.nickname;
            const target = isPM ? from : to;
            const msgData = { from, to, text, message, target, isPM };

            // log message
            // if (!isPM) {
            // }

            // print stuff
            const print = printFactory(this, msgData);
            const notice = noticeFactory(this, msgData);

            // check memo, reminds

            // handle commands
            const trigger = this.get('trigger');

            if (text.startsWith(trigger)) {
                // eval
                if (text[trigger.length] == '>') {
                    const input = text.slice(trigger.length + 1);
                    if (input.length) {
                        print(evaluate({ input }));
                    }
                }
                // normal commands
                else {
                    const command = text.slice(trigger.length).match(/^\S*/)[0];
                    const input = text.slice(trigger.length + command.length + 1);
                    // print with colour parsing mode
                    console.log('cmd', [command, input]);
                }
            }

        });

    }
}

function addServerMethods(node) {
    // for defaulting values
    node.get = (key) => {
        return node[key] || node.parent[key];
    };
}

module.exports = {
    ServerNode,
};
