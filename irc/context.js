const { getText, getJSON, getDOM } = require('./fetch-context');
const { parseColors } = require('./colors');
const dateFns = require('date-fns');
const _ = require('lodash');

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

    // add legacy

    const ctx = {
        print,
        notice,
        action,
        getText,
        getJSON,
        getDOM,
        dateFns,
        _,
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
