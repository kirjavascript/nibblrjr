import './styles/root.scss';

import React, { Component } from 'react';
import { render } from 'react-dom';

import { initSocket } from './socket';
import { Commands } from './commands';

export class Root extends Component {

    state = {
        ws: void 0,
        admin: false,
    };

    componentDidMount() {
        initSocket((ws) => {
            this.setState({ws});
        });
    }

    render() {
        return <div>
            {do {
                if (!this.state.ws) {
                    <span>loading...</span>
                }
                else {
                    <main>
                        <Commands {...this.state}/>
                    </main>
                }
            }}
        </div>
    }
}

render(<Root/>, document.body.appendChild(document.createElement('div')));
