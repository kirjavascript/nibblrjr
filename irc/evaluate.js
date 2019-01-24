const util = require('util');
util.inspect.styles.null = 'red';
const { VM } = require('vm2');
const { acquire } = require('./context/acquire');
const { createRequireModules } = require('./context/require');

async function evaluate({ input, context, printOutput, wrapAsync, hasRequire }) {

    try {
        context.acquire = acquire;
        if (hasRequire) {
            context.injectRequire = await createRequireModules(input);
            // ~vote
        }

        const code = wrapAsync ? `(async () => {
            try {
                ${input}
            } catch (e) {
                print.error(e);
            }
        })();` : input;

        const evaluation = new VM({
            timeout: 3000,
            sandbox: context,
        }).run(`
            delete global.console;
            global.module = {};
            [
                'VMError',
                'Buffer',
                'module',
                'setTimeout',
                'clearTimeout',
                'setInterval',
                'clearInterval',
            ].forEach(key => {
                Object.defineProperty(this, key, { enumerable: false });
            });
            (() => {
                IRC.require = (str) => {
                    const obj = IRC.commandFns.get(str);
                    if (obj) {
                        const module = new Function(\`
                            \${obj.command}
                            return this.module;
                        \`)();
                        return module.exports;
                    }
                    else {
                        const error = new Error(str + ' not found');
                        error.name = 'RequireError';
                        throw error;
                    }
                };
                if (global.injectRequire) {
                    global.require = injectRequire();
                    delete global.injectRequire;
                }
            })();

            ${code}
        `);

        if (printOutput) {
            context.print.raw(objectDebug(evaluation));
        }
    } catch (e) {
        context.print.error(e);
    }

}

function objectDebug(evaluation, { depth = 0, colors = true } = {}) {
    const outputFull = util.inspect(evaluation, { depth, colors });
    const output = outputFull.length > 396
        ? outputFull.slice(0, 396) + '\u000f ...'
        : outputFull;

    return output
        .replace(/\s+/g, ' ')
        .replace(new RegExp('\u001b\\[39m', 'g'), '\u000f')// reset
        .replace(new RegExp('\u001b\\[31m', 'g'), '\u000313') // null
        .replace(new RegExp('\u001b\\[(33|34)m', 'g'), '\u000307') // num / bool
        .replace(new RegExp('\u001b\\[32m', 'g'), '\u000303')// str
        .replace(new RegExp('\u001b\\[90m', 'g'), '\u000314')// str?
        .replace(new RegExp('\u001b\\[36m', 'g'), '\u000310');// func
}

module.exports = {
    evaluate,
    objectDebug,
};
