import React, { useState, useEffect }  from 'react';
import { Link } from 'react-router-dom';

import Editor from './editor';

function Cmds() {
    const [commands, setCommands] = useState([]);
    // const [search, setSearch] = useState('');
    // const [newName, setNewName] = useState('');

    useEffect(() => {
        fetch('/api/command/list')
            .then(res => res.json())
            .then(setCommands)
            .catch(console.error);
    }, []);

    return (
        <div className="cmds">
            <div>
                <input
                    type="text"
                    placeholder="new command"
                />
                <input
                    type="text"
                    placeholder="search commands (regex)"
                />
                <div className="flex justify-between">
                    <div className="relative">
                        <span className="f6 gold absolute left--1">★</span>
                        <input
                            type="checkbox"
                        />
                    </div>
                </div>
            </div>

            <div className="cmd-list">
                {commands.map((command) => {
                    return <div key={command.name}>
                        <Link
                            to={`/cmds/${command.name}`}
                        >
                            {command.name}
                        </Link>
                        {command.starred && <span className="gold"> ★</span>}
                        {' '}
                        {command.locked && (
                            <svg width="8" height="8" viewBox="0 0 20 20">
                                <path fill="#006ADC" d="m3,9h1V6a5,5 0 0,1 12,0V9h1v11H3M14,9V6a4,4 0 1,0-8,0v3"/>
                            </svg>
                        )}
                    </div>;
                })}

            </div>
        </div>
    );
}

export default Cmds;
