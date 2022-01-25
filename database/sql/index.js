const { Worker } = require('worker_threads');
const { join } = require('path');

const workers = new Map();

// log to console about DB connections

function spawn(namespace) {
    const worker = new Worker(join(__dirname, 'worker.js'), {
        env: {
            namespace,
        },
    });

    worker
        .on('online', () => {
            console.log('online');
            // workers.push({ takeWork });
            // takeWork();
        })
        .on('message', (result) => {
            console.log(result, 1);
            // job.resolve(result);
            // job = null;
            // takeWork(); // Check if there's more work to do
        })
        .on('error', (err) => {
            console.error(err);
            // error = err;
        })
        .on('exit', (code) => {
            console.error('exit');
            // workers = workers.filter(w => w.takeWork !== takeWork);
            // if (job) {
            //   job.reject(error || new Error('worker died'));
            // }
            // if (code !== 0) {
            //   console.error(`worker exited with code ${code}`);
            //   spawn(); // Worker died, so spawn a new one
            // }
        });

    return {
        exec: new Promise(() => {}),
    };
}


function useSQLDB(namespace) {
    spawn(namespace);
}

module.exports = { useSQLDB };
