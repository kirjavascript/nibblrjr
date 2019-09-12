import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

import './styles/main.scss';

// editor from website / paste
// react router
// stats main / server / channel as FILTER w/ URL / time period
// remove tachyons
// localstate duplex

// commands / stats / docs / source

const nav = ['commands', 'stats', 'docs', 'source'];

render((
    <Router>
            <Route
                component={({location}) => (
                    <div className="menu" ref={(node) => {
                        if (node) {
                            const { height } = node.getBoundingClientRect();
                            document.body.style.marginTop = height + 'px';
                        }
                    }}>
                        {links.map(link => (
                            <Link
                                className={
                                    location.pathname.split('/')[1] === link
                                        ? 'active' : ''
                                }
                                key={link}
                                to={'/' + link}>
                                {link}
                            </Link>
                        ))}
                    </div>
                )}
            />

        {/*
            <Route exact path="/" component={About} />
            <Route path="/algs" component={Algs} />
            <Route exact path="/subsets" component={Subsets} />
            <Route exact path="/subsets/unsolved" component={Unsolved} />
            <Route path="/trainer" component={Trainer} />
        */}

    </Router>
), document.body.appendChild(document.createElement('div')));
