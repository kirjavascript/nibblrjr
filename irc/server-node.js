const { Client } = require('irc');
Client.prototype._updateMaxLineLength = () => {this.maxLineLength = 400};

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

        this.client.addListener('error', function(message) {
            // TODO: log errors to db
        });

        this.client.addListener('message', (from, to, text, message) => {
            const isPM = to == this.nickname;
            const target = isPM ? from : to;

            // check memo, reminds
        });

    }
}

function addServerMethods(node) {
    // for defaulting values
    node.get = (key) => {
        return node[key] || parent[key];
    };
}

module.exports = {
    ServerNode,
};
