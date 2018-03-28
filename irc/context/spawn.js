const { spawn } = require('child_process');

function createCommand(...args) {
    const cmd = spawn(...args);
    return new Promise((resolve, reject) => {
        let [out, err] = ['', ''];
        cmd.stdout.on('data', data => out += data);
        cmd.stderr.on('data', data => err += data);
        cmd.on('close', (code) => {
            if (code == 0) {
                resolve(out);
            }
            else {
                reject(err);
            }
        });
    });
}

function ping(str) {
    return createCommand('ping', ['-c 1', str]);
}

module.exports = {
    ping,
};
