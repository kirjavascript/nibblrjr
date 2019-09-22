import React, { useRef } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Link, withRouter } from 'react-router-dom';

import Docs from './docs';
import Stats from './stats';

import './styles/main.scss';

// editor from website / paste
// react router
// stats main / server / channel as FILTER w/ URL / time period
// remove tachyons
// localstate duplex

const Nibblr = withRouter(({ location }) => {
    const currentPath = location.pathname.split('/')[1];
    return (
        <>
            <div className="menu">
                <h1>
                    nibblr<span className="jr">jr</span>
                    <span className="heart"> ♥</span>
                </h1>
                {['cmds', 'stats', 'docs'].map(link => (
                    <Link
                        className={
                            currentPath === link
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
            <main className={`main-${currentPath}`}>
                <Route exact path="/stats" component={Stats} />
                <Route exact path="/docs" component={Docs} />
            </main>
            <img src="/nibblr.gif" className="nibblr" />

            {/*
            <Route exact path="/" component={About} />
            <Route path="/algs" component={Algs} />
            <Route exact path="/subsets" component={Subsets} />
            <Route exact path="/subsets/unsolved" component={Unsolved} />
            <Route path="/trainer" component={Trainer} />
            */}
        </>
    );
});

render((
    <Router>
        <Nibblr />
    </Router>
), document.body.appendChild(document.createElement('div')));
