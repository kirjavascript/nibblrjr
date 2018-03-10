const { JSDOM } = require('jsdom');
const fetch = require('isomorphic-fetch');
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
    <head>
        <title>lorem shitson</title>
    </head>
    <body>
        <h1>smoosh</h1>
    </body>
</html>
`, {});
const { window } = dom;
const { document, navigator } = window;
const { location } = document;


location.assign = (str) => {
    request(str, (err, resp, body) => {
        if (err) return err;
        dom.reconfigure({url: str});
        document.open();
        document.write(body);
        document.close();
    });
};

module.exports = {
    window,
    location,
    navigator,
    document,
};
