const { Worker } = require('worker_threads');
const { join } = require('path');

const connections = new Map();
const closeKey = Symbol();

async function waitSQLClose() {
    // tell all the open connections to close
    for (const sqlDB of connections.values()) {
        sqlDB[closeKey]();
    }
    while (connections.size) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

function useSQLDB(namespace) {
    if (connections.has(namespace)) {
        return connections.get(namespace);
    }

    const worker = new Worker(join(__dirname, 'worker.js'), {
        env: {
            namespace,
        },
        resourceLimits: {
            maxOldGenerationSizeMb: 100,
            maxYoungGenerationSizeMb: 10,
        },
    });

    const queries = new Map();

    let id = 0;
    let isOnline = false;
    let isClosed = false;
    let activityTimeout;
    let closeTimeout;

    const queueQuery = (id, type, query, resolve, reject) => {
        if (isClosed) {
            reject(new Error(`db restart`));
        } else {
            queries.set(id, { type, query, resolve, reject });
            if (isOnline) sendQuery(id);
        }
    };

    const sendQuery = id => {
        const { type, query } = queries.get(id);
        worker.postMessage([type, id, query]);
    };

    // two step close -> mark as closed and notify worker

    const closeWorker = () => {
        isClosed = true;
        // flush queries
        for (const { reject } of queries.values()) {
            reject(new Error(`db restart`));
        }
        // close worker
        worker.postMessage(['close']);
        // kill it if it didnt close
        closeTimeout = setTimeout(removeWorker, 3000);
    };

    const removeWorker = () => {
        clearTimeout(closeTimeout);
        connections.delete(namespace);
        worker.terminate();
        console.log(`unload db ${namespace}`);
    };

    const bump = () => {
        clearTimeout(activityTimeout);
        activityTimeout = setTimeout(closeWorker, 60000);
    };

    const queryFn = type => query => new Promise((resolve, reject) => {
        // console.time(id);
        queueQuery(id++, type, query, resolve, reject);
    });

    const sqlDB = {
        all: queryFn('all'),
        get: queryFn('get'),
        run: queryFn('run'),
        [closeKey]: closeWorker,
    };

    connections.set(namespace, sqlDB);

    bump();

    worker
        .on('online', () => {
            console.log(`load db ${namespace}`);
            isOnline = true;
            for (key of queries.keys()) {
                sendQuery(key);
            }
        })
        .on('message', ([type, id, _data]) => {
            if (type === 'bump') {
                bump();
            } else {
                const { resolve, reject } = queries.get(id);
                // console.timeEnd(id);
                if (type === 'result') {
                    resolve(_data);
                } else if (type === 'error') {
                    reject(_data);
                }
                queries.delete(id);
            }
        })
        .on('error', (err) => {
            console.error(err);
            closeWorker();
        })
        .on('exit', () => {
            if (connections.has(namespace)) {
                removeWorker();
            }
        });

    return sqlDB;

}

module.exports = { useSQLDB, waitSQLClose };
