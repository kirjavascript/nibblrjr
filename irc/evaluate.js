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
            delete global.console;
            global.module = {};
            ['VMError', 'Buffer', 'module'].forEach(key => {
                Object.defineProperty(this, key, { enumerable: false });
            });
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

            ${input}
        `);

        return { output: objectDebug(evaluation, colors) };
    } catch(e) {
        return {
            output: `${(colors?'\u000304':'')}${e.name||'Error'}:\u000f ${e.message}`,
            error: true,
        };
    }
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
[{"number":14,"value":"A","suit":"hearts","render":"{r,dgr} ♥ A {/}"},{"number":4,"value":"4","suit":"spades","render":"{bl,dgr} ♠ 4 {/}"},{"number":14,"value":"A","suit":"spades","render":"{bl,dgr} ♠ A {/}"},{"number":8,"value":"8","suit":"spades","render":"{bl,dgr} ♠ 8 {/}"},{"number":10,"value":"⒑","suit":"hearts","render":"{r,dgr} ♥ ⒑ {/}"},{"number":9,"value":"9","suit":"spades","render":"{bl,dgr} ♠ 9 {/}"},{"number":10,"value":"⒑","suit":"clubs","render":"{bl,dgr} ♣ ⒑ {/}"},{"number":13,"value":"K","suit":"spades","render":"{bl,dgr} ♠ K {/}"},{"number":5,"value":"5","suit":"hearts","render":"{r,dgr} ♥ 5 {/}"},{"number":4,"value":"4","suit":"hearts","render":"{r,dgr} ♥ 4 {/}"},{"number":7,"value":"7","suit":"diamonds","render":"{r,dgr} ♦ 7 {/}"},{"number":2,"value":"2","suit":"clubs","render":"{bl,dgr} ♣ 2 {/}"},{"number":2,"value":"2","suit":"spades","render":"{bl,dgr} ♠ 2 {/}"},{"number":3,"value":"3","suit":"diamonds","render":"{r,dgr} ♦ 3 {/}"},{"number":14,"value":"A","suit":"diamonds","render":"{r,dgr} ♦ A {/}"},{"number":9,"value":"9","suit":"clubs","render":"{bl,dgr} ♣ 9 {/}"},{"number":2,"value":"2","suit":"diamonds","render":"{r,dgr} ♦ 2 {/}"},{"number":2,"value":"2","suit":"diamonds","render":"{r,dgr} ♦ 2 {/}"},{"number":5,"value":"5","suit":"spades","render":"{bl,dgr} ♠ 5 {/}"},{"number":6,"value":"6","suit":"diamonds","render":"{r,dgr} ♦ 6 {/}"},{"number":6,"value":"6","suit":"clubs","render":"{bl,dgr} ♣ 6 {/}"},{"number":10,"value":"⒑","suit":"clubs","render":"{bl,dgr} ♣ ⒑ {/}"},{"number":8,"value":"8","suit":"clubs","render":"{bl,dgr} ♣ 8 {/}"},{"number":12,"value":"Q","suit":"spades","render":"{bl,dgr} ♠ Q {/}"},{"number":8,"value":"8","suit":"diamonds","render":"{r,dgr} ♦ 8 {/}"},{"number":7,"value":"7","suit":"clubs","render":"{bl,dgr} ♣ 7 {/}"},{"number":10,"value":"⒑","suit":"spades","render":"{bl,dgr} ♠ ⒑ {/}"},{"number":11,"value":"J","suit":"diamonds","render":"{r,dgr} ♦ J {/}"},{"number":6,"value":"6","suit":"spades","render":"{bl,dgr} ♠ 6 {/}"},{"number":4,"value":"4","suit":"diamonds","render":"{r,dgr} ♦ 4 {/}"},{"number":5,"value":"5","suit":"hearts","render":"{r,dgr} ♥ 5 {/}"},{"number":14,"value":"A","suit":"spades","render":"{bl,dgr} ♠ A {/}"},{"number":11,"value":"J","suit":"hearts","render":"{r,dgr} ♥ J {/}"},{"number":8,"value":"8","suit":"hearts","render":"{r,dgr} ♥ 8 {/}"},{"number":13,"value":"K","suit":"diamonds","render":"{r,dgr} ♦ K {/}"},{"number":7,"value":"7","suit":"hearts","render":"{r,dgr} ♥ 7 {/}"},{"number":4,"value":"4","suit":"diamonds","render":"{r,dgr} ♦ 4 {/}"},{"number":14,"value":"A","suit":"clubs","render":"{bl,dgr} ♣ A {/}"},{"number":7,"value":"7","suit":"clubs","render":"{bl,dgr} ♣ 7 {/}"},{"number":6,"value":"6","suit":"diamonds","render":"{r,dgr} ♦ 6 {/}"},{"number":4,"value":"4","suit":"clubs","render":"{bl,dgr} ♣ 4 {/}"},{"number":13,"value":"K","suit":"clubs","render":"{bl,dgr} ♣ K {/}"},{"number":13,"value":"K","suit":"spades","render":"{bl,dgr} ♠ K {/}"},{"number":12,"value":"Q","suit":"hearts","render":"{r,dgr} ♥ Q {/}"},{"number":6,"value":"6","suit":"spades","render":"{bl,dgr} ♠ 6 {/}"},{"number":5,"value":"5","suit":"diamonds","render":"{r,dgr} ♦ 5 {/}"},{"number":3,"value":"3","suit":"clubs","render":"{bl,dgr} ♣ 3 {/}"},{"number":9,"value":"9","suit":"hearts","render":"{r,dgr} ♥ 9 {/}"},{"number":3,"value":"3","suit":"hearts","render":"{r,dgr} ♥ 3 {/}"},{"number":6,"value":"6","suit":"hearts","render":"{r,dgr} ♥ 6 {/}"},{"number":4,"value":"4","suit":"clubs","render":"{bl,dgr} ♣ 4 {/}"},{"number":14,"value":"A","suit":"diamonds","render":"{r,dgr} ♦ A {/}"},{"number":9,"value":"9","suit":"hearts","render":"{r,dgr} ♥ 9 {/}"},{"number":2,"value":"2","suit":"clubs","render":"{bl,dgr} ♣ 2 {/}"},{"number":7,"value":"7","suit":"hearts","render":"{r,dgr} ♥ 7 {/}"},{"number":5,"value":"5","suit":"spades","render":"{bl,dgr} ♠ 5 {/}"},{"number":4,"value":"4","suit":"spades","render":"{bl,dgr} ♠ 4 {/}"},{"number":2,"value":"2","suit":"hearts","render":"{r,dgr} ♥ 2 {/}"},{"number":9,"value":"9","suit":"clubs","render":"{bl,dgr} ♣ 9 {/}"},{"number":11,"value":"J","suit":"spades","render":"{bl,dgr} ♠ J {/}"},{"number":9,"value":"9","suit":"spades","render":"{bl,dgr} ♠ 9 {/}"},{"number":3,"value":"3","suit":"spades","render":"{bl,dgr} ♠ 3 {/}"},{"number":10,"value":"⒑","suit":"diamonds","render":"{r,dgr} ♦ ⒑ {/}"},{"number":13,"value":"K","suit":"clubs","render":"{bl,dgr} ♣ K {/}"},{"number":12,"value":"Q","suit":"diamonds","render":"{r,dgr} ♦ Q {/}"},{"number":11,"value":"J","suit":"clubs","render":"{bl,dgr} ♣ J {/}"},{"number":13,"value":"K","suit":"hearts","render":"{r,dgr} ♥ K {/}"},{"number":3,"value":"3","suit":"hearts","render":"{r,dgr} ♥ 3 {/}"},{"number":13,"value":"K","suit":"diamonds","render":"{r,dgr} ♦ K {/}"},{"number":9,"value":"9","suit":"diamonds","render":"{r,dgr} ♦ 9 {/}"},{"number":5,"value":"5","suit":"clubs","render":"{bl,dgr} ♣ 5 {/}"},{"number":4,"value":"4","suit":"hearts","render":"{r,dgr} ♥ 4 {/}"},{"number":8,"value":"8","suit":"hearts","render":"{r,dgr} ♥ 8 {/}"},{"number":11,"value":"J","suit":"clubs","render":"{bl,dgr} ♣ J {/}"},{"number":7,"value":"7","suit":"diamonds","render":"{r,dgr} ♦ 7 {/}"},{"number":13,"value":"K","suit":"hearts","render":"{r,dgr} ♥ K {/}"},{"number":12,"value":"Q","suit":"diamonds","render":"{r,dgr} ♦ Q {/}"},{"number":12,"value":"Q","suit":"hearts","render":"{r,dgr} ♥ Q {/}"},{"number":11,"value":"J","suit":"diamonds","render":"{r,dgr} ♦ J {/}"},{"number":11,"value":"J","suit":"spades","render":"{bl,dgr} ♠ J {/}"},{"number":3,"value":"3","suit":"clubs","render":"{bl,dgr} ♣ 3 {/}"},{"number":6,"value":"6","suit":"clubs","render":"{bl,dgr} ♣ 6 {/}"},{"number":12,"value":"Q","suit":"spades","render":"{bl,dgr} ♠ Q {/}"},{"number":10,"value":"⒑","suit":"hearts","render":"{r,dgr} ♥ ⒑ {/}"},{"number":14,"value":"A","suit":"hearts","render":"{r,dgr} ♥ A {/}"},{"number":5,"value":"5","suit":"clubs","render":"{bl,dgr} ♣ 5 {/}"},{"number":8,"value":"8","suit":"diamonds","render":"{r,dgr} ♦ 8 {/}"},{"number":8,"value":"8","suit":"spades","render":"{bl,dgr} ♠ 8 {/}"},{"number":11,"value":"J","suit":"hearts","render":"{r,dgr} ♥ J {/}"},{"number":3,"value":"3","suit":"spades","render":"{bl,dgr} ♠ 3 {/}"},{"number":12,"value":"Q","suit":"clubs","render":"{bl,dgr} ♣ Q {/}"},{"number":5,"value":"5","suit":"diamonds","render":"{r,dgr} ♦ 5 {/}"},{"number":7,"value":"7","suit":"spades","render":"{bl,dgr} ♠ 7 {/}"},{"number":3,"value":"3","suit":"diamonds","render":"{r,dgr} ♦ 3 {/}"},{"number":2,"value":"2","suit":"spades","render":"{bl,dgr} ♠ 2 {/}"},{"number":8,"value":"8","suit":"clubs","render":"{bl,dgr} ♣ 8 {/}"},{"number":10,"value":"⒑","suit":"diamonds","render":"{r,dgr} ♦ ⒑ {/}"},{"number":12,"value":"Q","suit":"clubs","render":"{bl,dgr} ♣ Q {/}"}]
