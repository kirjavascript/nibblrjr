const fs = require('fs');
const ivm = require('isolated-vm');
const { ping } = require('./spawn');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { acquire } = require('./acquire');
const { sudo, auth } = require('./access');
const { loadScripts }  = require('./load-scripts');
const { version } = require('../../package.json');

const scripts = loadScripts();

async function createVM({ node, maxTimeout = 60000 * 5 }) {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const ctx = context.global;
    const env = {
        target: undefined,
        namespace: undefined,
        hasSetNick: false,
    };

    function dispose() {
        if (!isolate.isDisposed) {
            context.release();
            isolate.dispose();
        }
    }

    if (maxTimeout) {
        // dispose stuff incase sleep/require/fetchSync are still running
        setTimeout(dispose, maxTimeout);
    }

    ctx.setSync('global', ctx.derefInto());

    ctx.setSync('_ivm', ivm);
    ctx.setSync('_resetBuffer', new ivm.Reference(node.resetBuffer));
    ctx.setSync('_setNick', new ivm.Reference((str) => {
        if (env.hasSetNick) {
            str = String(str).replace(/[^a-zA-Z0-9]+/g, '');
            node.client.send('NICK', str);
            return true;
        } else {
            return false;
        }
    }));
    ctx.setSync('_whois', new ivm.Reference((text) => (
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
    ctx.setSync('_ping', new ivm.Reference(ping));
    ctx.setSync('_wordList', new ivm.Reference(() => (
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

    ctx.setSync('_fetchSync', new ivm.Reference((url, type, config = {}) => (
        new Promise((resolve, reject) => {
            if (config.form) {
                const form = new FormData();
                Object.entries(config.form)
                    .forEach(([k, v]) => form.append(k, v));
                config.body = form;
                if (!('method' in config)) {
                    config.method = 'POST';
                }
            }
            fetch(url, config)
                .then((res) => res[type || 'text']())
                .then(obj => resolve(new ivm.ExternalCopy(obj).copyInto()))
                .catch(reject);
        })
    )));

    ctx.setSync('_require', new ivm.Reference((str) => (
        new Promise((resolve, reject) => {
            acquire(str)
                .then(obj => { resolve(obj.toString()) })
                .catch(reject);
        })
    )));
    ctx.setSync('_sleep', new ivm.Reference((ms) => (
        new Promise((resolve) => {
            setTimeout(resolve, Math.min(ms, maxTimeout));
        })
    )));

    ctx.setSync('_auth', new ivm.Reference((from, isSudo) => (
        new Promise((resolve, reject) => {
            (isSudo ? sudo : auth)({
                node,
                from,
                callback: (err) => err ? reject(err) : resolve(),
            });
        })
    )));

    ctx.setSync('_sudoProxy', new ivm.Reference((config) => {
        if (config === 'exit') {
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
        if (key === 'get') {
            return new ivm.ExternalCopy(parent[leaf]).copyInto()
        } else if (key === 'set') {
            parent[leaf] = value[0];
        } else if (key === 'call') {
            if (typeof parent[leaf] == 'function') {
                return parent[leaf](...value);
            } else {
                throw new Error('not a function');
            }
        }
    }));

    ctx.setSync(
        '_commandFnsKeys',
        Object.keys(node.parent.database.commands.fns).join('|'),
    );
    ctx.setSync('_commandFns', new ivm.Callback((fnName, args) => {
        return node.parent.database.commands.fns[fnName](...args);
    }));

    ctx.setSync(
        '_storeFnsKeys',
        Object.keys(node.database.storeFns).join('|'),
    );
    ctx.setSync('_storeFns', new ivm.Callback((fnName, args) => {
        if (env.namespace) {
            return node.database.storeFns[fnName](env.namespace, ...args);
        }
    }));

    ctx.setSync(
        '_logFnsKeys',
        Object.keys(node.database.logFns).join('|'),
    );
    ctx.setSync('_logFns', new ivm.Callback((fnName, args) => {
        if (env.target) {
            return node.database.logFns[fnName](env.target, ...args);
        }
    }));

    ctx.setSync('_sqlFns', new ivm.Reference((fnName, args) => {
        if (env.namespace) {
            return node.parent.database.useSQLDB(env.namespace)[fnName](...args);
        }
    }));

    const scriptRef = await (await isolate.compileScript(`
        (function () {
            const scripts = {};
            ${scripts.map(([name, script]) => `
                (function() {
                    const exports = {};
                    const module = { exports: {} };
                    ${script};
                    scripts[${JSON.stringify(name)}] = module.exports;
                })();
            `).join('')}
            return new _ivm.Reference(scripts);
        }) ()
     `)).run(context);

    ctx.setSync('scripts', scriptRef.derefInto());

    const bootstrap = await isolate.compileScript('new ' + String(function() {

        // collect underscored objects

        const ref = Object.keys(global)
            .filter(key => key.startsWith('_'))
            .reduce((a, c) => {
                a[c.slice(1)] = global[c];
                delete global[c];
                return a;
            }, {});

        // fetch stuff

        Object.assign(global, scripts.fetch.global);
        global.fetchSync = scripts.fetch.createFetchSync(ref);

        // npm-require

        global.require = (str) => (
            new Function(`
                const exports = {};
                const module = { exports };
                const process = { env: {} };
                ${ref.require.applySyncPromise(undefined, [String(str)])}
                return module.exports;
            `)()
        );

        // acquire (legacy)

        global.acquire = async (str) => require(str);

        // timeouts

        global.sleep = (ms) => ref.sleep.applySyncPromise(undefined, [ms]);

        // create IRC object

        global.IRC = {
            inspect: scripts.inspect,
            breakHighlight: (s) => `${s[0]}\uFEFF${s.slice(1)}`,
            parseCommand: scripts['parse-command'].parseCommand,
            parseTime: scripts['parse-time'].parseTime,
        };

        global.module = { required: false };

        const requireCache = {};
        IRC.require = (str) => {
            if (requireCache[str]) return requireCache[str];
            const obj = IRC.commandFns.get(str);
            if (obj) {
                const module = new Function(`
                        const module = { required: true };
                        ${obj.command}
                        return module;
                    `)();
                requireCache[str] = module.exports;
                return module.exports;
            } else {
                const error = new Error(str + ' not found');
                error.name = 'RequireError';
                throw error;
            }
        };

        IRC.commandFns = {};
        ref.commandFnsKeys.split('|').forEach(key => {
            IRC.commandFns[key] = (...args) => {
                return ref.commandFns(key, args);
            };
        });

        global.store = {};
        ref.storeFnsKeys.split('|').forEach(key => {
            global.store[key] = (...args) => {
                return ref.storeFns(key, args);
            };
        });

        IRC.log = {};
        ref.logFnsKeys.split('|').forEach(key => {
            IRC.log[key] = (...args) => {
                return ref.logFns(key, args);
            };
        });

        global.SQL = {};
        SQL.all = (...args) => ref.sqlFns.applySyncPromise(undefined, [
            'all', new ref.ivm.ExternalCopy(args).copyInto(),
        ]);
        // TODO: async api

        IRC.resetBuffer = () => {
            ref.resetBuffer.applySync();
        };

        IRC.setNick = (str) => {
            return ref.setNick.applySync(undefined, [str]);
        };

        IRC.whois = (text) => {
            return ref.whois.applySyncPromise(undefined, [text]);
        };

        IRC.ping = (str) => ref.ping.applySyncPromise(undefined, [
            str,
        ]);

        Object.defineProperty(IRC, 'wordList', {
            get: () => ref.wordList.applySyncPromise().trim().split(/\n|\r\n/),
        });

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

        // lazy load some stuff

        let jsdom;
        global.jsdom = () => {
            if (!jsdom) {
                require('fast-text-encoding@1.0.3');
                global.Buffer = require('buffer').Buffer;
                jsdom = require('light-jsdom@17.0.0');
                const { JSDOM } = jsdom;
                jsdom.JSDOM = class extends JSDOM {
                    constructor(dom, config = { url: 'https://localhost/' }) {
                        super(dom, config);
                    }
                    get document() {
                        return this.window.document;
                    }
                };
            }
            return jsdom;
        };

        // env patches

        const { from } = Array;
        Array.from = (...args) => {
            if (args?.[0]?.length > 20000000) {
                throw new Error('memory error');
            }
            return from(...args);
        };
        Object.defineProperty(Array.prototype, 'fill', {
            value: function (t) {
                if (null == this) throw new TypeError('this is null or not defined');
                for (
                    var n = Object(this),
                    r = n.length >>> 0,
                    e = arguments[1],
                    i = e >> 0,
                    o = i < 0 ? Math.max(r + i, 0) : Math.min(i, r),
                    a = arguments[2],
                    h = void 0 === a ? r : a >> 0,
                    l = h < 0 ? Math.max(r + h, 0) : Math.min(h, r);
                    o < l;

                )
                    (n[o] = t), o++;
                return n;
            },
        });

        // patch RegExp.$_
        /\s*/.test('');

        ['global', 'getDOM', 'getJSON', 'getText','acquire']
            .forEach(key => Object.defineProperty(global, key, {
                enumerable: false,
            }));

        // remove injected scripts

        delete global.scripts;
    }));

    await bootstrap.run(context);

    const configScript = await isolate.compileScript('new '+ function() {
        Object.assign(IRC, config.IRC);
        const { onPrint } = global;

        const colors = scripts.colors.getColorFuncs(config.IRC.trigger);
        IRC.colors = colors;

        if (config.print.target) {
            const { sendRaw } = global;
            Object.assign(global, scripts.print.createSend({
                ...config.print,
                sendRaw: (...args) => {
                    sendRaw.applySync(undefined, args);
                },
                inspect: IRC.inspect,
                colors,
                onMessage: onPrint && ((args) => {
                    onPrint.applyIgnored(undefined, [args], {
                        arguments: { copy: true },
                    });
                }),
            }));
            global.log = print.log;
        }
        global.input = IRC.command && IRC.command.input;

        store.namespace = config.namespace;

        delete global.config;
        delete global.sendRaw;
        delete global.scripts;
        delete global.onPrint;
    });

    async function setConfig(config) {
        const { web } = node.parent.config;
        const webAddress = web && web.url || '[unspecified]';
        const vmConfig = {
            print: Object.assign({
                canBroadcast: false,
                // target
            }, node.getPrintCfg(config.print.target), config.print),
            IRC: Object.assign({
                trigger: node.trigger,
                nick: node.client.nick,
                webAddress,
                epoch: node.parent.epoch,
                // message
                // command
                // _event
                version,
                nodeVersion: process.version.slice(1),
            }, config.IRC),
            namespace: config.namespace,
        };
        env.hasSetNick = config.hasSetNick || false;
        env.namespace = config.namespace;
        env.target = vmConfig.print.target;

        ctx.setSync('config', new ivm.ExternalCopy(vmConfig).copyInto());
        ctx.setSync('sendRaw', new ivm.Reference(node.sendRaw));
        ctx.setSync('scripts', scriptRef.derefInto());
        if (config.onPrint) {
            ctx.setSync('onPrint', new ivm.Reference(config.onPrint));
        }
        await configScript.run(context);
    }

    async function evaluate(script, { timeout = 30000, evalType }) {
        const rawScript = {
            evalPrint: `
                (async function () {
                    // take references to functions so they cannot be deleted
                    const [printRaw, IRCinspect] = [print.raw, IRC.inspect];
                    const [depth, truncate] = IRC.command.params;
                    // run in global scope
                    const result = (0, eval)(${JSON.stringify(script)});
                    const promise = result == Promise.resolve(result) && await result;

                    printRaw(
                        IRCinspect(result, {
                            depth: depth || 0,
                            truncate: truncate || 390,
                            promise,
                        })
                    );
                })();
            `,
            functionBody: `(async () => { \n${script}\n })();`,
        }[evalType] || script;

        await context.eval(rawScript, { timeout });
    }

    return {
        isolate,
        context,
        dispose,
        evaluate,
        setConfig,
    };
}

module.exports = createVM;
