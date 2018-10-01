const http = require('http');
const https = require('https');
const fs = require('fs');
const URL = require('url');
const _ = require('lodash');

const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

function fetchURL(text, print, disableRedirect) {

    const url = text.match(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);

    if (url && url[0] && text.toLowerCase().indexOf('##') == -1) {

        let totalSize = 0;
        let output = '';

        const request = url[0].startsWith('https') ? https : http;
        const parsed = URL.parse(url[0]);

        const options = {
            headers: {
                'Accept-Language': 'en-GB',
            },
            hostname: parsed.hostname,
            path: parsed.path,
        };

        request.get(options, res => {
            if (isRedirect(res.statusCode)) {
                // TODO: relative URL redirect
                // redirect
                fetchURL(String(_.get(res, 'headers.location')), print, true);
            } else {
                res.on('data', (chunk) => {
                    totalSize += chunk.length;

                    if (totalSize > 5242880) { // 512kb
                        return res.destroy();
                    }

                    output += chunk;
                }).on('end', () => {
                    const title = /<title>(.*?)<\/title>/ig.exec(output);

                    if (title && title[1]) {
                        const cleanTitle = entities.decode(title[1]);

                        const str = `\u000312>>\u000f ${cleanTitle}`;

                        if (str.length < 400) {
                            print(str);
                        }
                    }
                });
            }
        });

    }

};

function isRedirect(code) {
    return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
}

module.exports = {
    fetchURL,
};
