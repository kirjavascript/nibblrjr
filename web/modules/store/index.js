import { observable } from 'mobx';
import { stringify, parse } from 'zipson';
// import { dispatch } from 'd3-dispatch';

class Environment {

    constructor() {
        // do socket stuff
        this.ws = new WebSocket('ws://' + location.host);

        ws.sendObj = (_type, obj = {}) => {
            ws.send(stringify({ ...obj, _type }));
        };

        ws.addEventListener('message', (e) => {
            try {
                const { _type, ...obj } = parse(e.data);
                if (_type == 'RELOAD') {
                    location.reload();
                }
                else {
                    this.onMessage(_type, obj);
                }
            }
            catch (e) {
                console.error(e);
            }
        });

        ws.addEventListener('open', this.onConnected);

        ws.addEventListener('close', location.reload);
    }

    @observable connected = false;
    @observable admin = false;
    @observable list = [];

    @action onConnected = () => {
        this.connected = true;
    };

    @action onMessage = (type, obj) => {
        const types = ({
            'COMMANDS': () => {
                if (obj.list) {
                    this.list.replace(obj.list);
                }
            },
        });
        types[type] && types[type]();
    };

    @action getList = () => {
        this.ws.sendObj('COMMANDS', {getList: true});
    };

}

const env = new Environment();
export env;
