const ivm = require('isolated-vm');
const _ = require('lodash');
const { createNodeSend } = require('./scripts/print');
const { nick } = require('./scripts/colors');
const { ping } = require('./spawn');
const fetch = require('node-fetch');
const { loadScripts, loadLazy }  = require('./load-scripts');

const timeout = 10000;

const { acquire } = require('../context/acquire');
const { createRequireModules } = require('../context/require');

// grab scripts to inject into the isolate
const scripts = loadScripts();

async function evaluate({
    script,
    msgData,
    node,
    canBroadcast = false,
    printResult = false,
    command,
    event,
    // isREPL,
}) {

    try {
        // context.acquire = acquire;
        // if (isREPL) {
        //     context.injectRequire = await createRequireModules(input);
        // }
        // global.self = global;
        // const q = (await createRequireModules(`require('jsdom@^15.0.0')`))('jsdom');
        // console.log(q.JSDOM);

        // change require to use apply sync promise
        // fix ~log hello message (ignore commands)
        // truncate nibblr messages to log
        // limit: setSafe / deleteSafe node.get('command-limit', 5)
        // ~uptime

        const channels = Object.entries(_.cloneDeep(node.client.chans))
            .reduce((acc, [key, value]) => {
                delete value.users;
                acc[key.toLowerCase()] = value;
                return acc;
            }, {});

        const config = {
            hasColors: node.get('colors', true),
            canBroadcast,
            lineLimit: node.getLineLimit(msgData.to),
            IRC: {
                trigger: node.get('trigger', '!'),
                message: msgData,
                nick: node.client.nick,
                command,
                channels,
                webAddress: _.get(node, 'parent.web.url', '[unspecified]'),
                epoch: node.parent.epoch,
            },
        };

        if (event) {
            config.IRC.event = event;
        }

        const isolate = new ivm.Isolate({ memoryLimit: 128 });
        const context = await isolate.createContext();
        const jail = context.global;

        jail.setSync('global', jail.derefInto());
        jail.setSync('config', new ivm.ExternalCopy(config).copyInto());
        jail.setSync('_ivm', ivm);
        jail.setSync('_sendRaw', new ivm.Reference(node.sendRaw));
        jail.setSync('_resetBuffer', new ivm.Reference(node.resetBuffer));
        jail.setSync('_setNick', new ivm.Reference((str) => {
            if (node.getChannelConfig(msgData.to).setNick) {
                str = String(str).replace(/[^a-zA-Z0-9]+/g, '');
                node.client.send('NICK', str);
                return true;
            } else {
                return false;
            }
        }));
        jail.setSync('_whois', new ivm.Reference((text, callback) => {
            text && node.client.whois(text, (data) => {
                try {
                    callback.applySync(undefined, [
                        new ivm.ExternalCopy(data).copyInto(),
                    ]);
                } catch(e) {
                    createNodeSend(node, msgData).print.error(e);
                }
            });
        }));
        jail.setSync('_ping', new ivm.Reference((str, resolve, reject) => {
            ping(str)
                .then((...args) => { resolve.applySync(undefined, args) })
                .catch((...args) => { reject.applySync(undefined, args) });
        }));
        jail.setSync('_fetchSync', new ivm.Reference((str, config = {}) => (
            new Promise((resolve, reject) => {
                fetch(str, config)
                    .then((res) => res[config.type || 'text']())
                    .then(obj => resolve(new ivm.ExternalCopy(obj).copyInto()))
                    .catch(e => reject(new Error(e.message)));
            })
        )));
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
        wrapFns(node.parent.database.commands.getCommandFns(node), 'commandFns');
        wrapFns(node.database.eventFactory(msgData.from), 'eventFns');

        await (await isolate.compileScript(`
            global.scripts = {};
            ${scripts.map(([name, script]) => `
                (function() {
                    const module = {};
                    const exports = {};
                    ${script};
                    global.scripts[${JSON.stringify(name)}] = module.exports;
                })();
            `).join('')}
         `)).run(context);

        const bootstrap = await isolate.compileScript('new '+ function() {

            // collect underscored objects

            const ref = Object.keys(global)
                .filter(key => key.startsWith('_'))
                .reduce((a, c) => {
                    a[c.slice(1)] = global[c];
                    delete global[c];
                    return a;
                }, {});

            const colors = scripts.colors.getColorFuncs(config.IRC.trigger);

            // attach print/action/notice

            Object.assign(global, scripts.print.createSend({
                hasColors: config.hasColors,
                canBroadcast: config.canBroadcast,
                lineLimit: config.lineLimit,
                message: config.IRC.message,
                colors,
                inspect: scripts.inspect,
                sendRaw: (...args) => {
                    ref.sendRaw.applySync(undefined, args);
                },
            }));

            // fetch stuff

            Object.assign(global, scripts.fetch);

            global.fetchSync = (str, config) => {
                return ref.fetchSync.applySyncPromise(undefined, [
                    str,
                    new ref.ivm.ExternalCopy(config).copyInto(),
                ]);
            };

            // create IRC object

            global.IRC = {
                ...config.IRC,
                colors,
                inspect: scripts.inspect,
                breakHighlight: (s) => `${s[0]}\uFEFF${s.slice(1)}`,
                parseCommand: scripts['parse-command'].parseCommand,
                parseTime: scripts['parse-time'].parseTime,
            };

            IRC.setNick = (str) => {
                return ref.setNick.applySync(undefined, [str]);
            };

            IRC.resetBuffer = () => {
                ref.resetBuffer.applySync();
            };

            IRC.whois = (text, callback) => {
                ref.whois.applySync(undefined, [
                    text, new ref.ivm.Reference(callback),
                ]);
            };

            IRC.ping = (str) => new Promise((res, rej) => {
                ref.ping.applySync(undefined, [
                    str,
                    new ref.ivm.Reference(res),
                    new ref.ivm.Reference(rej),
                ]);
            });

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

            IRC.log = unwrapFns('log');
            IRC.commandFns = unwrapFns('commandFns');
            IRC.eventFns = unwrapFns('eventFns');
            if (IRC.event) {
                IRC.eventFns.addEvent = () => {
                    throw new Error('cannot add an event in an event callback');
                };
            }

            // add some globals

            global.input = IRC.command.input;
            global.dateFns = scripts['date-fns'];
            global._ = { ...scripts.lodash };

            // JSDOM

            let jsdom;
            Object.defineProperty(global, 'jsdom', {
                get() {
                    if (!jsdom) {
                        jsdom = new Function(`
                            const self = {};
                            ${ref.loadLazy
                                .applySyncPromise(undefined, ['jsdom.js'])}
                            return self.jsdom;
                        `)();
                    }
                    return jsdom;
                },
                enumerable: true,
            });

            // cleanup env

            delete global.config;
            delete global.scripts;

            Object.defineProperty(global, 'global', { enumerable: false });
        });
        await bootstrap.run(context);

        // dispose stuff after timeout

        setTimeout(() => {
            context.release();
            if (!isolate.isDisposed) {
                isolate.dispose();
            }
        }, timeout + 1000);

        // run script

        const code = await isolate.compileScript(printResult
            ? `
                (function () {
                    // take references to functions so they cannot be deleted
                    const [printRaw, IRCinspect] = [print.raw, IRC.inspect];
                    const [depth, truncate] = IRC.command.params;
                    // run in global scope
                    const result = (0, eval)(${JSON.stringify(script)});
                    printRaw(
                        IRCinspect(result, {
                            depth: depth || 1,
                            truncate: truncate || 390,
                        })
                    );
                })();
            `
            : `(async () => { ${script} })();`
        );

        await code.run(context, {timeout});
        console.log('bs');



        // TODO:
        // remove limit function

        // ---

        // const code = wrapAsync ? `(async () => {
        //     try {
        //         ${input}
        //     } catch (e) {
        //         print.error(e);
        //     }
        // })();` : input;

        // const evaluation = new VM({
        //     timeout: 3000,
        //     sandbox: context,
        // }).run(`
        //     delete global.console;
        //     global.module = {};
        //     [
        //         'VMError',
        //         'Buffer',
        //         'module',
        //         'setTimeout',
        //         'clearTimeout',
        //         'setInterval',
        //         'clearInterval',
        //     ].forEach(key => {
        //         Object.defineProperty(this, key, { enumerable: false });
        //     });
        //     (() => {
        //         IRC.require = (str) => {
        //             const obj = IRC.commandFns.get(str);
        //             if (obj) {
        //                 const module = new Function(\`
        //                     \${obj.command}
        //                     return this.module;
        //                 \`)();
        //                 return module.exports;
        //             }
        //             else {
        //                 const error = new Error(str + ' not found');
        //                 error.name = 'RequireError';
        //                 throw error;
        //             }
        //         };
        //         if (global.injectRequire) {
        //             global.require = injectRequire();
        //             delete global.injectRequire;
        //         }
        //     })();

        //     ${code}
        // `);

        // if (printOutput) {
        //     context.print.raw(objectDebug(evaluation));
        // }
    } catch (e) {
        if (/script execution timed out/i.test(e.message)) {
            e.message = `script timeout: ${nick(msgData.from, true)} ${_.truncate(msgData.text)}`;
        }
        createNodeSend(node, msgData).print.error(e);
    }

}

module.exports = { evaluate };
