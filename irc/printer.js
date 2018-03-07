const messageFactory = (type, node, msgData) => {
    const { client } = node;
    const { target: defaultTarget } = msgData;

    const typeLookup = {
        print: 'say',
        notice: 'notice',
    };

    const method = typeLookup[type];

    return (text, target = void 0) => {
        client[method](target || defaultTarget, text);
    };
};

const printFactory = (node, msgData) => {
    return messageFactory('print', node, msgData);
};
const noticeFactory = (node, msgData) => {
    return messageFactory('notice', node, msgData);
};


module.exports = {
    printFactory,
    noticeFactory,
};
