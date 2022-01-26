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
    });

    const queries = new Map();
    let id = 0;
    let isOnline = false;
    let isClosed = false;
    let activityTimeout;
    let closeTimeout;
    const disposers = [];

    // queryID

    // for close: main (mark ded) -> worker (close) -> msg -> main terminate
    // TODO: log to console about DB connections
    // TODO: resourceLimits
    // TODO: error handling

    // TODO: dispose in sig when it's happening
    // TODO: remove queries when returned

    // for memo, the connection will always be open ^_^

    const queueQuery = (id, type, query, resolve, reject) => {
        if (isClosed) {
            reject(new Error(`db restarting`));
        } else {
            queries.set(id, [type, query, resolve, reject]);
            if (isOnline) sendQuery(id);
        }
    };

    const sendQuery = id => {
        const [type, query] = queries.get(id);
        worker.postMessage([type, id, query]);
    };

    // two step close -> mark as closed

    const closeWorker = () => {
        console.log('close');
        isClosed = true;
        // flush queries
        for (const [_type, _query, _resolve, reject] of queries.values()) {
            reject(new Error(`db restarting`));
        }
        // close worker
        worker.postMessage(['close']);
        // kill it if it didnt close
        closeTimeout = setTimeout(removeWorker, 3000);
    };

    const removeWorker = () => {
        console.log('remove');
        clearTimeout(closeTimeout);
        connections.delete(namespace);
        worker.terminate();
        console.log(connections);
    };

    const bump = () => {
        console.log('bump');
        clearTimeout(activityTimeout);
        activityTimeout = setTimeout(closeWorker, 6000);
    };

    const sqlDB = {
        all: (query) => new Promise((resolve, reject) => {
            queueQuery(id++, 'all', query, resolve, reject);
        }),
        [closeKey]: closeWorker,
    };

    connections.set(namespace, sqlDB);

    bump();

    worker
        .on('online', () => {
            isOnline = true;
            for (key of queries.keys()) {
                sendQuery(key);
            }
        })
        .on('message', ([type, ...args]) => {
            console.log(2, type, args);
            if (type === 'bump') {
                bump();
            }
        })
        .on('error', (err) => {
            console.error(err);
            // error = err;
        })
        .on('exit', () => {
            console.error('exit');
            if (connections.has(namespace)) {
                removeWorker();
            }
            disposers.forEach(disposer => disposer());
        });

    return sqlDB;

}


module.exports = { useSQLDB, waitSQLClose };
