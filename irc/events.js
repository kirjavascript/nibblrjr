const createVM = require('./evaluate/vm');
const { getAllCommands } = require('./../database/commands');

function createEventManager(node) {

    // TODO: event script concatted and compiled into one
    // hook into set / setConfig in commandDB
    //  just update the event script
    // have an API for sending data to the bot and shit / webhooks
    // TODO: onPrint / prevent Default

    let vm;

    createVM({ node, maxTimeout: undefined })
        .then(result => {
            vm = result;
        })
        .catch(console.error);

    function emit(name, data) {
        if (vm) {

        }
    }


    const events = getAllCommands().filter(cmd => cmd.event);
    console.log(events);


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
