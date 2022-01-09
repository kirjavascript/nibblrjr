const createVM = require('./evaluate/vm');
const { getAllCommands } = require('./../database/commands');

function createEventManager(node) {
    const ref = {};

    async function loadEvents(vm) {
        const scripts = ['new ' + String(function () {
            IRC.eventQueue = {};
            IRC.listen = (name, callback, config = {}) => {
                if (!(name in IRC.eventQueue)) {
                    IRC.eventQueue[name] = [];
                }
                IRC.eventQueue[name].push([callback, config]);
            };
            IRC.runEvents = () => {
                const [ name, eventData ] = IRC._event;
                if (name in IRC.eventQueue) {
                    IRC.eventQueue[name].forEach(([callback, config]) => {
                        if (!config.filter || config.filter(eventData)) {
                            if (config.showError) {
                                try {
                                    callback(eventData);
                                } catch(e) {
                                    print.error(e);
                                }
                            } else {
                                callback(eventData);
                            }
                        }
                    });
                }
            };
        })];
        getAllCommands()
            .forEach(cmd => {
                if (cmd.event) {
                    scripts.push(`;(async()=>{\n${cmd.command}\n})()`);
                }
            });

        await vm.context.eval(scripts.join(''));
        console.log(node.config.address + ' events loaded')
    }

    async function loadVM() {
        if (ref.vm) ref.vm.dispose();
        ref.vm = await createVM({ node, maxTimeout: 0 })
        await loadEvents(ref.vm);
        ref.runEvents = await ref.vm.isolate.compileScript('IRC.runEvents();');
    }

    // called in parent
    async function reloadEvents() {
        await loadEvents(ref.vm);
    }

    function emit(name, eventData) {
        // eventData: { target, server, message? }
        if (ref.vm) {
            ref.vm
                .setConfig({
                    print: {
                        lineLimit: node.getLineLimit(eventData.target),
                        target: eventData.target,
                    },
                    IRC: {
                        message: eventData.message,
                        _event: [name, eventData],
                    },
                })
                .then(() => ref.runEvents.run(ref.vm.context))
                .catch(error => {
                    /* silent ignore, errors can be viewed with showError */
                    if (node.parent.dev) console.error(error);
                });
        }
    }

    loadVM().catch(console.error);

    node.events = {
        emit,
        reload: loadVM,
        reloadEvents,
        dispose: () => ref.vm.dispose(),
    };
}

module.exports = { createEventManager };
