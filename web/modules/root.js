import React, { Component } from 'react';
import { render } from 'react-dom';
import { initSocket } from './socket';

import { Commands } from './commands';

import {
    Spinner,
    Alignment,
    Navbar,
    NavbarGroup,
    NavbarHeading,
    NavbarDivider,
    Button,
} from '@blueprintjs/core';

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
            <Navbar className="pt-dark">
                <NavbarGroup align={Alignment.LEFT}>
                    <NavbarHeading>nibblrjr</NavbarHeading>
                    <NavbarDivider />
                    <Button className="pt-minimal" icon="home" text="Home" />
                    <Button className="pt-minimal" icon="document" text="Commands" />
                </NavbarGroup>
            </Navbar>

            <main>
                {!this.state.ws ? <Spinner /> : <Commands ws={this.state.ws}/>}
            </main>
        </div>;
    }
}

render(<Root/>, document.body.appendChild(document.createElement('div')));
