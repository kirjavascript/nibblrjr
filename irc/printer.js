const { objectDebug } = require('./evaluate');
const { parseColors } = require('./colors');

const messageFactory = (type, node, msgData) => {
    const { client } = node;
    const { target: defaultTarget } = msgData;
    let count = 0;

    // raw
    const sendRaw = (text, target = void 0) => {
        if (++count > 100) return; // usage limit of 100 per command

        client[type](target || defaultTarget, text);

        // log to DB
        if (!msgData.isPM && typeof text == 'string') {
            // lag a little so messages are the right order
            setTimeout(() => {
                node.database.log({
                    nick: node.nickname,
                    command: type == 'notice' ? 'NOTICE' : 'PRIVMSG',
                    target,
                    args: [target || defaultTarget, ...text.split(' ')],
                });
            }, 200);
        }

        return text;
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
