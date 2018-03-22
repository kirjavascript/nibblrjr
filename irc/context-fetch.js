const fetch = require('isomorphic-fetch');
const { JSDOM } = require('jsdom');

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
        body: dom.window.document.body,
        qs: (selector) => {
            return dom.window.document.querySelector(selector) || {};
        },
        qsa: (selector) => {
            return [...dom.window.document.querySelectorAll(selector)] || [];
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
    getJSON,
    getDOM,
    getText,
};
