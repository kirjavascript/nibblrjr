const fetch = require('isomorphic-fetch');
const { JSDOM } = require('jsdom');
const { parseColors } = require('./colors');
const _ = require('lodash');
// date-fns

const mut = {};

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
        getJSON,
        getDOM,
        getText,
        mut,
        fetch,
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

async function getText(url) {
    return await getWeb('text', url);
}
async function getJSON(url) {
    return await getWeb('json', url);
}
async function getDOM(url) {
    const html = await getWeb('text', url);
    const dom = new JSDOM(html);
    return {
        ...dom.window,
        // DOM shortcuts
        doc: dom.window.document,
        qs: (selector) => {
            return dom.window.document.body.querySelector(selector) || {};
        },
        qsa: (selector) => {
            return [...dom.window.document.body.querySelectorAll(selector)] || [];
        },
    };
}
async function getWeb(type, url) {
    try {
        const res = await fetch(url);
        const out = await res[type]();
        return out;
    }
    catch (e) {
        throw e;
    }
}

module.exports = {
    getContext,
};
