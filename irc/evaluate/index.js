// const util = require('util');
// util.inspect.styles.null = 'red';
// const { acquire } = require('./context/acquire');
// const { createRequireModules } = require('./context/require');
const ivm = require('isolated-vm');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const timeout = 10000;

// grab scripts to inject into the isolate
const scripts = fs.readdirSync(path.join(__dirname, 'scripts'))
    .map(filename => {
        return [
            path.parse(filename).name,
            fs.readFileSync(path.join(__dirname, 'scripts', filename), 'utf8'),
        ];
    });

async function evaluate({
    input,
    msgData,
    node,
    canBroadcast = false,
    printOutput = true,
    // context,
    // wrapAsync,
    // isREPL,
}) {

    try {
        // pass depth as a command param
        // if no print output, wrap async

        // context.acquire = acquire;
        // if (isREPL) {
        //     context.injectRequire = await createRequireModules(input);
        // }

        const channels = Object.entries(_.cloneDeep(node.client.chans))
            .reduce((acc, [key, value]) => {
                delete value.users;
                acc[key.toLowerCase()] = value;
                return acc;
            }, {});

        const config = {
            hasColors: node.get('colors', true),
            canBroadcast,
            lineLimit: node.getLineLimit(msgData.to),
            IRC: {
                trigger: node.get('trigger', '!'),
                message: msgData,
                nick: node.client.nick,
                channels,
                webAddress: _.get(node, 'parent.web.url', '[unspecified]'),
            },
        };

        const isolate = new ivm.Isolate({ memoryLimit: 128 });
        const context = await isolate.createContext();
        const jail = context.global;

        jail.setSync('global', jail.derefInto());
        jail.setSync('_ivm', ivm);
        jail.setSync('_sendRaw', new ivm.Reference(node.sendRaw));

        jail.setSync('input', input);
        jail.setSync('config', new ivm.ExternalCopy(config).copyInto());

        await (await isolate.compileScript(`
            global.scripts = {};
            ${scripts.map(([name, script]) => `
                (function() {
                    const module = {};
                    ${script};
                    global.scripts[${JSON.stringify(name)}] = module.exports;
                })();
            `).join('')}
         `)).run(context);

        const bootstrap = await isolate.compileScript('new '+ function() {
            const ivm = _ivm;
            delete _ivm;

            const colors = scripts.colors.getColorFuncs(config.IRC.trigger);

            // attach print/action/notice

            const sendRaw = _sendRaw;
            delete _sendRaw;

            Object.assign(global, scripts.print.createSend({
                hasColors: config.hasColors,
                canBroadcast: config.canBroadcast,
                lineLimit: config.lineLimit,
                message: config.IRC.message,
                colors,
                inspect: scripts.inspect,
                sendRaw: function(...args) {
                    // TODO: limit length of strings going to print
                    return sendRaw.applySync(
                        undefined,
                        args.map(arg => new ivm.ExternalCopy(arg).copyInto())
                    );
                },
            }));

            // create IRC object

            global.IRC = {
                ...config.IRC,
                colors,
                inspect: scripts.inspect,
                breakHighlight: (s) => `${s[0]}\uFEFF${s.slice(1)}`,
            };

            // cleanup env

            delete config;
            delete scripts;
        });
        await bootstrap.run(context);

        // dispose stuff after timeout
        setTimeout(() => {
            isolate.dispose();
            context.release();
        }, timeout + 1000);

        // run script

        const code = await isolate.compileScript('new '+function() {
            try {
                print.raw(IRC.inspect((0, eval(input)), {depth: 0}))
            } catch (e) {
                print.error(e);
            }
        });
        code.run(context, {timeout});



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
