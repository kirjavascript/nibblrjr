module.exports = { createSend, createNodeSend };
function createNodeSend(node, message) {
    return createSend({
        hasColors: node.get('colors', true),
        canBroadcast: true,
        lineLimit: node.getLineLimit(message),
        message,
        colors: require('./colors').getColorFuncs(node.trigger),
        inspect: require('./inspect'),
        sendRaw: node.sendRaw,
    });
}

function createSend(config) {
    return {
        print: messageFactory('say', config),
        notice: messageFactory('notice', config),
        action: messageFactory('action', config),
    };
}

function createPrint({ sendRaw, onMessage, hasColors, canBroadcast, lineLimit, charLimit }) {
    // messageFactory =

    const sendBase = (
        type,
        text,
        { target = defaultTarget, log = true } = {},
    ) => {


    };
}

// TODO: take event callbacks, have line limit
function messageFactory(
    type,
    {
        hasColors,
        canBroadcast = false,
        lineLimit = 10,
        message,
        colors,
        inspect,
        sendRaw,
        logDB,
    },
) {
    const { target: defaultTarget, isPM } = message;
    let count = 0;

    // raw
    const sendBase = (text, { target = defaultTarget, log = true } = {}) => {
        if (!canBroadcast && target !== defaultTarget) {
            throw new Error('cannot broadcast');
        }
        if (String(target).toLowerCase().includes('serv')) return;
        if (typeof text != 'string') {
            text = String(text);
        }
        if (!hasColors) {
            text = colors.strip(text);
        }
        // strip out \r, fixes; print.raw(`${String.fromCharCode(13)}QUIT`)
        text = text.replace(/\r/g, '\n');
        // strip out \01, fixes; print('\01VERSION\01')
        text = text.replace(/\u0001/, '');

        text.split('\n')
            .map((line) => line.match(/.{1,400}/g))
            .forEach((lines) => {
                lines &&
                    lines.forEach((line) => {
                        if (++count <= lineLimit) {
                            sendRaw(type, target, line);
                        }
                    });
            });

        if (count > lineLimit) return;

        // log to DB (only in isolate)
        if (!isPM && log && logDB) {
            logDB({
                command: type == 'notice' ? 'NOTICE' : 'PRIVMSG',
                target,
                args: [target, ...text.slice(0, 400).split(' ')],
            });
        }
    };

    // colours
    const send = (text, config) => {
        return sendBase(colors(text), config);
    };

    send.raw = sendBase;

    // inspect
    send.log = (text, config = {}) => {
        return sendBase(inspect(text, config), config);
    };
    send.error = (error, config) => {
        return send(colors.error(error), config);
    };
    send.info = (text, config) => {
        return send(colors.info(text), config);
    };
    send.success = (text, config) => {
        return send(colors.success(text), config);
    };

    return send;
}
