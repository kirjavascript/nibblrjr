const babel = require('@babel/standalone');
const protect = require('loop-protect');

babel.registerPlugin('loopProtection', protect(100));

const transform = source => babel.transform(source, {
    plugins: ['loopProtection'],
}).code;

module.exports = {
    loopProtect: transform,
};
