import React, { Component } from 'react';

import { Tab, Tabs } from '@blueprintjs/core';

const Test = () => false;

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
            <Tabs id="commandList" vertical={true}>
                <div>
                    <input
                        className="pt-input"
                        type="text"
                        placeholder="Search..."
                        onChange={this.handleSearch}
                        value={search}
                    />
                </div>
                <Tabs.Expander />
                {list
                    .filter(d => !search || d.name.includes(search))
                    .map((command) => {
                    return <Tab
                        key={command.name}
                        id={command.name}
                        title={command.name}
                        panel={<Test/>}
                        disabled={command.disabled}
                    />;
                })}
            </Tabs>
        </div>;
    }

}
