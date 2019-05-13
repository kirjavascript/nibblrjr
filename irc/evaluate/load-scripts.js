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
    return loadScriptsFromDir('scripts').concat(loadScriptsFromDir('libs'));
};

function loadLazy(name, callback) {
    fs.readFile(path.join(__dirname, 'lazy', name), 'utf8', callback);
}

module.exports = { loadScripts, loadLazy };
