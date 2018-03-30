import React, { Component } from 'react';
import { observer } from 'mobx-react';

import { env } from '#store';

@observer
export class Auth extends Component {

    state = {
        password: '',
    };

    onChange = (e) => {
        this.setState({password: e.target.value});
    };

    onKeyDown = (e) => {
        if (e.keyCode == 13) {
            env.login(this.state.password);
        }
    };

    render() {
        return do {
            if (env.admin) {
                <div className="login">
                    ~admin mode~
                </div>
            }
            else {
                <input
                    type="password"
                    value={this.state.password}
                    className="login tr"
                    placeholder="admin login"
                    onChange={this.onChange}
                    onKeyDown={this.onKeyDown}
                />
            }
        };
    }
}
