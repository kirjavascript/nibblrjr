import React, { useRef } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Link, withRouter } from 'react-router-dom';

import Cmds from './cmds';
import Stats from './stats';
import Docs from './docs';

import './styles/main.scss';

// stats main / server / channel as FILTER w/ URL / time period
// check unsaved

const Nibblr = withRouter(({ location }) => {
    const currentPath = location.pathname.split('/')[1];
    return (
        <>
            <div className="menu">
                <h1>
                    nibblr<span className="jr">jr</span>
                    <span className="heart"> ♥</span>
                </h1>
                {['cmds', 'docs'].map(link => (
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
                    src^
                </a>
            </div>
            <main className={`main-${currentPath}`}>
                <Route path="/cmds" component={Cmds} />
                <Route path="/stats" component={Stats} />
                <Route exact path="/docs" component={Docs} />
            </main>
            <img src="/nibblr.gif" className="nibblr" />
        </>
    );
});

render((
    <Router>
        <Nibblr />
    </Router>
), document.body.appendChild(document.createElement('div')));
