function checkAccess({ from, node, callback }) {
    const name = node.address.includes('freenode')
        ? 'ACC'
        : 'STATUS';

    const ref = {};
    const noticeHandler = (from, to, text) => {
        if (text.toUpperCase().includes(name)) {
            const [msg, nick, status] = text.trim().split(' ');
            if (status == 3) {
                callback();
            } else {
                callback(new Error('not identified'));
            }
            node.client.removeListener('notice', noticeHandler);
            clearTimeout(ref.timer);
        }
    };
    ref.timer = setTimeout(() => {
        node.client.removeListener('notice', noticeHandler);
    }, 3000);
    node.client.addListener('notice', noticeHandler);
    node.client.say('NickServ', `${name} ${from}`);
}

function auth({ callback, node, from }) {
    checkAccess({ node, from, callback });
}

function sudo({ IRC, callback, node, print }) {
    if (node.get('admins', []).includes(IRC.message.from)) {
        checkAccess({
            from: IRC.message.from,
            node,
            print,
            callback: () => {
                callback({
                    node,
                    exit: () => {
                        console.error(
                            'exit() from ' + IRC.message.from
                        );
                        process.exit()
                    },
                });
            },
        });
    } else {
        throw new Error('no access');
    }
}

module.exports = { sudo, auth };
