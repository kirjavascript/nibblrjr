import React, { Component } from 'react';
import { render } from 'react-dom';
import { initSocket } from './socket';

import { Commands } from './commands';

export class Root extends Component {

    state = { tab: 'commands', ws: void 0 };

    componentDidMount() {
        initSocket((ws) => {
            this.setState({ws});
        });
    }

    render() {
        return <div>
            <main>
                {!this.state.ws ? 'loading...' : <Commands ws={this.state.ws}/>}
            </main>
        </div>;
    }
}

render(<Root/>, document.body.appendChild(document.createElement('div')));
