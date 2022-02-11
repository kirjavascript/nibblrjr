const ivm = require('isolated-vm');
const createVM = require('./evaluate/vm');
const createAsyncFetch = require('./evaluate/async-fetch');

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
                        // remove print for async callbacks
                        delete global.print;
                        delete global.action;
                        delete global.notice;
                        delete global.log;
                        // TODO: undo setconfig
                    };
                }),
        );
        for (cmd of node.parent.database.commands.events()) {
            try {
                await vm.context.eval(`;(async()=>{\n${cmd.command}\n})()`);
            } catch (e) {
                // note which script has the error in
                e.name += ` (${cmd.name})`;
                throw e;
            }
        }
        console.log(node.config.address + ' events loaded');
    }

    const ref = {};

    async function loadVM() {
        // setup VM
        ref.vm = await createVM({ node, maxTimeout: 0 });

        createAsyncFetch(ref.vm);

        // provide access to config
        await ref.vm.context.global.set(
            '_queryConfig',
            new ivm.Callback((target, key, _default) => {
                return node.getTargetCfg(target, key, _default);
            }),
        );
        await ref.vm.context.global.set(
            '_setNamespace',
            new ivm.Callback(ref.vm.setNamespace),
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
                    IRC.setNamespace = global._setNamespace;
                    delete global._setNamespace;
                })
        );

        // load / run events
        await loadEvents(ref.vm);
        ref.runEvents = await ref.vm.isolate.compileScript('IRC.runEvents();');
    }

    // called in parent
    async function reloadEvents() {
        await loadEvents(ref.vm);
    }

    let runningEvents = false;
    const queue = [];

    function emit(name, eventData) {
        // eventData: { target, server, message? }
        if (
            ref.vm &&
            ref.runEvents &&
            !ref.vm.isolate.isDisposed &&
            node.getTargetCfg(eventData.target, 'enableEvents', true)
        ) {

            function run() {
                runningEvents = true;
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
                    .then(() => ref.runEvents.run(ref.vm.context))
                    .catch(console.error)
                    .finally(() => {
                        runningEvents = false;
                        if (queue.length) queue.pop()();
                    });
            }

            if (runningEvents) {
                queue.push(run)
            } else {
                run();
            }
        }
    }

    function broadcast(name, eventData) {
        // run an event in every channel
        Object.keys(node.client.chans).forEach(channel => {
            const defaultData = {
                target: channel.toLowerCase(),
                server: node.config.address,
            };
            emit(name, eventData ? Object.assign({}, eventData, defaultData) : defaultData);
        });
    }

    loadVM().catch(console.error);

    node.events = {
        emit,
        broadcast,
        reloadEvents,
        dispose: () => ref.vm.dispose(),
    };
}

module.exports = { createEventManager };
