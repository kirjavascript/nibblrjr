const mod = { };

const clearCache = () => {
    Object.keys(require.cache)
        .filter(d => d != __filename && !d.includes('isolated'))
        .forEach(key => void delete require.cache[key]);
};

const loadMod = () => {
    Object.assign(mod, {
        ...require('./evaluate'),
        ...require('./evaluate/scripts/parse-command'),
        ...require('./evaluate/scripts/print'),
        ...require('./fetch-url'),
    });
};

loadMod();

const updateLoader = () => {
    clearCache();
    loadMod();
};

module.exports = { mod, updateLoader };
