import React, { Component } from 'react';
import { render } from 'react-dom';
import { initSocket } from './socket';

import { Commands } from './commands';

// const Test = () => false;

// import { Tab, Tabs, Navbar, NavbarGroup, NavbarDivider, NavbarHeading, Alignment, Button } from '@blueprintjs/core';
import { Spinner } from '@blueprintjs/core';

export class Root extends Component {

    state = { tab: 'commands', ws: void 0 };

    // handleTabChange = (tab) => {
    //     this.setState({tab});
    // };

    componentDidMount() {
        initSocket((ws) => {
            this.setState({ws});
        });
    }

    render() {
        return <div>
            {/*
<Navbar className="pt-dark">
    <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading>nibblrjr</NavbarHeading>
        <NavbarDivider />
        <Button className="pt-minimal" icon="home" text="Home" />
        <Button className="pt-minimal" icon="document" text="Files" />
    </NavbarGroup>


</Navbar>

            <Tabs id="tabs" vertical={false} onChange={this.handleTabChange} selectedTabId={this.state.tab}>
                <Tab id="about" icon="home" title="About" panel={<Test />} />
                <Tab id="commands" title="Commands" panel={<Commands />} />
                <Tab id="admin" title="Admin" disabled  />
                <Tabs.Expander />
                <input className="pt-input" type="text" placeholder="Search..." />
            </Tabs>

            react router Switch
            /commands

            */}

            {!this.state.ws ? <Spinner /> : <Commands ws={this.state.ws}/>}
        </div>;
    }
}

render(<Root/>, document.body.appendChild(document.createElement('div')));
