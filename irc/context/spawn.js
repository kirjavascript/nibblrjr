const { spawn } = require('child_process');

function createCommand(exe, params, outFilter = (d) => d, errFilter = (d) => d) {
    const cmd = spawn(exe, params);
    return new Promise((resolve, reject) => {
        let [out, err] = ['', ''];
        cmd.stdout.on('data', data => out += data);
        cmd.stderr.on('data', data => err += data);
        cmd.on('close', (code) => {
            if (code == 0) {
                resolve(outFilter(out));
            }
            else {
                reject(errFilter(err));
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
