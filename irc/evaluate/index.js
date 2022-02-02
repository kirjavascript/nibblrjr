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
        await vm.setConfig({
            print: {
                canBroadcast,
                target: msgData.target,
            },
            IRC: {
                message: msgData,
                command,
                address: node.config.address,
                channel: msgData.isPM ? undefined : msgData.target,
                secret: node.get('secrets', {})[command.root],
            },
            hasSetNick: node.getTargetCfg(msgData.to, 'setNick', false),
            namespace: command.root,
            onPrint: ({ type, line, target }) => {
                const obj = ({
                    command: type === 'notice' ? 'NOTICE' : 'PRIVMSG',
                    target,
                    args: [target, ...line.split(' ')],
                    nick: node.client.nick,
                });
                node.database.log(node, obj);
            },
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

module.exports = { evaluate };
