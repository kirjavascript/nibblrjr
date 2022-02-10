const { Worker } = require('worker_threads');
const { join } = require('path');

function createServerDB(node) {

    const worker = new Worker(join(__dirname, 'worker.js'), {
        env: {
            address: node.config.address,
        },
        resourceLimits: {
            maxOldGenerationSizeMb: 100,
            maxYoungGenerationSizeMb: 10,
        },
    });

    const queries = new Map();

    let id = 0;
    let isOnline = false;

    const queueQuery = (id, type, subtype, args, resolve, reject) => {
        queries.set(id, { type, subtype, args, resolve, reject });
        if (isOnline) sendQuery(id);
    };

    const sendQuery = id => {
        const { type, subtype, args } = queries.get(id);
        worker.postMessage([id, type, subtype, args]);
    };

    const closeWorker = () => {
        worker.postMessage(['close']);
        setTimeout(worker.terminate, 1000);
    };

    worker
        .on('online', () => {
            isOnline = true;
            for (key of queries.keys()) {
                sendQuery(key);
            }
        })
        .on('message', ([type, id, _data]) => {
            const { resolve, reject } = queries.get(id);
            if (type === 'result') {
                resolve(_data);
            } else if (type === 'error') {
                reject(new Error(_data));
            }
            queries.delete(id);
        })
        .on('error', (err) => {
            console.error(err);
            closeWorker();
        })
        .on('exit', () => {
            console.log(`${node.config.address} db closed`)
        });

    const queryFn = (type, subtype) => (...args) => new Promise((resolve, reject) => {
        queueQuery(id, type, subtype, args, resolve, reject);
        id = (id + 1) % 1e6;
    });

    const storeFns = {
        get: queryFn('storeFns', 'get'),
        set: queryFn('storeFns', 'set'),
        load: queryFn('storeFns', 'load'),
        save: queryFn('storeFns', 'save'),
        all: queryFn('storeFns', 'all'),
        clear: queryFn('storeFns', 'clear'),
    };
    const logFns = {
        get: queryFn('logFns', 'get'),
        count: queryFn('logFns', 'count'),
        user: queryFn('logFns', 'user'),
        random: queryFn('logFns', 'random'),
        regex: queryFn('logFns', 'regex'),
    };

    return {
        storeFns,
        logFns,
        log: (currentNick, message) => {
            if (isOnline) {
                worker.postMessage([
                    undefined,
                    'log',
                    undefined,
                    [currentNick, message],
                ]);
            }

        },
        dispose: closeWorker,
    };
}

module.exports = {
    createServerDB,
};
