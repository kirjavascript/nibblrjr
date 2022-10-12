module.exports = { createSend, createNodeSend };
function createNodeSend(node, target) {
    return createSend(Object.assign(node.getPrintCfg(target), {
        canBroadcast: true,
        target,
        colors: require('./colors').getColorFuncs(node.trigger),
        inspect: require('./inspect'),
        sendRaw: node.sendRaw,
    }));
}

function createSend({
    sendRaw,
    onMessage,
    colors,
    canBroadcast,
    target,
    inspect,
    // printConfig
    hasColors,
    lineLimit,
    colLimit,
    charLimit,
}) {
    let lineCount = 0;
    let charCount = 0;

    const sendBase = (
        type,
        text,
        { target: targetOpt = target, log = true } = {},
    ) => {
        if (!canBroadcast && target !== targetOpt) {
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


        const colWidth = colLimit || 400;

        let lines = text.split('\n').map(line => {
            // apply wrapping on columns
            const wrappedLines = [];
            for (let i = 0; i < line.length; i += colWidth) {
                wrappedLines.push(line.slice(i, i + colWidth));
            }
            return wrappedLines.join('\n');
        })
            .join('\n').split('\n'); // join/split to flatten

        if (lineLimit) {
            const remaining = lineLimit - lineCount;
            lines = lines.slice(0, remaining);
            lineCount += lines.length;
        }

        if (charLimit) {
            const remaining = charLimit - charCount;
            const chars = lines.join('\n').slice(0, remaining);
            lines = chars.split('\n');
            charCount += chars.length;
        }

        lines.forEach(line => {
            sendRaw(type, targetOpt, line);
            if (targetOpt.startsWith('#') && log && onMessage) {
                onMessage({ type, line, target: targetOpt });
            }
        });

    };

    function factory(sendType) {
        const send = (text, config) => sendType(colors(text), config);

        send.raw = sendType;

        send.log = (text, config = {}) => {
            return sendType(inspect(text, config), config);
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

    const print = factory((text, config) => sendBase('say', text, config));
    const notice = factory((text, config) => sendBase('notice', text, config));
    const action = factory((text, config) => sendBase('action', text, config));

    // if this changes we also have to update events.js to remove it
    return { print, notice, action, log: print.log };
}
