const messageFactory = (type, node, msgData) => {
    const { client } = node;
    const { target: defaultTarget } = msgData;

    return (text, target = void 0) => {
        client[type](target || defaultTarget, text);
    };
};

const printFactory = (node, msgData) => {
    return messageFactory('say', node, msgData);
};
const noticeFactory = (node, msgData) => {
    return messageFactory('notice', node, msgData);
};


module.exports = {
    printFactory,
    noticeFactory,
};
