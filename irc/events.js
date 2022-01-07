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

    let vm;

    createVM({ node, maxTimeout: undefined })
        .then(result => {
            vm = result;
        })
        .catch(console.error);

    function emit(name, data) {
        if (vm) {

        }
        // make preventable
    }

// {
//    name: 'jsdom-patch',
//    setup(build) {
//     build.onLoad({ filter: /jsdom\/living\/helpers\/agent-factory\.js$/ }, async (args) => {
//         return { contents: '', loader: 'js' };
//      });

//     build.onLoad({ filter: /jsdom\/living\/helpers\/http-request\.js$/ }, async (args) => {
//         return { contents: '', loader: 'js' };
//      });


//     build.onLoad({ filter: /jsdom\/living\/xhr\/XMLHttpRequest-impl\.js$/ }, async (args) => {
//         return { contents: '', loader: 'js' };
//      });

//     build.onLoad({ filter: /ws\/index.js$/ }, async (args) => {
//         return { contents: '', loader: 'js' };
//      });
//    },
//  },


    const events = getAllCommands().filter(cmd => cmd.event);

    // compilescript


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
