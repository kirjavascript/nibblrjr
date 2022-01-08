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
    event,
}) {

    const vm = await createVM({ node });

    try {
        // add events before the rest of this file

        // TODO:  rename this to eval, add events

    // onMessage
    // onDispose
        // TODO: clear scripts

    // TODO: test error happening during creation

        await vm.setConfig({
            print: {
                lineLimit: node.getLineLimit(msgData.to),
                canBroadcast,
                target: msgData.target,
            },
            IRC: {
                message: msgData,
                command,
                secret: node.get('secrets', {})[command.root],
            },
            hasSetNick: node.getChannelConfig(msgData.to).setNick,
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
        const channels = Object.entries(_.cloneDeep(node.client.chans))
            .reduce((acc, [key, value]) => {
                delete value.users;
                acc[key.toLowerCase()] = value;
                return acc;
            }, {});

        const config = {
            commandLimit: node.get('commandLimit', 5),
            IRC: {
                channels,
            },
        };

        if (event) {
            config.IRC.event = event;
        }
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

        function wrapFns(obj, name) {
            jail.setSync(
                `_${name}Keys`,
                new ivm.ExternalCopy(Object.keys(obj)).copyInto(),
            );
            jail.setSync('_'+name, new ivm.Reference((fnName, ...args) => {
                return new ivm.ExternalCopy(obj[fnName](...args)).copyInto();
            }));
        }

        wrapFns(node.database.logFactory(msgData.target), 'log');
        // wrapFns(node.database.storeFactory(command.root), 'store');
        // wrapFns(node.parent.database.commands.getCommandFns(), 'commandFns');
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


            function unwrapFns(name) {
                const obj = {};
                ref[name+'Keys'].forEach(key => {
                    obj[key] = (...args) => {
                        return ref[name].applySync(
                            undefined,
                            [key, ...args.map(arg => (
                                new ref.ivm.ExternalCopy(arg).copyInto()
                            ))],
                        );
                    };
                });
                return obj;
            }

            // IRC.commandFns = unwrapFns('commandFns');
            IRC.log = unwrapFns('log');
            // IRC.log.getGlobal = IRC.log.get;
            IRC.eventFns = unwrapFns('eventFns');
            if (IRC.event) {
                IRC.eventFns.addEvent = () => {
                    throw new Error('cannot add an event in an event callback');
                };
            }


            // set limits on command functions

            const { setSafe, deleteSafe } = IRC.commandFns;
            Object.assign(IRC.commandFns, {
                setSafe: scripts.limit(setSafe, config.commandLimit),
                deleteSafe: scripts.limit(deleteSafe, config.commandLimit),
            });

            // add some globals

            // global.store = unwrapFns('store');
            // global.store.namespace = IRC.command.root;
            global.input = IRC.command.input;
            global.dateFns = scripts['date-fns'];
            global._ = { ...scripts.lodash };

        });
}

module.exports = { evaluate };
