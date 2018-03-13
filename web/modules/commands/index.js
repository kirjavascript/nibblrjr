import React, { Component } from 'react';

import { Editor } from './editor';

export class Commands extends Component {

    state = { list: [], search: '' };

    componentDidMount() {
        this.props.ws.sendObj('COMMANDS', {list: true});
        this.props.ws.msg.on('COMMANDS', (obj) => {
            if (obj.list) {
                this.setState({list: obj.list});
            }
        });
    }

    handleSearch = (e) => {
        this.setState({search: e.target.value});
    };

    componentWillUnmount() {
        this.props.ws.msg.on('COMMANDS', null);
    }

    render() {
        const { search, list } = this.state;
        return <div>
            <Editor/>
            <input
                type="text"
                        placeholder="Search..."
                        onChange={this.handleSearch}
                        value={search}
                    />
                <hr />
            {list
                .filter(d => !search || d.name.includes(search))
                .map((command) => {
                return <div
                    key={command.name}
                >
                    {command.name}
                </div>;
            })}
        </div>
    }

}
