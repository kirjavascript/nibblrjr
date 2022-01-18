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
            return new Promise((res1, _reject) => {
                const ref = {};
                function resolve(res, next) {
                    res.headers = new Headers(res.headers);
                    res1(res);
                    responseMethods.forEach(method => {
                        res[method] = () => (new Promise((res2) => {
                            ref.chain = res2;
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
                    _reject(new Error(message));
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
            fetch(url, config)
                .then((res) => {
                    console.log(res.headers['content-length'])
                    const resData = {};
                    ['ok', 'status', 'statusText', 'redirected', 'url']
                        .forEach(key => { resData[key] = res[key] });
                    resData.headers = Array.from(res.headers.entries());
                    // config timeout
                    // abort controller
                    // TODO: handle abort if unused
                    // content-length
                    // limit out size

                    return new Promise((next) => {
                        // autoresolve to nothing if the promise is unused
                        setTimeout(next, 50);
                        resolve.apply(undefined, [
                            resData,
                            new ivm.Reference(next),
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
                    resolve.release();
                    chainedMethod.release();
                    reject.release();
                });
        },
    ]);
}
