const http = require('http');
const https = require('https');
const fs = require('fs');
const URL = require('url');
const _ = require('lodash');

const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

const filterWords = /forbidden|not found|access denied|your browser|rick roll|never gonna give you up/i;

function bytes(input, places = 2) {
    const sizes = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
    const LEN = sizes.length;
    let index = Math.floor(Math.log(input) / Math.log(1024));
    let val = input / (1024 ** index);
    let suffix = index < LEN ? sizes[index] : '?';
    return (`${index > 0 ? val.toFixed(places) : val}${suffix}B`);
}

function fetchURL({ text, print, disableRedirect = false, showAll = false }) {
    const url = text.match(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;()]*[-A-Z0-9+&@#\/%=~_|()])/ig);

    if (url && url[0] && text.indexOf('##') == -1) {

        let totalSize = 0;
        let output = '';

        const request = url[0].startsWith('https') ? https : http;
        const parsed = URL.parse(url[0]);

        const options = {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-GB,en;q=0.5',
                'Content-Language': 'en-GB,en;q=0.5',
            },
            hostname: parsed.hostname,
            path: parsed.path,
        };
        if (!/youtu\.?be|google|reddit/.test(parsed.hostname)) {
            options.headers['User-Agent'] = 'Googlebot';
        }

        request.get(options, res => {
            if (!disableRedirect && isRedirect(res.statusCode)) {
                // redirect
                const newURL = String(_.get(res, 'headers.location'));
                if (newURL.startsWith('/')) {
                    const newAbsURL = `${parsed.protocol}//${parsed.host}${newURL}`;
                    fetchURL({ text: newAbsURL, print, disableRedirect: true, showAll});
                } else {
                    fetchURL({ text: newURL, print, disableRedirect: true, showAll });
                }
            } else if (String(res.statusCode)[0] === '2') {
                if (+res.headers['content-length'] > 5.243e6) { // 5mb
                    const filename = parsed.path.split('/').pop();
                    print.info(`{dc}${filename}{/} ${bytes(res.headers['content-length'])} {dgr}${res.headers['content-type']}{/}`);
                } else {
                    res.on('data', (chunk) => {
                        totalSize += chunk.length;

                        if (totalSize > 5242880) { // 512kb
                            return res.destroy();
                        }
                        output += chunk;
                    }).on('end', () => {
                        const [, metaTitle] = output.match(/<meta\s+name="title"\s+content="(.+?)"/i) || ['', ''];
                        const [, tagTitle] = output.match(/<title[^>]*>([\S\s]+?)<\/title>/i) || ['', ''];
                        const baseTitle = metaTitle || tagTitle;

                        if (baseTitle) {
                            const title = entities.decode(baseTitle).replace(/\s+/g, ' ').trim();
                            const isFresh = title.split(' ')
                                .filter(word => (
                                    !(new RegExp(word.replace(/[^.a-zA-Z0-9\u00c0-\u017e]+/g, ''), 'i')).test(url[0])
                                )).length >= 1;

                            if (title.length < 400 &&
                                (showAll || (isFresh && !filterWords.test(title)))
                            ) {
                                print.info(title);
                            }
                        }
                    });
                }
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
