import './styles/main.scss';

import React, { Component } from 'react';
import { render } from 'react-dom';


// editor from website / paste
// react router
// stats main / server / channel as FILTER w/ URL

// commands / stats / docs / source

render((
    <main>
        <nav className="flex">
            <div className="w-50">
                <h1>nibblr</h1>
            </div>
            <div className="w-50 tr">
            </div>
        </nav>
        <img
            className="absolute right-0 bottom-0 nibblr"
            src="/nibblr.gif"
        />
    </main>
), document.body.appendChild(document.createElement('div')));
