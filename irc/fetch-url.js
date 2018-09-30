const { AbortController, abortableFetch } = require('abortcontroller-polyfill/dist/cjs-ponyfill');
const { fetch } = abortableFetch(require('node-fetch'));
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

function fetchURL(text, print) {

    const url = text.match(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);

    if (url && url[0] && text.toLowerCase().indexOf('##') == -1) {

        const controller = new AbortController();
        const signal = controller.signal;

        setTimeout(() => {
            controller.abort();
        }, 5000);

        fetch(url[0], {
            headers: {
                'Accept-Language': 'en-GB',
            },
            signal,
        })
            .then(res => res.text())
            .then(res => {

                const title = /<title>(.*?)<\/title>/ig.exec(res);

                if (title && title[1]) {
                    const cleanTitle = entities.decode(title[1]);

                    const str = `\u000312>>\u000f ${cleanTitle}`;

                    if (str.length < 400) {
                        print(str);
                    }
                }
            })
            .catch(res => { });
    }

};

module.exports = {
    fetchURL,
};
