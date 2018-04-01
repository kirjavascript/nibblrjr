const fs = require('fs');
const SQLiteDatabase = require('better-sqlite3');
const _dir = __dirname + '/../storage/';
const { parseCommand } = require('../irc/parse-command');

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
                    setUpdateQuery.run(value, name);
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

            this.commands = {
                db, get, delete: _delete, set, list, setConfig,
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

            db.register(function REGEXP(a, b) {
                return new RegExp(a, 'm').test(b) ? 1 : 0;
            });

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
            const logFactory = (target) => {
                const randomQuery = db.prepare(`
                    SELECT * FROM log
                    WHERE command = 'PRIVMSG' AND target = ?
                    ORDER BY RANDOM() LIMIT ?
                `);
                const random = (qty = 1) => {
                    return randomQuery.all(target, qty);
                };
                const getQuery = db.prepare(`
                    SELECT * FROM log
                    WHERE message LIKE ? AND target = ?
                    ORDER BY idx DESC LIMIT ? OFFSET ?
                `);
                const get = (text, limit = 1, offset = 0) => {
                    return getQuery.all(`%${text}%`, target, limit, offset);
                };
                const getGlobalQuery = db.prepare(`
                    SELECT * FROM log
                    WHERE message LIKE ?
                    ORDER BY idx DESC LIMIT ? OFFSET ?
                `);
                const getGlobal = (text, limit = 1, offset = 0) => {
                    return getQuery.all(`%${text}%`, limit, offset);
                };
                const userQuery = db.prepare(`
                    SELECT * FROM log
                    WHERE lower(user) = lower(?) AND message LIKE ?
                    ORDER BY idx DESC LIMIT ? OFFSET ?
                `);
                const user = (name, text = '', limit = 1, offset = 0) => {
                    return userQuery.all(name, `%${text}%`, limit, offset);
                }
                const countQuery = db.prepare(`
                    SELECT count(idx) FROM log
                    WHERE message LIKE ?
                `);
                const count = (text) => {
                    return countQuery.get(`%${text}%`)['count(idx)'];
                };
                const regexQuery = db.prepare(`
                    SELECT * FROM log
                    WHERE message REGEXP ? AND target = ?
                    ORDER BY idx DESC LIMIT ? OFFSET ?
                `);
                const regex = (rgx, limit = 1, offset = 0) => {
                    return regexQuery.all(rgx, target, limit, offset);
                };
                return { get, getGlobal, count, user, random, regex };
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

            return { log, logFactory, storeFactory };
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
