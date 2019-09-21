import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

import './styles/main.scss';

// editor from website / paste
// react router
// stats main / server / channel as FILTER w/ URL / time period
// remove tachyons
// localstate duplex

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
                    <h1>nibblrjr <span className="heart">♥</span></h1>
                    {['cmds', 'stats', 'docs'].map(link => (
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
                    <a
                        target="_blank"
                        rel="noopener"
                        href="https://www.github.com/kirjavascript/nibblrjr"
                    >
                        src
                    </a>
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
