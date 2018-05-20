const { objectDebug } = require('./evaluate');
const { parseColors } = require('./colors');

const services = ['nickserv', 'chanserv'];

const messageFactory = (type, node, msgData) => {
    const { client } = node;
    const { target: defaultTarget } = msgData;
    let count = 0;

    // raw
    const sendRaw = (text, target = defaultTarget, noLog = false) => {
        // usage limit of 100 per command, only send if correctly connected to server and not to services
        if (++count > 100 || !node.registered || services.includes(String(target).toLowerCase())) return;
        if (typeof text != 'string') {
            text = String(text);
        }
        if (!node.get('colors', true)) {
            text = text.replace(/(\x03\d{0,2}(,\d{0,2}|\x02\x02)?|\x0f|\x07|\x1D|\x02|\x1f)/g, '');
        }

        client[type](target, text);

        // log to DB
        if (!msgData.isPM && !noLog) {
            // lag a little so messages are the right order
            setTimeout(() => {
                node.database.log({
                    nick: node.client.nick,
                    command: type == 'notice' ? 'NOTICE' : 'PRIVMSG',
                    target,
                    args: [target || defaultTarget, ...text.split(' ')],
                });
            }, 200);
        }
    };

    // colours
    const send = (text, ...args) => {
        return sendRaw(parseColors(text), ...args);
    };

    send.raw = sendRaw;

    // inspect
    send.log = (text, ...args) => {
        return sendRaw(objectDebug(text), ...args);
    };

    return send;
};

const printFactory = (node, msgData) => {
    return messageFactory('say', node, msgData);
};
const noticeFactory = (node, msgData) => {
    return messageFactory('notice', node, msgData);
};

const actionFactory = (node, msgData) => {
    return messageFactory('action', node, msgData);
};


module.exports = {
    printFactory,
    noticeFactory,
    actionFactory,
};
