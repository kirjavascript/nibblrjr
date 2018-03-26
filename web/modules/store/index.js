import { observable, action } from 'mobx';
import { stringify, parse } from 'zipson';

class Environment {

    constructor() {
        // do socket stuff
        this.ws = new WebSocket('ws://' + location.host);

        this.ws.sendObj = (_type, obj = {}) => {
            this.ws.send(stringify({ ...obj, _type }));
        };

        this.ws.addEventListener('message', (e) => {
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

        this.ws.addEventListener('open', this.onConnected);
        this.ws.addEventListener('close', () => location.reload());
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

export const env = new Environment();
