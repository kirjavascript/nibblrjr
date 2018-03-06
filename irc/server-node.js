const { Client } = require('irc');
Client.prototype._updateMaxLineLength = () => {this.maxLineLength = 400};

class ServerNode {
    constructor(parent, server) {

        Object.assign(this, server, { parent });
        const { address, channels, trigger, username, password } = this;

        this.client = new Client(address, username, {
            channels: channels,
            userName: 'eternium',
            realName: 'none',
            floodProtection: true,
            floodProtectionDelay: 250,
            autoRejoin: true,
        });

        if (password) {
            this.client.addListener('registered', () => {
                client.say('nickserv', `identify ${password}`);
            });
        }

        this.client.addListener('error', function(message) {
            // TODO: log errors to db
        });

        addServerMethods(this);
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
