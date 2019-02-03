const babel = require('@babel/standalone');
const protect = require('loop-protect');

babel.registerPlugin('loopProtection', protect(100));

function transform(source) {
    try {
        return babel.transform(source, {
            plugins: [
                'loopProtection',
            ],
        }).code
    } catch (e) {
        return source;
    }
}

module.exports = {
    loopProtect: transform,
};
