const ivm = require('isolated-vm');

const fs = require('fs');
const { ping } = require('./spawn');
const fetch = require('node-fetch');
const FormData = require('form-data');
const colors = require('./scripts/colors');
const { acquire } = require('./acquire');
const { sudo, auth } = require('./access');
const { createNodeSend } = require('./scripts/print');
const { loadScripts, loadLazy }  = require('./load-scripts');
const { version } = require('../../package.json');

const maxTimeout = 60000 * 5;

const scripts = loadScripts();

// vm.js
// events.js
// events should last for 5 min

async function vm({ node }) {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const ctx = context.global;

    function dispose() {
        if (!isolate.isDisposed) {
            isolate.dispose();
            context.release();
        }
    }

    ctx.setSync('global', ctx.derefInto());

    ctx.setSync('_ivm', ivm);
    ctx.setSync('_resetBuffer', new ivm.Reference(node.resetBuffer));
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

    ctx.setSync('scripts', scriptRef);

    const bootstrap = await isolate.compileScript('new '+ function() {

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
            // ...config.IRC,
            // colors,
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

        IRC.resetBuffer = () => {
            ref.resetBuffer.applySync();
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

        // remove injected scripts

        delete global.scripts;
    });

    await bootstrap.run(context);

    const configScript = await isolate.compileScript('new '+ function() {

        const {
            hasColors,
            canBroadcast,
            lineLimit,
            charLimit,
            // commandLimit, // add a runOnce() wrapper... maybe?
        } = config;

        Object.assign(IRC, config.IRC);

        const colors = scripts.colors.getColorFuncs(config.IRC.trigger);
        IRC.colors = colors;

        scripts.print.createPrint({
            hasColors,
            canBroadcast,
            sendRaw,
            lineLimit,
            charLimit,
            colors,
        });

        delete global.config;
        delete global.sendRaw;
        delete global.scripts;
    });

    async function setConfig(config) {
        const vmConfig = Object.assign({
            hasColors: node.get('colors', true),
            lineLimit: 10,
            canBroadcast: false,
            IRC: Object.assign({
                trigger: node.trigger,
                nick: node.client.nick,
                webAddress: _.get(node, 'parent.web.url', '[unspecified]'),
                epoch: node.parent.epoch,
                version,
                nodeVersion: process.version.slice(1),
            }, config.IRC),
        }, config);
        ctx.setSync('config', new ivm.ExternalCopy(vmConfig).copyInto());
        ctx.setSync('sendRaw', new ivm.Reference(node.sendRaw));
        ctx.setSync('scripts', scriptRef);
        await configScript.run(context);
    }

    async function evaluate(script, { timeout, evalType }) {
        const rawScript = {
            evalPrint: () => `
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
            functionBody: () => `(async () => { \n${script}\n })();`,
        }[evalType]?.(script) || script;

        if (timeout) {
            // dispose stuff incase sleep/require/fetchSync are still running
            setTimeout(dispose, maxTimeout);
        }

        await code.run(rawScript, { timeout });
    }


    // await setConfig(config);

    // onMessage
    // onDispose

    // TODO: char limit as well as line limit
    // TODO: events use compileScript
    // TODO: test error happening during creation

    return {
        dispose,
        evaluate,
        setConfig,
        isolate,
    };
}

module.exports = vm;
