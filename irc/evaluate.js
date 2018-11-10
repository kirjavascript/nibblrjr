const util = require('util');
const { VM } = require('vm2');
const { acquireFactory } = require('./context/acquire');

util.inspect.styles.null = 'red';

process.on('uncaughtException', console.error);

function evaluate({ input, context, printOutput, wrapAsync }) {

    try {
        context.acquireFactory = acquireFactory;

        const code = wrapAsync ? `(async () => {
            try {
                ${input}
            } catch(e) {
                print(\`{r}\${e.name||'Error'}:{/} \${e.message}\`)
            }
        })();` : input;

        const evaluation = new VM({
            timeout: 3000,
            sandbox: context,
        }).run(`
            delete global.console;
            global.module = {};
            ['VMError', 'Buffer', 'module', 'acquireFactory'].forEach(key => {
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
                global.acquire = acquireFactory(source => {
                    return new Function(\`
                        \${source}
                        return __acquire__;
                    \`)();
                });
            })();

            ${code}
        `);

        if (printOutput) {
            context.print.raw(objectDebug(evaluation));
        }
    } catch(e) {
        context.print(`{r}${e.name||'Error'}:{/} ${e.message}`)
    }
}

function objectDebug(evaluation, colors = true) {
    const output = util.inspect(evaluation, { depth: 1, colors })
        .replace(/\s+/g, ' ')
        .replace(new RegExp('\u001b\\[39m', 'g'), '\u000f')// reset
        .replace(new RegExp('\u001b\\[31m', 'g'), '\u000313') // null
        .replace(new RegExp('\u001b\\[(33|34)m', 'g'), '\u000307') // num / bool
        .replace(new RegExp('\u001b\\[32m', 'g'), '\u000303')// str
        .replace(new RegExp('\u001b\\[90m', 'g'), '\u000314')// str?
        .replace(new RegExp('\u001b\\[36m', 'g'), '\u000310');// func

    if (output.length > 396) {
        return output.slice(0, 396) + '\u000f ...';
    }
    else {
        return output;
    }
}

module.exports = {
    evaluate,
    objectDebug,
};
