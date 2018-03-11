const { objectDebug } = require('./evaluate');
const { parseColors } = require('./colors');

const messageFactory = (type, node, msgData) => {
    const { client } = node;
    const { target: defaultTarget } = msgData;

    // raw
    const sendRaw = (text, target = void 0) => {
        client[type](target || defaultTarget, text);

        // log to DB
        if (!msgData.isPM) {
            node.database.log({
                nick: node.nickname,
                command: 'PRIVMSG',
                target,
                args: [target || defaultTarget, ...text.split(' ')],
            });
        }

        return text;
    };

    // colours
    const send = (text, ...args) => {
        return sendRaw(parseColors(text));
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
