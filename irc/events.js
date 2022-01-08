const createVM = require('./evaluate/vm');
const ivm = require('isolated-vm');
const { getAllCommands } = require('./../database/commands');

function createEventManager(node) {

    // TODO hook into set / setConfig in commandDB
    //  just get access to parent and iterate over events from there
    //  parent.emit();
    //  just update the event script
    // have an API for sending data to the bot and shit / webhooks
    // TODO: onPrint / prevent Default
    // priority: expose event queue
    // node.getPrintConfig

    const ref = {};

    async function loadEvents(vm) {
        const scripts = ['new ' + String(function () {
            IRC.eventQueue = {};
            IRC.listen = (name, callback, config) => {
                if (!(name in IRC.eventQueue)) {
                    IRC.eventQueue[name] = [];
                }
                IRC.eventQueue[name].push([callback, config]);
            };
            IRC.runEvents = (name, eventData) => {
                if (name in IRC.eventQueue) {
                    IRC.eventQueue[name].forEach(([callback, config]) => {
                        if (!config.filter || config.filter(eventData)) {
                            callback(eventData);
                        }
                    });
                }
                delete global._event;
            };
        })];
        getAllCommands()
            .forEach(cmd => {
                if (cmd.event) {
                    scripts.push(`(async()=>{\n${cmd.command}\n})();`);
                }
            });

        await vm.context.eval(scripts.join(''));
    }

    createVM({ node, maxTimeout: 0 })
        .then(vm => {
            ref.vm = vm;
            return ref.vm.isolate.compileScript('IRC.runEvents();');
        })
        .then(script => {
            ref.runEvents = script;
            // run event script, collect listeners to emit into
            return loadEvents(ref.vm);
        })
        .catch(console.error);

    function emit(name, eventData) {
        // message channel server
        // channel server
        // tick|message|print|command|eval|join|part|nick|webhook ? rate nick
        // eventdata must have target
        // make preventable
        if (ref.vm) {
            ref.vm.context.global
                .set('_event', new ivm.ExternalCopy({name, eventData}).copyInto())
                // .then(() => setConfig)
                .then(() => ref.runEvents.run(ref.vm.context))
                .catch(console.error);
        }
    }

    node.events = {
        emit,
        // reload,
        dispose: () => ref.vm.dispose(),
    };
}

module.exports = { createEventManager };
