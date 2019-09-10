import React, { Component } from 'react';
import { observer } from 'mobx-react';

import { env } from '#store';
import { Editor } from './editor';
import { parseCommand } from '../../../irc/evaluate/scripts/parse-command';
import reserved from '../../../base/reserved';

@observer
export class Commands extends Component {

    state = {
        search: '',
        newName: '',
        newIsValid: true,
        command: void 0,
        starred: false,
    };

    componentDidMount() {
        env.getList();
    }

    handleSearch = (e) => {
        this.setState({search: e.target.value});
    };

    handleNew = (e) => {
        const { value } = e.target;
        // check if the same exists
        const exists = !!env.list.find(d => d.name == value)
        // check if the parent is locked
        const { list } = parseCommand({text: value});
        const parent = env.list.find(d => d.name == list[0]);
        const locked = parent && parent.locked;
        const isReserved = reserved.includes(value);
        const valid = !isReserved && !exists && (!locked || env.admin);

        this.setState({
            newName: value.replace(/\s+/g, ''),
            newIsValid: valid,
        });
    };

    handleNewDown = (e) => {
        const { newName, newIsValid } = this.state;
        if (e.keyCode == 13 && newIsValid) {
            env.newCommand(newName);
            this.setState({newName: '', command: newName});
        }
    };

    toggleStarred = () => {
        this.setState({starred: !this.state.starred});
    };

    onDelete = () => {
        this.setState({command: void 0});
    };

    render() {
        const { search, command, starred, newName, newIsValid } = this.state;
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
                        className={`w-100 ${!newIsValid?'red':''}`}
                        placeholder="new command"
                        onChange={this.handleNew}
                        onKeyDown={this.handleNewDown}
                        value={newName}
                    />
                    <hr />
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
                                    this.setState({command: command.name});
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
                    {!!command && (
                        <Editor
                            key={command}
                            command={command}
                            delete={this.onDelete}
                        />
                    )}
                </div>
            </div>
        );
    }

}
