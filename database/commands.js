const { parseCommand } = require('../irc/parse-command');
const { limit } = require('../irc/context/limit.js');

const parseBool = (str) => {
    return str.toLowerCase() == 'true' ? true : false;
};
function createCommandDB(database) {

    const db = database.createDB('commands', `
        CREATE TABLE IF NOT EXISTS commands (
            name VARCHAR (100) PRIMARY KEY UNIQUE,
            command TEXT,
            locked BOOLEAN DEFAULT false,
            starred BOOLEAN DEFAULT false
        );
    `);

    // get //
    const getQuery = db.prepare(`
        SELECT command, locked, starred FROM commands WHERE name = ?
    `);
    const get = (name) => {
        const obj = getQuery.get(name);
        if (!obj) {
            return void 0;
        }
        else {
            // get parent data
            const { list } = parseCommand({ text: name });
            const parent = getQuery.get(list[0]);
            const config = parent ? {
                locked: parseBool(parent.locked),
                starred: parseBool(parent.starred),
            } : {
                locked: parseBool(obj.locked),
                starred: parseBool(obj.starred),
            };

            return {
                name,
                command: obj.command,
                ...config,
            };
        }
    };

    // list //
    const listQuery = db.prepare(`
        SELECT name, locked, starred FROM commands
        ORDER BY name COLLATE NOCASE ASC
    `);
    const list = () => {
        const obj = listQuery.all();
        if (!Array.isArray(obj)) {
            return [];
        }
        else {
            const names = obj.map(d => d.name);
            return obj.map(d => {
                const { list } = parseCommand({ text: d.name });
                if (list[0] != d.name && names.includes(list[0])) {
                    // map config to parent config
                    // assumes alphabetical list
                    const parent = obj.find(d => d.name == list[0]) || {};
                    return ({
                        name: d.name,
                        locked: parseBool(parent.locked),
                        starred: parseBool(parent.starred),
                    });
                }
                else {
                    return ({
                        name: d.name,
                        locked: parseBool(d.locked),
                        starred: parseBool(d.starred),
                    });
                }
            });
        }
    };

    const setInsertQuery = db.prepare(`
        INSERT INTO commands(name,command,locked,starred) VALUES (?,?,?,?)
    `);
    const setUpdateQuery = db.prepare(`
        UPDATE commands SET command = ? WHERE name = ?
    `);
    const set = (name, value) => {
        const safeName = name.replace(/\s+/g, '');
        if (typeof get(safeName) == 'undefined') {
            setInsertQuery.run(safeName, value, 'false', 'false');
        }
        else {
            setUpdateQuery.run(value, safeName);
        }
    };

    // delete //
    const deleteQuery = db.prepare(`
        DELETE FROM commands WHERE name = ?
    `);
    const _delete = (name) => {
        deleteQuery.run(name);
    };

    // config //
    const lockQuery = db.prepare(`
        UPDATE commands SET locked = ? WHERE name = ?
    `);
    const starQuery = db.prepare(`
        UPDATE commands SET starred = ? WHERE name = ?
    `);

    const setConfig = (name, obj) => {
        // only operates on the parent (if it exists)
        const { list } = parseCommand({ text: name });
        const parent = getQuery.get(list[0]);
        const rootName = parent ? list[0] : name;
        if ('locked' in obj) { lockQuery.run(String(obj.locked), rootName); }
        if ('starred' in obj) { starQuery.run(String(obj.starred), rootName); }
    };

    // public API

    const commandFns = {
        get, list,
    };

    const nameQuery = db.prepare(`
        SELECT name FROM commands
        ORDER BY name COLLATE NOCASE ASC
    `);

    commandFns.names = () => {
        return (nameQuery.all()||[]).map(d => d.name);
    };

    commandFns.setSafe = limit((name, value) => {
        const obj = get(name);
        const isEval = ['>', '#', '%'].includes(name);
        const parentCmdName = parseCommand({text: name}).list[0];
        const parentCmd = get(parentCmdName);
        if (
            obj && obj.locked
            || isEval
            || !obj && parentCmd && parentCmd.locked
        ) {
            return false;
        }
        else {
            set(name, value);
            return true;
        }
    }, 1);

    commandFns.deleteSafe = limit((name) => {
        const obj = get(name);
        if (obj && obj.locked) {
            return false;
        }
        else {
            _delete(name);
            return true;
        }
    }, 1);

    return {
        db, get, delete: _delete, set, list, setConfig, commandFns,
    };
}

module.exports = {
    createCommandDB,
};
