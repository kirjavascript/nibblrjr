import React, { useState, useEffect, useCallback }  from 'react';
import { Route } from 'react-router-dom';
import Checkbox from '../checkbox';
import Lock from './lock';
import Star from './star';

import Editor from './editor';
import CmdList from './cmd-list';
import Default from './default';
import { useFetch } from '../hooks';

import reserved from '../../../base/reserved';
import { parseCommand } from '../../../irc/evaluate/scripts/parse-command';

export function CommandName({ command }) {
    return <>
        {command.name}
        {' '}
        {command.starred && <Star />}
        {' '}
        {command.locked && <Lock />}
        {command.event && <span className="event"> (event)</span>}
    </>;
}

function Cmds({ history }) {
    const [commands, setCommands] = useState([]);
    const [search, setSearch] = useState('');
    const [starred, setStarred] = useState(false);
    const [locked, setLocked] = useState(false);
    const [newName, setNewName] = useState('');
    const { fetchAPI, admin } = useFetch();

    const updateList = useCallback(() => {
        fetchAPI('command/list')
            .then(setCommands)
            .catch(console.error);
    }, []);

    useEffect(updateList, []);

    // command filtering

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

    // is the new value valid

    const exists = commands.some(d => d.name === newName);
    const { root } = parseCommand({ text: newName });
    const parent = commands.find(d => d.name === root);
    const isLocked = parent && parent.locked;
    const isReserved = reserved.includes(newName);
    const isValid = !isReserved && !exists && (!isLocked || admin);

    const handleNew = useCallback((e) => {
        if (e.keyCode === 13 && isValid) {
            const name = encodeURIComponent(newName);
            fetchAPI(`command/new/${name}`, { method: 'POST' })
                .then(() => {
                    setNewName('');
                    updateList();
                    history.push(`/cmds/${name}`);
                })
                .catch(console.error);
        }
    }, [newName]);

    return (
        <>
            <div className="cmd-menu">
                <div>
                    <input
                        type="text"
                        placeholder="new command"
                        className={!isValid && newName ? 'invalid' : ''}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value.replace(/\s+/g, ''))}
                        onKeyDown={handleNew}
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
                        <div className="cmd-toggle">
                            <Star />
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
            <Route exact path="/cmds/:name" render={(props) => (
                <EditorPane updateList={updateList} {...props} />
            )} />
            <Route exact path="/cmds" component={Default} />
        </>
    );
}

const loadMsg = '/* loading ... */';

function EditorPane({ updateList, history, match: { params } }) {
    const { fetchAPI, admin } = useFetch();
    const [cmd, setCmd] = useState({ command: loadMsg });
    const [cmdTextCopy, setCmdTextCopy] = useState(loadMsg);
    const [saving, setSaving] = useState(false);
    const [deleteText, setDeleteText] = useState('delete');

    function getCommand() {
        fetchAPI('command/get/' + params.name)
            .then(cmd => {
                setCmd(cmd);
                setCmdTextCopy(cmd.command);
            })
            .catch(console.error);
        setDeleteText('delete');
    }

    useEffect(getCommand, [params.name]);

    const toggleOption = (type) => {
        const init = { method: 'POST', body: { [type]: !cmd[type] } };
        fetchAPI('command/set-config/' + params.name, init)
            .then(obj => {
                if (!obj.error) {
                    getCommand();
                    updateList();
                }
            })
            .catch(console.error);
    };

    const save = () => {
        setSaving(true);
        const init = { method: 'POST', body: { command: cmd.command } };
        fetchAPI('command/set/' + params.name, init)
            .then(obj => {
                if (!obj.error) {
                    setCmdTextCopy(cmd.command);
                } else {
                    alert(obj.error);
                }
                setSaving(false);
            })
            .catch(console.error);
    };

    const _delete = () => {
        if (deleteText !== 'confirm?') {
            setDeleteText('confirm?');
        } else {
            fetchAPI('command/delete/' + params.name, { method: 'POST' })
                .then(obj => {
                    if (!obj.error) {
                        updateList();
                        history.push('/cmds');
                    } else {
                        setDeleteText(obj.error);
                    }
                })
                .catch(console.error);
        }
    };

    const source = cmd.error ? `/* error: ${cmd.error} */` : cmd.command;
    const { locked, starred, event } = cmd;
    const saveText = saving ? 'saving' : cmd.command === cmdTextCopy ? 'saved' : 'save';

    const isAdmin = admin;
    const readOnly = cmd.locked && !isAdmin;

    return (
        <Editor
            value={source}
            readOnly={readOnly}
            onSave={save}
            onChange={(code) => {
                setCmd({ ...cmd, command: code });
            }}
        >
            <div className="cmd-options">
                <span className="cmd-name">
                    <CommandName command={cmd} />
                </span>
                {!!cmd.name && (
                    <div>
                        {!readOnly && (
                            <>
                                <button
                                    type="button"
                                    onClick={save}
                                >
                                    {saveText}
                                </button>
                                {isAdmin && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toggleOption('locked');
                                            }}>
                                            {locked ? 'unlock' : 'lock'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toggleOption('starred');
                                            }}>
                                            {starred ? 'unstar' : 'star'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toggleOption('event');
                                            }}>
                                            {event ? 'unevent' : 'as event'}
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={_delete}
                                >
                                    {deleteText}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Editor>
    );
}

export default Cmds;
