const ws = new WebSocket('ws://' + location.host);

// save admin to localstorage

// { event: COMMAND, cmd: LIST }

ws.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if (data.cmd == 'RELOAD') {
        location.reload();
    }

    console.log(data);
});

export default ws;
