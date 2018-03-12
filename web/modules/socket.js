const ws = new WebSocket('ws://' + location.host);

ws.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if (data.cmd == 'RELOAD') {
        location.reload();
    }

    console.log(data);
});

setTimeout(() => {
ws.send('{}');
}, 3000);

export default ws;
