const fetch = require('isomorphic-fetch');
const { parseColors } = require('./colors');
const _ = require('lodash');
// date-fns

const mut = {};

function getContext({ print, notice, action, msgData, node }) {

    const IRC = {
        parseColors,
        message: msgData,
        trigger: node.get('trigger', '!'),
        nickname: (str) => {
            node.client.send('NICK', str);
        },
        topic: (str) => {
            node.client.send('TOPIC', msgData.target, str);
        },
        resetBuffer: () => {
            node.client._clearCmdQueue();
        },
    };

    // add legacy

    const ctx = {
        IRC,
        print,
        notice,
        action,
        getJSON,
        getText,
        mut,
        fetch,
        _,
    };

    return ctx;
}

async function getText(url) {
    return await getWeb('text', url);
}
async function getJSON(url) {
    return await getWeb('json', url);
}
async function getWeb(type, url) {
    try {
        const res = await fetch(url);
        const out = await res[type]();
        return out;
    }
    catch (e) {
        return e;
    }
}

module.exports = {
    getContext,
};
