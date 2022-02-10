const fs = require('fs');
const path = require('path');

function loadScriptsFromDir(dir) {
    return fs.readdirSync(path.join(__dirname, dir))
        .map(filename => {
            return [
                path.parse(filename).name,
                fs.readFileSync(path.join(__dirname, dir, filename), 'utf8'),
            ];
        })
}

function loadScripts() {
    return loadScriptsFromDir('scripts');
};

module.exports = { loadScripts };
