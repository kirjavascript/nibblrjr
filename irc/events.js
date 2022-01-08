const createVM = require('./evaluate/vm');
const { getAllCommands } = require('./../database/commands');

function createEventManager(node) {

    // TODO: event script concatted and compiled into one
    // hook into set / setConfig in commandDB
    //  just update the event script
    // have an API for sending data to the bot and shit / webhooks
    // TODO: onPrint / prevent Default
    // priority: expose event queue

    // IRC.addListener('message', () => {}, {
    //     include: [],
    //     exclude: [],
    // })

    let vm, eventScript;

    async function loadEvents() {
        const scripts = ['new ' + String(function () {
            IRC.eventQueue = {};
            IRC.listen = (name, callback, config) => {
                if (!(name in IRC.eventQueue)) {
                    IRC.eventQueue[name] = [];
                }
                IRC.eventQueue[name].push([callback, config]);
            };
            IRC.runEvents = (name, eventData) => {
                IRC.eventQueue[name].forEach(([callback, config] => {
                    if (!config.filter || config.filter(eventData)) {
                        callback(eventData);
                    }
                }))
            };
        })];
        getAllCommands()
            .forEach(cmd => {
                if (cmd.event) {
                    scripts.push(`(async()=>{\n${cmd.command}\n})();`);
                }
            });
        return await (await vm.isolate.compileScript(scripts.join(''))).run(vm.context);
    }

    createVM({ node, maxTimeout: undefined })
        .then(result => {
            vm = result;
            return loadEvents();
        })
        .then(script => {
            eventScript = script;
            // run event script, collect listeners to emit into
        })
        .catch(console.error);

    function emit(name, eventData) {
        // message channel server
        // channel server
        // tick|message|print|command|eval|join|part|nick ? rate nick
        if (vm && eventScript) {
            // run event queue
        }
        // make preventable
    }



    // return {
        // dispose: vm.dispose
        // onEvent,
    // };

    node.events = {
        emit,
        // reload,
        dispose: () => vm.dispose(),
    };
}

module.exports = { createEventManager };
