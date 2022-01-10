const { createNodeSend } = require('./scripts/print');
const { nick } = require('./scripts/colors');
const createVM = require('./vm');

async function evaluate({
    canBroadcast = false,
    printResult = false,
    script,
    msgData,
    node,
    command,
}) {
    const vm = await createVM({ node });

    try {
        // TODO: onMessage

        await vm.setConfig({
            print: {
                canBroadcast,
                target: msgData.target,
            },
            IRC: {
                message: msgData,
                command,
                secret: node.get('secrets', {})[command.root],
            },
            hasSetNick: node.getTargetCfg(msgData.to, 'setNick', false),
            namespace: command.root,
        });

        await vm.evaluate(script, {
            evalType: printResult ? 'evalPrint' : 'functionBody',
        });

    } catch (e) {
        node.parent.dev && console.error(e);
        // TODO: how else could this check be done?
        if (/script execution timed out/i.test(e.message)) {
            const { text } = msgData;
            const truncated = text[30] ? text.slice(0, 30) + '...' : text;
            e.message = `script timeout: ${nick(msgData.from, true)} ${truncated}`;
        }
        createNodeSend(node, msgData.target).print.error(e);
    }
    vm.dispose();
}

async function _() {
        jail.setSync('_logDB', new ivm.Reference((obj) => {
            obj.nick = config.IRC.nick;
            node.database.log(node, obj);
        }));

        // TODO: from print
        if (!isPM && log && logDB) {
            logDB({
                command: type == 'notice' ? 'NOTICE' : 'PRIVMSG',
                target,
                args: [target, ...text.slice(0, 400).split(' ')],
            });
        }

        wrapFns(node.database.logFactory(msgData.target), 'log');
        wrapFns(node.database.eventFactory(msgData), 'eventFns');

        const bootstrap = await isolate.compileScript('new '+ function() {

            // Object.assign(global, scripts.print.createSend({
            //     hasColors: config.hasColors,
            //     canBroadcast: config.canBroadcast,
            //     lineLimit: config.lineLimit,
            //     message: config.IRC.message,
            //     colors,
            //     inspect: scripts.inspect,
            //     sendRaw: (...args) => {
            //         ref.sendRaw.applySync(undefined, args);
            //     },
                logDB: (obj) => {
                    ref.logDB.applySync(undefined, [
                        new ref.ivm.ExternalCopy(obj).copyInto(),
                    ]);
                },
            // }));
            IRC.log = unwrapFns('log');

        });
}

module.exports = { evaluate };
