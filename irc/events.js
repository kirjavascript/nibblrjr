const ivm = require('isolated-vm');
const createVM = require('./evaluate/vm');
const { getAllCommands } = require('./../database/commands');

function createEventManager(node) {
    async function loadEvents(vm) {
        await vm.context.eval(
            'new ' +
                String(function () {
                    IRC.eventQueue = {};
                    IRC.listen = (name, callback, config = {}) => {
                        if (!(name in IRC.eventQueue)) {
                            IRC.eventQueue[name] = [];
                        }
                        IRC.eventQueue[name].push([callback, config]);
                    };
                    IRC.runEvents = () => {
                        const [name, eventData] = IRC._event;
                        if (name in IRC.eventQueue) {
                            IRC.eventQueue[name].forEach(
                                ([callback, config]) => {
                                    if (
                                        !config.filter ||
                                        config.filter(eventData)
                                    ) {
                                        if (config.showError) {
                                            try {
                                                callback(eventData);
                                            } catch (e) {
                                                print.error(e);
                                            }
                                        } else {
                                            callback(eventData);
                                        }
                                    }
                                },
                            );
                        }
                    };
                }),
        );
        for (cmd of getAllCommands()) {
            if (cmd.event) {
                try {
                    await vm.context.eval(`;(async()=>{\n${cmd.command}\n})()`);
                } catch (e) {
                    // note which script has the error in
                    e.name += ` (${cmd.name})`;
                    throw e;
                }
            }
        }
        console.log(node.config.address + ' events loaded');
    }

    const ref = {};

    async function loadVM() {
        // setup VM
        ref.vm = await createVM({ node, maxTimeout: 0 });

        // provide access to config
        await ref.vm.context.global.set(
            '_queryConfig',
            new ivm.Callback((target, key, _default) => {
                return node.getTargetCfg(target, key, _default);
            }),
        );
        await ref.vm.context.eval(
            'new ' +
                String(function () {
                    const { _queryConfig } = global;
                    IRC.queryConfig = (key, _default) => {
                        // normal users cant access this, but filter to prevent leaks anyway
                        if (['password', 'secret'].includes(key))
                            throw new Error('insert coin');
                        const conf = _queryConfig(
                            IRC._event[1].target, // [_, eventData.target]
                            key,
                            _default,
                        );
                        if (typeof conf === 'object' && conf !== null)
                            throw new Error('high voltage');
                        return conf;
                    };
                    delete global._queryConfig;
                })
        );

        // load / run events
        await loadEvents(ref.vm);
        ref.runEvents = await ref.vm.isolate.compileScript('IRC.runEvents();');
    }

    // called in parent
    async function reloadScripts() {
        await loadEvents(ref.vm);
    }

    function emit(name, eventData) {
        // eventData: { target, server, message? }
        if (
            ref.vm &&
            ref.runEvents &&
            !node.getTargetCfg(eventData.target, 'ignoreEvents', false)
        ) {
            ref.vm
                .setConfig({
                    print: {
                        target: eventData.target,
                    },
                    IRC: {
                        message: eventData.message,
                        _event: [name, eventData],
                    },
                })
                // .then(() => node.parent.dev && console.time(name))
                .then(() => ref.runEvents.run(ref.vm.context))
                // .then(() => node.parent.dev && console.timeEnd(name))
                .catch(console.error);
        }
    }

    loadVM().catch(console.error);

    node.events = {
        emit,
        reloadScripts,
        dispose: () => ref.vm.dispose(),
    };
}

module.exports = { createEventManager };
