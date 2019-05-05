// const util = require('util');
// util.inspect.styles.null = 'red';
// const { acquire } = require('./context/acquire');
// const { createRequireModules } = require('./context/require');
const ivm = require('isolated-vm');
const timeout = 10000;
const fs = require('fs');

const inspectScript = fs.readFileSync(__dirname + '/oinspect.js', 'utf8');

// script loader that attach to global.scripts
// rename objectDebug to inspect

async function evaluate({
    input,
    msgData,
    mod,
    node,
    // context,
    // printOutput,
    // wrapAsync,
    // isREPL,
}) {

    try {
        // context.acquire = acquire;
        // if (isREPL) {
        //     context.injectRequire = await createRequireModules(input);
        // }

        const isolate = new ivm.Isolate({ memoryLimit: 128 });
        const context = await isolate.createContext();
        const jail = context.global;

        jail.setSync('global', jail.derefInto());
        jail.setSync('_ivm', ivm);
        jail.setSync('_rawPrint', new ivm.Reference((type, target, text) => {
            node.client[type](target, text);
        }));
        jail.setSync('msgData', new ivm.ExternalCopy(msgData).copyInto());
        jail.setSync('input', input);

        await (await isolate.compileScript(`
            (function() {
                ${inspectScript}
                global.inspect = inspect_;
            })();
        `)).run(context);

        const bootstrap = await isolate.compileScript('new '+ function() {
            const ivm = _ivm;
            global.ivm = _ivm
            delete _ivm;
            // const log = _log;
            // delete _log;
            // global.log = function(...args) {
            //     log.applyIgnored(undefined, args.map(arg => new ivm.ExternalCopy(arg).copyInto()));
            // };
            // const rawPrint = _rawPrint;
            // global.rawPrint = function(...args) {
            //     rawPrint.applyIgnored(undefined, args.map(arg => new ivm.ExternalCopy(arg).copyInto()));
            // };

            // remap functions to copied versions
            Object.keys(global)
                .forEach(key => {
                    if (key.startsWith('_')) {
                        const func = global[key];
                        global[key.slice(1)] = function(...args) {
                            // limit length of strings going to print
                            return func.applySync(
                                undefined,
                                args.map(arg => new ivm.ExternalCopy(arg).copyInto())
                            );
                        };
                        delete global[key];
                    }
                });
            global.print = (str) => {
                rawPrint('say', msgData.target, str);
            }
            // global.print('.'.repeat(1e9));

            // try / catch

            // global.print = function(...args) {
            //     _print.applyIgnored(undefined, args.map(arg => new ivm.ExternalCopy(arg).copyInto()));
            // };

            print(inspect(eval(input)))

        });
        await bootstrap.run(context);

        // we need to return undefined so that no attempt is made to copy it
        // const code = await isolate.compileScript(`${input}; undefined`);

        // dispose stuff
        setTimeout(() => {
            isolate.dispose();
            context.release();
        }, timeout + 1000);

        // const evaluation = await code.run(context, {timeout});
        // await code.run(context, {timeout});
        // console.log(evaluation)


        // TODO:
        // Dos
        // eval result if printOutput
        // remove limit function

        // ---

        // const code = wrapAsync ? `(async () => {
        //     try {
        //         ${input}
        //     } catch (e) {
        //         print.error(e);
        //     }
        // })();` : input;

        // const evaluation = new VM({
        //     timeout: 3000,
        //     sandbox: context,
        // }).run(`
        //     delete global.console;
        //     global.module = {};
        //     [
        //         'VMError',
        //         'Buffer',
        //         'module',
        //         'setTimeout',
        //         'clearTimeout',
        //         'setInterval',
        //         'clearInterval',
        //     ].forEach(key => {
        //         Object.defineProperty(this, key, { enumerable: false });
        //     });
        //     (() => {
        //         IRC.require = (str) => {
        //             const obj = IRC.commandFns.get(str);
        //             if (obj) {
        //                 const module = new Function(\`
        //                     \${obj.command}
        //                     return this.module;
        //                 \`)();
        //                 return module.exports;
        //             }
        //             else {
        //                 const error = new Error(str + ' not found');
        //                 error.name = 'RequireError';
        //                 throw error;
        //             }
        //         };
        //         if (global.injectRequire) {
        //             global.require = injectRequire();
        //             delete global.injectRequire;
        //         }
        //     })();

        //     ${code}
        // `);

        // if (printOutput) {
        //     context.print.raw(objectDebug(evaluation));
        // }
    } catch (e) {
        // context.print.error(e);
        console.log('TODO', e);
    }

}

// function objectDebug(
//     evaluation,
//     { depth = 0, colors = true, truncate = 396 } = {},
// ) {
//     const outputFull = util.inspect(evaluation, { depth, colors });
//     const output = outputFull.length > truncate
//         ? outputFull.slice(0, truncate) + '\u000f ...'
//         : outputFull;

//     return output
//         .replace(/\s+/g, ' ')
//         .replace(new RegExp('\u001b\\[39m', 'g'), '\u000f')// reset
//         .replace(new RegExp('\u001b\\[31m', 'g'), '\u000313') // null
//         .replace(new RegExp('\u001b\\[(33|34)m', 'g'), '\u000307') // num / bool
//         .replace(new RegExp('\u001b\\[32m', 'g'), '\u000303')// str
//         .replace(new RegExp('\u001b\\[90m', 'g'), '\u000314')// str?
//         .replace(new RegExp('\u001b\\[36m', 'g'), '\u000310');// func
// }

module.exports = {
    evaluate,
    // objectDebug,
};
