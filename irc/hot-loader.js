const pick = require('lodash/pick');

const mod = { };

const clearCache = () => {
    Object.keys(require.cache)
        .filter(d => d.key != __filename)
        .forEach(key => void delete require.cache[key]);
};

const loadMod = () => {
    Object.assign(mod, {
        ...pick(
            require('./printer'),
            ['printFactory', 'noticeFactory', 'actionFactory']
        ),
        ...pick(
            require('./evaluate'),
            ['evaluate']
        ),
        ...pick(
            require('./fetch-url'),
            ['fetchURL']
        ),
        ...pick(
            require('./context'),
            ['getContext']
        ),
        ...pick(
            require('./parse-command'),
            ['parseCommand']
        ),
    });
};

loadMod();

const updateLoader = () => {
    clearCache();
    loadMod();
};

module.exports = { mod, updateLoader };
