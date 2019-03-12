const { objectDebug } = require('./evaluate');
const { parseColors, notify } = require('./colors');

const messageFactory = (type, node, msgData, canBroadcast = false) => {
    const { client } = node;
    const { target: defaultTarget } = msgData;
    let count = 0;
    const limit = node.getChannelConfig(msgData.to).lineLimit || 10;

    // raw
    const sendRaw = (text, { target = defaultTarget, log = true } = {}) => {
        if (!canBroadcast && target !== defaultTarget) {
            throw new Error('cannot broadcast');
        }
        // only send if correctly connected to server and not to services
        if (!node.registered || String(target).toLowerCase().includes('serv')) return;
        if (typeof text != 'string') {
            text = String(text);
        }
        if (!node.get('colors', true)) {
            text = text.replace(/(\x03\d{0,2}(,\d{0,2}|\x02\x02)?|\x0f|\x07|\x1D|\x02|\x1f)/g, '');
        }
        // strip out \r, fixes; print.raw(`${String.fromCharCode(13)}QUIT`)
        text = text.replace(/\r/g, '\n');

        text.split('\n')
            .map(line => line.match(/.{1,400}/g))
            .forEach((lines) => {
                lines && lines.forEach(line => {
                    if (++count <= limit) {
                        client[type](target, line);
                    }
                });
            });

        if (count > limit) return;

        // log to DB
        if (!msgData.isPM && log) {
            // lag a little so messages are the right order
            setTimeout(() => {
                node.database.log({
                    nick: node.client.nick,
                    command: type == 'notice' ? 'NOTICE' : 'PRIVMSG',
                    target,
                    args: [target || defaultTarget, ...text.slice(0, 400).split(' ')],
                });
            }, 100);
        }
    };

    // colours
    const send = (text, config) => {
        return sendRaw(parseColors(text), config);
    };

    send.raw = sendRaw;

    // inspect
    send.log = (text, config = {}) => {
        const { depth, colors } = config;
        return sendRaw(objectDebug(text, { depth, colors}), config);
    };
    send.error = (error, config) => {
        return send(notify.error(error), config);
    };
    send.info = (text, config) => {
        return send(notify.info(text), config);
    };
    send.success = (text, config) => {
        return send(notify.success(text), config);
    };

    return send;
};

const printFactory = (...args) => {
    return messageFactory('say', ...args);
};
const noticeFactory = (...args) => {
    return messageFactory('notice', ...args);
};
const actionFactory = (...args) => {
    return messageFactory('action', ...args);
};


module.exports = {
    printFactory,
    noticeFactory,
    actionFactory,
};
