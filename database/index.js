const fs = require('fs');
const SQLiteDatabase = require('better-sqlite3');
const _dir = __dirname + '/../storage/';

const parseBool = (str) => {
    return str.toLowerCase() == 'true' ? true : false;
};

class Database {
    constructor(parent) {

        // commands //

        {
            const db = this.createDB('commands', `
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

                return !obj ? void 0 : {
                    name,
                    command: obj.command,
                    locked: parseBool(obj.locked),
                    starred: parseBool(obj.starred),
                };
            };

            // list //
            const listQuery = db.prepare(`
                SELECT name, locked, starred FROM commands ORDER BY name COLLATE NOCASE ASC
            `);
            const list = () => {
                const obj = listQuery.all();

                return !Array.isArray(obj) ? [] : obj.map(d => ({
                    name: d.name,
                    locked: parseBool(d.locked),
                    starred: parseBool(d.starred),
                }));
            };

            // TODO
            //
            const setInsertQuery = db.prepare(`
                INSERT INTO commands(name,command) VALUES (?,?)
            `);
            const setUpdateQuery = db.prepare(`
                UPDATE commands SET command = ? WHERE name = ?
            `);
            const set = (name, value) => {
                if (typeof get(name) == 'undefined') {
                    setInsertQuery.run(name, value);
                }
                else {
                    setUpdateQuery.run(name, value);
                }
            };

            // locking //
            const lockQuery = db.prepare(`
                UPDATE commands SET locked = 'true' WHERE name = ?
            `);
            const lock = (name) => { lockQuery.run(name); };
            const unlockQuery = db.prepare(`
                UPDATE commands SET locked = 'false' WHERE name = ?
            `);
            const unlock = (name) => { unlockQuery.run(name); };

            this.commands = {
                db, get, set, list, lock, unlock,
            };
        }

        // server data //

        this.createServerDB = (node) => {
            const name = node.address.replace(/[^a-zA-Z0-9.]/g, '');
            const db = this.createDB(name, `
                CREATE TABLE IF NOT EXISTS store (
                    idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                    namespace VARCHAR(100),
                    key VARCHAR(100),
                    value TEXT
                );
                CREATE TABLE IF NOT EXISTS events (
                    idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                    timestamp VARCHAR (20),
                    type VARCHAR (10),
                    user VARCHAR (20),
                    message TEXT,
                    target VARCHAR (20)
                );
                CREATE TABLE IF NOT EXISTS log (
                    idx INTEGER PRIMARY KEY AUTOINCREMENT,
                    time DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME'))),
                    user VARCHAR (100),
                    command VARCHAR (10),
                    target VARCHAR (100),
                    message TEXT
                );
            `);

            // logging

            const logQuery = db.prepare(`
                INSERT INTO log(user,command,target,message) VALUES (?,?,?,?)
            `);
            const log = (message) => {
                const commands = ['JOIN', 'PART', 'NICK', 'KICK', 'KILL', 'NOTICE', 'MODE', 'PRIVMSG', 'QUIT', 'TOPIC'];
                if (commands.includes(message.command)) {
                    if (message.command == 'QUIT') {
                        logQuery.run([
                            message.nick,
                            message.command,
                            '',
                            message.args.join(' '),
                        ]);
                    }
                    // check if has a source and is  not PM
                    else if (
                        message.nick &&
                        (message.args || [])[0] != node.nickname
                    ) {
                        logQuery.run([
                            message.nick,
                            message.command,
                            message.args.length ? message.args[0] : '',
                            message.args.splice(1).join(' '),
                        ]);
                    }
                }
            };

            // key/value store

            const storeFactory = (namespace) => {

                // get //
                const getQuery = db.prepare(`
                    SELECT value FROM store WHERE namespace = ? AND key = ?
                `);
                const get = (key) => {
                    const obj = getQuery.get(namespace, key);
                    return !obj ? void 0 : String(obj.value);
                };

                // set //
                const setInsertQuery = db.prepare(`
                    INSERT INTO store(value,namespace,key) VALUES (?,?,?)
                `);
                const setUpdateQuery = db.prepare(`
                    UPDATE store SET value = ? WHERE namespace = ? AND key = ?
                `);
                const setDeleteQuery = db.prepare(`
                    DELETE FROM store WHERE namespace = ? AND key = ?
                `);
                const set = (key, value) => {
                    const hasData = typeof get(key) != 'undefined';
                    // delete data
                    if (Object.is(null, value) || typeof value == 'undefined') {
                        hasData && setDeleteQuery.run(namespace, key);
                    }
                    // update / add data
                    else if (!hasData) {
                        setInsertQuery.run(String(value), namespace, key);
                    }
                    else {
                        setUpdateQuery.run(String(value), namespace, key);
                    }
                };

                // all //
                const allQuery = db.prepare(`
                    SELECT key, value FROM store WHERE namespace = ?
                `);
                const all = () => {
                    const obj = allQuery.all(namespace);
                    return !Array.isArray(obj) ? [] : obj;
                };

                return { get, set, all, namespace };
            };

            return { log, storeFactory };
        };
    }

    createDB(name, schema) {
        fs.openSync(`${_dir}${name}.db`, 'a');
        const db = new SQLiteDatabase(`${_dir}${name}.db`);
        db.exec(schema);
        return db;
    }
};

module.exports = {
    Database,
};
