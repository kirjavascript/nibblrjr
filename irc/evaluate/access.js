function checkAccess({ from, node, callback }) {
    const name = /freenode|libera/.test(node.address)
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

function sudo({ callback, node, from }) {
    if (node.get('admins', []).includes(from)) {
        checkAccess({ from, node, callback });
    } else {
        callback(new Error('no access'));
    }
}

module.exports = { sudo, auth };
