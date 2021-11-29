const fs = require('fs');
const ivm = require('isolated-vm');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { createNodeSend } = require('./scripts/print');
const { nick } = require('./scripts/colors');
const { ping } = require('./spawn');
const { acquire } = require('./acquire');
const { sudo, auth } = require('./access');
const { loadScripts, loadLazy }  = require('./load-scripts');
const { version } = require('../../package.json');

const createVM = require('./vm');

// grab scripts to inject into the isolate
const scripts = loadScripts();

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
        // disco / connect to servers

        // TODO:  rename this to eval, add events

        // get jsdom to work

    // onMessage
    // onDispose

    // TODO: events use compileScript
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
        });

        await vm.evaluate(script, {
            evalType: printResult ? 'evalPrint' : 'functionBody',
        });


    } catch (e) {
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

    // const isolate = new ivm.Isolate({ memoryLimit: 128 });
    // const context = await isolate.createContext();
    // const dispose = () => {
    //     if (!isolate.isDisposed) {
    //         isolate.dispose();
    //         context.release();
    //     }
    // };
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
        jail.setSync('_loadLazy', new ivm.Reference((filename) => {
            return new Promise((resolve, reject) => {
                loadLazy(filename, (err, success) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(success);
                    }
                });
            });
        }));

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
        wrapFns(node.database.storeFactory(command.root), 'store');
        // wrapFns(node.parent.database.commands.getCommandFns(), 'commandFns');
        wrapFns(node.database.eventFactory(msgData), 'eventFns');

        // await (await isolate.compileScript(`
        //     global.scripts = {};
        //     ${scripts.map(([name, script]) => `
        //         (function() {
        //             const exports = {};
        //             const module = { exports: {} };
        //             ${script};
        //             global.scripts[${JSON.stringify(name)}] = module.exports;
        //         })();
        //     `).join('')}
        //  `)).run(context);

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

            global.store = unwrapFns('store');
            global.store.namespace = IRC.command.root;
            global.input = IRC.command.input;
            global.dateFns = scripts['date-fns'];
            global._ = { ...scripts.lodash };

            // JSDOM

            let jsdom;
            global.jsdom = () => {
                if (!jsdom) {
                    jsdom = new Function(`
                        const self = {};
                        const setTimeout = (fn) => {fn()};
                        const clearTimeout = () => {};
                        ${ref.loadLazy
                            .applySyncPromise(undefined, ['jsdom.js'])}
                        return self.jsdom;
                    `)();
                }
                return jsdom;
            };

        });
}

module.exports = { evaluate };
