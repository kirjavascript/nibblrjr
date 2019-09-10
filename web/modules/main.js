import './styles/main.scss';

import React, { Component } from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';

import { env } from './store/index';
import { Commands } from './commands';
import { Auth } from './auth';

@observer
export class Main extends Component {

    render() {
        return !env.connected
            ? <span>Connecting...</span>
            : (
                <main>
                    <nav className="flex">
                        <div className="w-50">
                            <h1>nibblr</h1>
                        </div>
                        <div className="w-50 tr">
                            <Auth />
                        </div>
                    </nav>
                    <Commands />
                    <img
                        className="absolute right-0 bottom-0 nibblr"
                        src="/nibblr.gif"
                    />
                </main>
            );
    }
}

render(<Main/>, document.body.appendChild(document.createElement('div')));
