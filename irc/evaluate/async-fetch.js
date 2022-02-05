const ivm = require('isolated-vm');
const fetch = require('node-fetch');

module.exports = function({ context }) {
    context.evalClosureSync('new ' + String(function () {
        const responseMethods = ['json', 'text'];
        const headerMethods = ['append', 'delete', 'get', 'has', 'set'];
        class Headers extends Map {
            constructor(entries) {
                super(entries);
                headerMethods.forEach((key) => {
                    this[key] = (name, ...other) =>
                        super[key](name.toLowerCase(), ...other);
                });
            }
        }
        globalThis.fetch = function (url, config) {
            return new Promise((res1, rej1) => {
                const ref = { reject: rej1};
                function resolve(res, next) {
                    res.headers = new Headers(res.headers);
                    res1(res);
                    responseMethods.forEach(method => {
                        res[method] = () => (new Promise((res2, rej2) => {
                            ref.chain = res2;
                            ref.reject = rej2;
                            next.apply(undefined, [method]);
                            next.release();
                        }));
                    });
                }
                function chainedMethod(...args) {
                    if (ref.chain) {
                        return ref.chain(...args);
                    }
                }
                function reject(message) {
                    ref.reject(new Error(message));
                }
                $1(
                    url,
                    config,
                    new $0.Reference(resolve),
                    new $0.Reference(chainedMethod),
                    new $0.Reference(reject)
                );
            });
        }
    }), [
        ivm,
        (url, config, resolve, chainedMethod, reject) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
            }, 5000);
            config.signal = controller.signal;

            fetch(url, config || {})
                .then((res) => {
                    const resData = {};
                    ['ok', 'status', 'statusText', 'redirected', 'url']
                        .forEach(key => { resData[key] = res[key] });
                    resData.headers = Array.from(res.headers.entries());

                    return new Promise((next) => {
                        const nextRef = new ivm.Reference(next);
                        // autoresolve to nothing if the promise is unused
                        setTimeout(() => (next(),nextRef.release()), 50);
                        resolve.apply(undefined, [
                            resData,
                            nextRef,
                        ], { arguments: { copy: true } })
                    })
                        .then((type) => type && res[type]());
                })
                .then(obj => {
                    typeof obj !== 'undefined'
                        && chainedMethod.applySync(undefined, [new ivm.ExternalCopy(obj).copyInto()]);
                })
                .catch((error) => {
                    reject.applyIgnored(undefined, [error.message]);
                })
                .finally(() => {
                    resolve.release();
                    chainedMethod.release();
                    reject.release();
                    clearTimeout(timeout);
                });
        },
    ]);
}
