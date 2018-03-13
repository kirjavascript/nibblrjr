import React, { Component } from 'react';
import ws from '../socket';

export class Commands extends Component {

    state = { list: [] };

    componentDidMount() {
        // ws.sendObj('COMMANDS', {type: 'list'});
    }

    render() {
        return <div>
            {JSON.stringify(this.state.list)}
        </div>;
    }

}
