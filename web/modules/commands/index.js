import React, { Component } from 'react';
import { observer } from 'mobx-react';

import { env } from '#store';
import { Editor } from './editor';

@observer
export class Commands extends Component {

    state = {
        search: '',
        command: void 0,
        starred: false,
    };

    componentDidMount() {
        env.getList();
    }

    handleSearch = (e) => {
        this.setState({search: e.target.value});
    };

    toggleStarred = () => {
        this.setState({starred: !this.state.starred});
    };

    render() {
        const { search, command, starred } = this.state;
        const list = !starred ? env.list : env.list.filter(d => d.starred);
        let rx;
        try { rx = new RegExp(search); }
        catch(e) {}

        const filteredList = list.filter(d => !search || d.name.match(rx));

        return (
            <div className="commands">
                <div className="fl w-30 command-list">
                    <input
                        type="text"
                        className={`w-100 ${!rx?'red':''}`}
                        placeholder="search commands (regex)"
                        onChange={this.handleSearch}
                        value={search}
                    />
                    <hr />
                    <div className="flex justify-between">
                        <span> {filteredList.length} / {list.length} </span>
                        <div className="relative">
                            <span className="f6 gold absolute left--1">★</span>
                            <input
                                type="checkbox"
                                checked={starred}
                                onChange={this.toggleStarred}
                            />
                        </div>
                    </div>
                    <hr />
                    {filteredList.map((command) => {
                        return <div key={command.name}>
                            <a
                                href="javascript:;"
                                onClick={()  => {
                                    this.setState({command});
                                }}
                            >
                                {command.name}
                            </a>
                            {command.starred && <span className="gold"> ★</span>}
                        </div>;
                    })}
                </div>
                <div className="fl w-70">
                    { do {
                        if (command) {
                            <Editor
                                key={command.name}
                                command={command.name}
                            />
                        }
                        else {
                            false
                        }
                    }}
                </div>
            </div>
        );
    }

}
