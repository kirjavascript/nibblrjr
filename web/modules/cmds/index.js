import React, { useState, useEffect }  from 'react';
import { Route, Link } from 'react-router-dom';
import reserved from '../../../base/reserved';

import Editor from './editor';

function Cmds() {
    const [commands, setCommands] = useState([]);
    const [search, setSearch] = useState('');
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetch('/api/command/list')
            .then(res => res.json())
            .then(setCommands)
            .catch(console.error);
    }, []);

    return (
        <>
            <div className="cmd-menu">
                <div>
                    <input
                        type="text"
                        placeholder="new command"
                        value={newName}
                        onChange={(e) => {}}
                    />
                    <input
                        type="text"
                        placeholder="search commands (regex)"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                    />
                    <span className="">★</span>
                    <input
                        type="checkbox"
                    />
                </div>

                <div className="cmd-list">
                    {commands.map((command) => {
                        return <div key={command.name}>
                            <Link
                                to={`/cmds/${encodeURIComponent(command.name)}`}
                            >
                                {command.name}
                            </Link>
                            {command.starred && <span className="star"> ★</span>}
                            {' '}
                            {command.locked && (
                                <svg width="8" height="8" viewBox="0 0 20 20">
                                    <path
                                        fill="#006ADC"
                                        d="m3,9h1V6a5,5 0 0,1 12,0V9h1v11H3M14,9V6a4,4 0 1,0-8,0v3"
                                    />
                                </svg>
                            )}
                        </div>;
                    })}

                </div>
            </div>
            <div className="cmd-editor">
                <Route path="/cmds/:name" component={EditorPane} />
            </div>
        </>
    );
}

function EditorPane({ match: { params } }) {
    const [cmd, setCmd] = useState({ command: '/* loading ... */' });

    // save n minutes ago

    useEffect(() => {
        fetch('/api/command/get/' + params.name)
            .then(res => res.json())
            .then(setCmd)
            .catch(console.error);
    }, [params.name]);

    const source = cmd.error ? `/* error: ${cmd.error} */` : cmd.command;

    return (
        <>
            <pre>
                {JSON.stringify(cmd, null, 4)}
            </pre>
            <Editor
                value={source}
                onChange={(res) => {
                    // console.log(res);
                }}
            />
        </>
    );
}

export default Cmds;
