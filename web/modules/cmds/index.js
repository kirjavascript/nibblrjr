import React, { useState, useEffect }  from 'react';
import { Route } from 'react-router-dom';
import reserved from '../../../base/reserved';

import Editor from './editor';
import CmdList from './cmd-list';

function Cmds() {
    const [commands, setCommands] = useState([]);
    const [search, setSearch] = useState('');
    const [starred, setStarred] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetch('/api/command/list')
            .then(res => res.json())
            .then(setCommands)
            .catch(console.error);
    }, []);

    let rx;
    try { rx = new RegExp(search); }
    catch(e) {}

    const commandFltr = commands;
    const commandSrch = commandFltr.filter(d => !search || d.name.match(rx));

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
                    <span className="star">★</span>
                    <input
                        type="checkbox"
                        checked={starred}
                        onChange={(e) => {
                            setStarred(!starred);
                        }}
                    />
                    TODO: locked

                    <span> {commandSrch.length} / {commandFltr.length} </span>
                </div>

                <CmdList commands={commandSrch} />
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
            <button>save</button>
            <button>lock</button>
            <button>star</button>
            <button>delete</button>
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
