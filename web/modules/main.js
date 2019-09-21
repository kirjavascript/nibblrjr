import React, { useRef } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

import Docs from './docs';

import './styles/main.scss';

// editor from website / paste
// react router
// stats main / server / channel as FILTER w/ URL / time period
// remove tachyons
// localstate duplex

function Nibblr() {
    return (
        <Router>
            <Route
                component={({location}) => (
                    <div className="menu">
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
            <main>
                <Route exact path="/docs" component={Docs} />
            </main>

            {/*
            <Route exact path="/" component={About} />
            <Route path="/algs" component={Algs} />
            <Route exact path="/subsets" component={Subsets} />
            <Route exact path="/subsets/unsolved" component={Unsolved} />
            <Route path="/trainer" component={Trainer} />
            */}

        </Router>
    );
}

render(<Nibblr />, document.body.appendChild(document.createElement('div')));
