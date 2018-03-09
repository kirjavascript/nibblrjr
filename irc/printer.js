const { objectDebug } = require('./evaluate');

const messageFactory = (type, node, msgData) => {
    const { client } = node;
    const { target: defaultTarget } = msgData;

    const send = (text, target = void 0) => {
        client[type](target || defaultTarget, text);
        return text;
    };

    send.log = (text, ...args) => {
        return send(objectDebug(text), ...args);
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
