import './styles/root.scss';

import React, { Component } from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';

import { env } from './store/index';
import { Commands } from './commands';
import { Auth } from './auth';

@observer
export class Root extends Component {

    render() {
        return do {
            if (!env.connected) {
                <span>Connecting...</span>
            }
            else {
                <main>
                    <nav className="flex">
                        <div className="w-50">
                            <h1>nibblrjr</h1>
                        </div>
                        <div className="w-50 tr">
                            <Auth />
                        </div>
                    </nav>
                    <Commands />
                </main>
            }
        }
    }
}

render(<Root/>, document.body.appendChild(document.createElement('div')));
