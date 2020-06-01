// SQL / config
// setGLobals

async function isolate({ }) {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const dispose = () => {
        if (!isolate.isDisposed) {
            isolate.dispose();
            context.release();
        }
    };

    // node
    // config

    // print


    return {
        dispose
    };
}


// isolate

// evaluate

// message
// command
// script / printResult
// print

// eventManager
// print
