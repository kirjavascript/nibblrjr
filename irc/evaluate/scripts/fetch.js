// these functions are async for legacy reasons

async function getText(...args) {
    return await getWeb('text', ...args);
}
async function getJSON(...args) {
    return await getWeb('json', ...args);
}
async function getDOM(...args) {
    const html = await getWeb('text', ...args);
    const window = createDOM(html);
    return {
        ...window,
        // DOM shortcuts
        body: window.document.body,
        qs: (selector) => {
            return window.document.querySelector(selector) || {};
        },
        qsa: (selector) => {
            return [...window.document.querySelectorAll(selector)] || [];
        },
    };
}
async function getWeb(type, url, options = {}) {
    options.type = type;
    return fetchSync(url, options);
}

// fetchSync

function createDOM(text) {
    const dom = new (jsdom().JSDOM)(text);
    delete dom.window.localStorage;
    delete dom.window.sessionStorage;
    return dom.window;
}

function createFetchSync(ref) {
    const fetchRaw = (url, type, config = {}) => {
        return ref.fetchSync.applySyncPromise(undefined, [
            url,
            type,
            new ref.ivm.ExternalCopy(config).copyInto(),
        ]);
    };
    const fetchSync = (url, config = {}) => {
        if (config.type == 'dom') {
            const text = fetchRaw(url, 'text', config);
            return createDOM(text);
        }
        return fetchRaw(url, config.type, config);
    };

    fetchSync.json = (url, config) => {
        return fetchRaw(url, 'json', config);
    };

    fetchSync.dom = (url, config) => {
        return createDOM(fetchRaw(url, 'text', config));
    };

    return fetchSync;
}

module.exports = {
    global: {
        getText,
        getJSON,
        getDOM,
    },
    createFetchSync,
};
