const fs = require('fs');
const ivm = require('isolated-vm');
const fetch = require('node-fetch');
const _ = require('lodash');
const { createNodeSend } = require('./scripts/print');
const { nick } = require('./scripts/colors');
const { ping } = require('./spawn');
const { acquire } = require('./acquire');
const { sudo, auth } = require('./access');
const { loadScripts, loadLazy }  = require('./load-scripts');
const { version } = require('../../package.json');

const timeout = 30000;
const maxTimeout = 60000 * 5;

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
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const dispose = () => {
        if (!isolate.isDisposed) {
            isolate.dispose();
            context.release();
        }
    };

    try {
        const channels = Object.entries(_.cloneDeep(node.client.chans))
            .reduce((acc, [key, value]) => {
                delete value.users;
                acc[key.toLowerCase()] = value;
                return acc;
            }, {});

        const config = {
            hasColors: node.get('colors', true),
            canBroadcast,
            lineLimit: node.getLineLimit(msgData),
            commandLimit: node.get('commandLimit', 5),
            IRC: {
                trigger: node.trigger,
                message: msgData,
                nick: node.client.nick,
                command,
                channels,
                webAddress: _.get(node, 'parent.web.url', '[unspecified]'),
                epoch: node.parent.epoch,
                version,
                nodeVersion: process.version.slice(1),
            },
        };

        const secret = node.get('secrets', {})[command.root];

        if (event) {
            config.IRC.event = event;
        }
        if (secret) {
            config.IRC.secret = secret;
        }

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
        jail.setSync('_whois', new ivm.Reference((text, callback) => (
            text && new Promise((resolve, reject) => {
                node.client.whois(text, (data) => {
                    try {
                        resolve(new ivm.ExternalCopy(data).copyInto());
                    } catch(e) {
                        reject(new Error(e.message));
                    }
                });
            })
        )));
        jail.setSync('_ping', new ivm.Reference((str, resolve, reject) => {
            ping(str)
                .then((...args) => { resolve.applySync(undefined, args) })
                .catch((...args) => { reject.applySync(undefined, args) });
        }));
        jail.setSync('_wordList', new ivm.Reference(() => (
            new Promise((resolve, reject) => {
                const path = '/usr/share/dict/words';
                fs.exists(path, (exists) => {
                    if (exists) {
                        fs.readFile(path, 'utf8', (err, data) => {
                            if (err) reject(err);
                            else resolve(new ivm.ExternalCopy(data).copyInto());
                        });
                    } else {
                        reject(new Error(`no such file: ${path}`));
                    }
                });
            })
        )));
        jail.setSync('_fetchSync', new ivm.Reference((url, type, config = {}) => (
            new Promise((resolve, reject) => {
                fetch(url, config)
                    .then((res) => res[type || 'text']())
                    .then(obj => resolve(new ivm.ExternalCopy(obj).copyInto()))
                    .catch(reject);
            })
        )));
        jail.setSync('_require', new ivm.Reference((str) => (
            new Promise((resolve, reject) => {
                acquire(str)
                    .then(obj => { resolve(obj.toString()) })
                    .catch(reject);
            })
        )));
        jail.setSync('_sleep', new ivm.Reference((ms) => (
            new Promise((resolve) => {
                setTimeout(resolve, Math.min(ms, maxTimeout));
            })
        )));
        jail.setSync('_logDB', new ivm.Reference((obj) => {
            obj.nick = config.IRC.nick;
            node.database.log(node, obj);
        }));
        jail.setSync('_auth', new ivm.Reference((from, isSudo) => (
            new Promise((resolve, reject) => {
                (isSudo ? sudo : auth)({
                    node,
                    from,
                    callback: (err) => err ? reject(err) : resolve(),
                });
            })
        )));
        jail.setSync('_sudoProxy', new ivm.Reference((config) => {
            if (config == 'exit') {
                process.kill(process.pid, 'SIGINT');
            }
            const { key, value, path } = config;
            const leaf = path.pop();
            const parent = path.reduce((a, c) => {
                if (!a[c]) {
                    a[c] = {};
                }
                return a[c];
            }, node);
            if (key == 'get') {
                return new ivm.ExternalCopy(parent[leaf]).copyInto()
            } else if (key == 'set') {
                parent[leaf] = value[0];
            } else if (key == 'call') {
                if (typeof parent[leaf] == 'function') {
                    return parent[leaf](...value);
                } else {
                    throw new Error('not a function');
                }
            }
        }));
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
        wrapFns(node.parent.database.commands.getCommandFns(), 'commandFns');
        wrapFns(node.database.eventFactory(msgData), 'eventFns');

        await (await isolate.compileScript(`
            global.scripts = {};
            ${scripts.map(([name, script]) => `
                (function() {
                    const exports = {};
                    const module = { exports };
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
                logDB: (obj) => {
                    ref.logDB.applySync(undefined, [
                        new ref.ivm.ExternalCopy(obj).copyInto(),
                    ]);
                },
            }));

            global.log = print.log;

            // fetch stuff

            Object.assign(global, scripts.fetch.global);
            global.fetchSync = scripts.fetch.createFetchSync(ref);

            // npm-require

            global.require = (str) => (
                new Function(`
                    const self = {};
                    ${ref.require.applySyncPromise(undefined, [str])}
                    return self.__acquire__;
                `)()
            );

            // acquire (legacy)

            global.acquire = async (str) => require(str);

            // timeouts

            global.sleep = (ms) => ref.sleep.applySyncPromise(undefined, [ms]);

            // create IRC object

            global.IRC = {
                ...config.IRC,
                colors,
                inspect: scripts.inspect,
                breakHighlight: (s) => `${s[0]}\uFEFF${s.slice(1)}`,
                parseCommand: scripts['parse-command'].parseCommand,
                parseTime: scripts['parse-time'].parseTime,
            };

            global.module = { required: false };

            IRC.require = (str) => {
                const obj = IRC.commandFns.get(str);
                if (obj) {
                    const module = new Function(`
                        const module = { required: true };
                        ${obj.command}
                        return module;
                    `)();
                    return module.exports;
                } else {
                    const error = new Error(str + ' not found');
                    error.name = 'RequireError';
                    throw error;
                }
            };

            IRC.setNick = (str) => {
                return ref.setNick.applySync(undefined, [str]);
            };

            IRC.resetBuffer = () => {
                ref.resetBuffer.applySync();
            };

            IRC.whois = (text) => {
                return ref.whois.applySyncPromise(undefined, [text]);
            };

            IRC.ping = (str) => new Promise((res, rej) => {
                ref.ping.applySync(undefined, [
                    str,
                    new ref.ivm.Reference(res),
                    new ref.ivm.Reference(rej),
                ]);
            });

            Object.defineProperty(IRC, 'wordList', {
                get: () => ref.wordList.applySyncPromise().trim().split(/\n|\r\n/),
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

            IRC.auth = () => {
                ref.auth.applySyncPromise(undefined, [IRC.message.from]);
            };

            IRC.sudo = () => {
                ref.auth.applySyncPromise(undefined, [IRC.message.from, true]);
                function node(path = []) {
                    return new Proxy({}, {
                        get(target, key) {
                            if (['get', 'set', 'call'].includes(key)) {
                                return (...args) => ref.sudoProxy.applySync(
                                    undefined,
                                    [new ref.ivm.ExternalCopy({
                                        key,
                                        path,
                                        value: args,
                                    }).copyInto()],
                                );
                            } else {
                                return node([...path, key]);
                            }
                        }
                    });
                }
                return {
                    node: node(),
                    exit: () => ref.sudoProxy.applySync(undefined, ['exit']),
                };
            };

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

            // cleanup env

            delete global.config;
            delete global.scripts;
            delete global.console;

            /\s*/.test(''); // patch RegExp.$_

            ['global', 'acquire', 'module', 'getText', 'getDOM', 'getJSON']
                .forEach(key => {
                    Object.defineProperty(global, key, { enumerable: false });
                });
        });
        await bootstrap.run(context);

        // dispose stuff incase sleep/require/fetchSync are still running

        setTimeout(dispose, maxTimeout);

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
                            depth: depth || 0,
                            truncate: truncate || 390,
                        })
                    );
                })();
            `
            : `(async () => { \n${script}\n })();`
        );

        await code.run(context, {timeout});

    } catch (e) {
        if (/script execution timed out/i.test(e.message)) {
            e.message = `script timeout: ${nick(msgData.from, true)} ${_.truncate(msgData.text)}`;
        }
        createNodeSend(node, msgData).print.error(e);
    }
    dispose();
}

module.exports = { evaluate };
