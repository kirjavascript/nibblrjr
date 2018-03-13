import React, { Component } from 'react';
import ws from '../socket';

export class Commands extends Component {

    state = { list: [] };

    componentDidMount() {
        this.props.ws.msg.on('COMMANDS', (obj) => {
            if (obj.list) {
                this.setState({list: obj.list});
            }
        });
        this.props.ws.sendObj('COMMANDS', {list: true});
    }

    componentWillUnmount() {
        this.props.ws.msg.on('COMMANDS', null);
    }

    render() {
        return <div>
            {JSON.stringify(this.state.list)}
        </div>;
    }

}
