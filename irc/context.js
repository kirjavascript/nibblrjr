const fetch = require('isomorphic-fetch');
const _ = require('lodash');
// DOM
// date-fns

const mut = {};

function getContext({ print, notice, action, msgData, node }) {

    const IRC = {
        message: msgData,
        trigger: node.get('trigger', '!'),
        nickname: (str) => {
            node.client.send('NICK', str);
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
