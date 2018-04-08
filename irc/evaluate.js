const util = require('util');
const {VM} = require('vm2');

util.inspect.styles.null = 'red';

process.on('uncaughtException', console.error);

function evaluate({ input, context, colors = true }) {

    try {
        const evaluation = new VM({
            timeout: 3000,
            sandbox: context,
        }).run(`
            ['VMError', 'Buffer'].forEach(key => {
                Object.defineProperty(this, key, { enumerable: false });
            });
            delete global.console;

            ${parseImports(input)}
        `);

        return { output: objectDebug(evaluation, colors) };
    } catch(e) {
        return {
            output: `${(colors?'\u000304':'')}${e.name||'Error'}:\u000f ${e.message}`,
            error: true,
        };
    }
}

function parseImports(input) {
    return `
        (function () {
            ${parseImports.toString()};
            if (!global.__loadModule) {
                Object.defineProperty(global, '__loadModule', {
                    value: (str) => {
                        new Function((parseImports(str)))();
                    },
                    enumerable: false,
                });
            }
        })();
    ` + input.replace(/(import\s+'(.*?)'|import\s+"(.*?)")/g, (a, b, lib) => {
        // 'module' parsing
        const libClean = lib.replace(/(\s+|`)/g,'');
        return `
            (function () {
                const obj = IRC.commandFns.get(\`${libClean}\`);
                if (obj) {
                    __loadModule(obj.command);
                }
                else {
                    throw new Error('import error: ${libClean} not found');
                }
            })();
        `;
    })
}

function objectDebug(evaluation, colors = true) {
    const output = util.inspect(evaluation, { depth: 1, colors })
        .replace(/\s+/g, ' ')
        .replace(new RegExp('\u001b\\[39m', 'g'), '\u000f')// reset
        .replace(new RegExp('\u001b\\[31m', 'g'), '\u000313') // null
        .replace(new RegExp('\u001b\\[33m', 'g'), '\u000307') // num / bool
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
