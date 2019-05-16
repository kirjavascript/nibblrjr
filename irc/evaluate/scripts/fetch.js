// these functions are async for legacy reasons

async function getText(...args) {
    return await getWeb('text', ...args);
}
async function getJSON(...args) {
    return await getWeb('json', ...args);
}
async function getDOM(...args) {
    const html = await getWeb('text', ...args);
    const dom = new (jsdom().JSDOM)(html);
    // not allowed for opaque origins (we don't need them anyway)
    delete dom.window.localStorage;
    delete dom.window.sessionStorage;
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
async function getWeb(type, url, options = {}) {
    options.type = type;
    return fetchSync(url, options);
}

// for adding DOM to fetchSync

function wrapDOM(config = {}, fromConfig) {
    if (config.type == 'dom') {
        config.type = 'text';
        const text = fromConfig(config);
        const dom = new (global.jsdom().JSDOM)(text);
        delete dom.window.localStorage;
        delete dom.window.sessionStorage;
        return dom.window;
    } else {
        return fromConfig(config);
    }
}

module.exports = {
    global: {
        getText,
        getJSON,
        getDOM,
    },
    wrapDOM,
};
