// multiline

const codes = {
    r: '04',
    dr: '05',
    w: '00',
    bl: '01',
    c: '11',
    dc: '10',
    b: '12',
    db: '02',
    g: '09',
    dg: '03',
    p: '13',
    dp: '06',
    o: '07',
    y: '08',
    gr: '14',
    dgr: '15',

    // formatting
    u: '\u001f',
    bo: '\u0002',
    i: '\u001D',

    bell: '\x07',

    // reset
    '/': '\u000f',
};

function colorParser(text) {
    return text
        .replace(/{(u|bo|i|bell)}/gm, (str, key) => {
            return codes[key];
        })
        .replace(/{(.*?)}/gm, (str, key) => {
            if (!codes[key]) {
                return str;
            }
            else {
                return `\u0003${codes[key]}`;
            }
        })
        .replace(/{(.*?),(.*?)}/gm, (str, key1, key2) => {
            const [a, b] = [key1.trim(), key2.trim()];
            if (codes[a] && codes[b]) {
                return `\u0003${codes[a]},${codes[b]}`;
            }
            else {
                return str;
            }
        });
}

module.exports = {
    colorParser,
};
