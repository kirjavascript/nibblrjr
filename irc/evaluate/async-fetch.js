const ivm = require('isolated-vm');
const fetch = require('node-fetch');

module.exports = function({ context }) {
    context.evalClosureSync('new ' + String(function () {
        const methods = ['json', 'text'];
        const properties = ['ok', 'headers', 'status', 'statusText', 'redirected', 'url', 'bodyUsed'];
        globalThis.fetch = function (url, config) {
            return new Promise((res1, _reject) => {
                const ref = {};
                function resolve(res, next, nextReject) {
                    res1(res);
                    methods.forEach(method => {
                        res[method] = () => (new Promise((res2) => {
                            ref.chain = res2;
                            next.apply(undefined, [method]);
                        }));
                    });
                    // TODO: handle abort if this isnt done
                }
                function chainedMethod(...args) {
                    if (ref.chain) {
                        return ref.chain(...args);
                    } else {
                        // cleanup
                        // reject
                        log(3);
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
            console.log(config);
            fetch(url, config)
                .then((res) => {
                    // ignore messages from self
                    // timeout
                    // TEST displaying invalid json error
                    // console.log(res)
                    // const type = resolve.applySync(undefined, [res], { arguments: { copy: true } });
                    // console.log(type);
                    // abort controller
                    // content-length
                    // return res.json();
                    return new Promise((next, nextReject) => {
                        resolve.apply(undefined, [
                            {

                            },
                            new ivm.Reference(next),
                            new ivm.Reference(nextReject),
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
                });

            // TODO clean up references
        },
    ]);
}
