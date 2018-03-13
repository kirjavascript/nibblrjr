import { stringify, parse } from 'zipson';

const ws = new WebSocket('ws://' + location.host);

// save admin to localstorage

ws.sendObj = (_type, obj = {}) => {
    ws.send(stringify({ ...obj, _type }));
};

ws.addEventListener('message', (e) => {
    try {
        const { _type, ...obj } = parse(e.data);
        if (_type == 'RELOAD') {
            location.reload();
        }
        console.log(_type, obj);
    }
    catch (e) {
        console.error(e);
    }
});

export default ws;
