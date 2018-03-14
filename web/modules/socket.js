import { stringify, parse } from 'zipson';
import { dispatch } from 'd3-dispatch';

const types = ['COMMANDS', 'AUTH'];

function initSocket(callback) {
    const ws = new WebSocket('ws://' + location.host);

    // save admin to localstorage

    ws.msg = dispatch(...types);

    ws.sendObj = (_type, obj = {}) => {
        ws.send(stringify({ ...obj, _type }));
    };

    ws.addEventListener('message', (e) => {
        try {
            const { _type, ...obj } = parse(e.data);
            if (_type == 'RELOAD') {
                location.reload();
            }
            else if (types.includes(_type)) {
                ws.msg.call(_type, this, obj);
            }
        }
        catch (e) {
            console.error(e);
        }
    });

    ws.addEventListener('open', (open) => {
        callback(ws);
    });
}

export { initSocket };
