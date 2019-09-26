import React, { useState, useEffect }  from 'react';
import { Route } from 'react-router-dom';
import reserved from '../../../base/reserved';
import Checkbox from '../checkbox';
import Lock from './lock';

import Editor from './editor';
import CmdList from './cmd-list';

function Cmds() {
    const [commands, setCommands] = useState([]);
    const [search, setSearch] = useState('');
    const [starred, setStarred] = useState(false);
    const [locked, setLocked] = useState(false);
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

    const commandFltr = commands.filter((cmd) => {
        return (
            ((cmd.starred && starred) || !starred)
            && ((cmd.locked && locked) || !locked)
        );
    });
    const commandSrch = commandFltr.filter(d => !search || d.name.match(rx));

    return (
        <>
            <div className="cmd-menu">
                <div>
                    <input
                        type="text"
                        placeholder="new command"
                        value={newName}
                        onChange={(_e) => {}}
                    />
                    <input
                        type="text"
                        placeholder="search commands (regex)"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                    />
                    <div className="cmd-filter">
                        <span> {commandSrch.length} / {commandFltr.length} </span>
                        <div className="cmd-options">
                            <span className="star">★</span>
                            <Checkbox
                                checked={starred}
                                onChange={() => setStarred(!starred)}
                            />
                            <Lock />
                            <Checkbox
                                checked={locked}
                                onChange={() => setLocked(!locked)}
                            />
                        </div>
                    </div>
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
