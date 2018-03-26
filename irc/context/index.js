const { getText, getJSON, getDOM } = require('./fetch');
const { parseColors } = require('../colors');
const { limit } = require('./limit');
const dateFns = require('date-fns');
const _ = require('lodash');

// function requireSafe(str) {
//     return require('vm').runInNewContext(`require('${str}');`, {});
// }

function getContext({ print, notice, action, msgData, node }) {

    const IRC = {
        parseColors,
        message: msgData,
        trigger: node.get('trigger', '!'),
        webAddress: _.get(node, 'parent.web.url', '[unspecified]'),
        nickname: (str) => {
            node.client.send('NICK', str);
        },
        topic: (str) => {
            node.client.send('TOPIC', msgData.target, str);
        },
        resetBuffer: () => {
            node.client._clearCmdQueue();
            node.intervals.forEach(clearInterval);
            node.timeouts.forEach(clearTimeout);
            node.intervals = [];
            node.timeouts = [];
        },
    };

    const ctx = {
        print,
        notice,
        action,
        getText: limit(getText),
        getJSON: limit(getJSON),
        getDOM: limit(getDOM),
        dateFns,
        _: {..._, delay: void 0, defer: void 0, debounce: void 0, throttle: void 0},
        setTimeout(...args) {
            return node.timeouts.push(setTimeout(...args));
        },
        setInterval(...args) {
            return node.intervals.push(setInterval(...args));
        },
        IRC,
    };

    return ctx;
}

module.exports = {
    getContext,
};
