const pick = require('lodash/pick');

const mod = { };

const clearCache = () => {
    Object.keys(require.cache)
        .filter(d => d != __filename && !d.includes('isolated'))
        .forEach(key => void delete require.cache[key]);
};

const loadMod = () => {
    Object.assign(mod, {
        ...pick(
            require('./evaluate'),
            ['evaluate']
        ),
        ...pick(
            require('./fetch-url'),
            ['fetchURL']
        ),
        ...pick(
            require('./evaluate/scripts/parse-command'),
            ['parseCommand']
        ),
        ...pick(
            require('./evaluate/scripts/print'),
            ['createNodeSend']
        ),
    });
};

loadMod();

const updateLoader = () => {
    clearCache();
    loadMod();
};

module.exports = { mod, updateLoader };
