// const logger = require('./logger');
const util = require('util');
const vm = require('vm');

Object.assign(util.inspect.styles, {
    null: 'red',
    // undefined: 'purple',
});

function evaluate({ input }) {
    const context = {};

    try {
        const evaluation = vm.runInNewContext(input, context, {
            displayErrors: false,
            timeout: 3000,
            filename: 'purple',
        });


        const output = util.inspect(evaluation, { depth: 2, colors: true })
            .replace(/\s+/g, ' ')
            .replace(new RegExp('\u001b\\[39m', 'g'), '\u000f')// reset
            .replace(new RegExp('\u001b\\[31m', 'g'), '\u000313') // null
            .replace(new RegExp('\u001b\\[33m', 'g'), '\u000307') // num / bool
            .replace(new RegExp('\u001b\\[32m', 'g'), '\u000303')// str
            .replace(new RegExp('\u001b\\[90m', 'g'), '\u000314')// str
            .replace(new RegExp('\u001b\\[36m', 'g'), '\u000310')// func

        // console.log('eval', [input, evaluation, output]);

        // colorMap.forEach(([find, replace]) => {
        //     output = output.replace(find, replace);
        // });

        return output;
    } catch(e) {
        console.log(input);
        return `\u000304${e.name}: ${e.message}`;
    }
}

module.exports = {
    evaluate,
};
