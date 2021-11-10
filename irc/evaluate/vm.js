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

const scripts = loadScripts();

// vm.js
// events.js
// events should last for 5 min

function vm({ node, config }) {
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
    ctx.setSync('_sendRaw', new ivm.Reference(node.sendRaw));

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

    await (await isolate.compileScript(`
        global.scripts = {};
        ${scripts.map(([name, script]) => `
            (function() {
                const exports = {};
                const module = { exports: {} };
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
            colors,
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

        // cleanup

        delete global.config; // TODO: move this
        delete global.scripts;

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
    });

    await bootstrap.run(context);


    function setMessage() {
        // config.IRC.nick
    }

    function setConfig() {
        ctx.setSync('config', new ivm.ExternalCopy(config).copyInto());
    }


    setConfig(config);

    // TODO: events use compileScript
    // TODO: test error happening during creation
    // TODO: timeout
    // TODO: setConfig should create send, etc
    // TODO: config.IRC

    return {
        dispose,
        setConfig,
        setMessage,
        isolate,
    };
}

vm({
    config: {

    },
})
