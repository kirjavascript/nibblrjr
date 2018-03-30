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

    onDelete = () => {
        this.setState({command: void 0});
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
                            {' '}
                            {command.locked && (
                                <svg width="8" height="8" viewBox="0 0 20 20">
                                    <path fill="#006ADC" d="m3,9h1V6a5,5 0 0,1 12,0V9h1v11H3M14,9V6a4,4 0 1,0-8,0v3"/>
                                </svg>
                            )}
                        </div>;
                    })}
                </div>
                <div className="fl w-70">
                    { do {
                        if (command) {
                            <Editor
                                key={command.name}
                                command={command.name}
                                delete={this.onDelete}
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
