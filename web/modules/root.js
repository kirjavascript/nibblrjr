import React, { Component } from 'react';
import { render } from 'react-dom';

(new WebSocket('ws://' + location.host))
    .addEventListener('message', (e) => {
        if (e.data == 'RELOAD') {
            location.reload();
        }
    });

export class Root extends Component {

    render() {
        return <div>
            <com test="asdasd">

            </com>
        </div>;
    }

}


render(<Root/>, document.body.appendChild(document.createElement('div')));
