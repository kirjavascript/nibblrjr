import React, { Component } from 'react';

import { Editor } from './editor';

export class Commands extends Component {

    state = {
        list: [],
        search: '',
        command: void 0,
    };

    componentDidMount() {
        this.props.ws.msg.on('COMMANDS', (obj) => {
            if (obj.list) {
                this.setState({list: obj.list});
            }
        });
        this.props.ws.sendObj('COMMANDS', {getList: true});
    }

    componentWillUnmount() {
        this.props.ws.msg.on('COMMANDS', null);
    }

    handleSearch = (e) => {
        this.setState({search: e.target.value});
    };

    render() {
        const { search, list, command } = this.state;
        const rx = new RegExp(search);
        const filteredList = list.filter(d => !search || d.name.match(rx));
        return (
            <div>
                <div className="fl w-30 command-list">
                    <input
                        type="text"
                        placeholder="search commands"
                        onChange={this.handleSearch}
                        value={search}
                    />
                    <hr />
                    <span>
                        {filteredList.length} / {list.length}
                    </span>
                    <hr />
                    {filteredList.map((command) => {
                        return <a
                            key={command.name}
                            className="db"
                            href="javascript:;"
                            onClick={()  => {
                                this.setState({command});
                            }}
                        >
                            {command.name}
                        </a>;
                    })}
                </div>
                <div className="fl w-70">
                    { do {
                        if (command) {
                            <Editor key={command.name} command={command} {...this.props}/>
                        }
                        else {
                            <span>Select a command to edit</span>
                        }
                    }}
                </div>
            </div>
        );
    }

}
