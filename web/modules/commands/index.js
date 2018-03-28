import React, { Component } from 'react';
import { observer } from 'mobx-react';

import { env } from '#store';
import { Editor } from './editor';

@observer
export class Commands extends Component {

    state = {
        search: '',
        command: void 0,
    };

    componentDidMount() {
        env.getList();
    }

    handleSearch = (e) => {
        this.setState({search: e.target.value});
    };

    render() {
        const { search, command } = this.state;
        const list = env.list;
        const rx = new RegExp(search);
        const filteredList = list.filter(d => !search || d.name.match(rx));

        // TODO: fix searching for *

        return (
            <div className="commands">
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
                        return <div key={command.name}>
                            <a
                                href="javascript:;"
                                onClick={()  => {
                                    this.setState({command});
                                }}
                            >
                                {command.name}
                            </a>
                            {command.starred && ' ★'}
                        </div>;
                    })}
                </div>
                <div className="fl w-70">
                    { do {
                        if (command) {
                            <Editor key={command.name} command={command} {...this.props}/>
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
