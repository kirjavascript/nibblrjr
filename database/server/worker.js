const { parentPort } = require('worker_threads');
const { join } = require('path');
const { address } = process.env;

const name = address.replace(/[^a-zA-Z0-9.]/g, '');
const db = require('better-sqlite3')(
    join(__dirname, '../../storage/server', `${name}.db`)
);

db.pragma('journal_mode = WAL'); // only one connection at a time is made
db.exec(`
    CREATE TABLE IF NOT EXISTS log (
        idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        time DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME'))),
        user VARCHAR (100),
        command VARCHAR (10),
        target VARCHAR (100),
        message TEXT
    );
    CREATE INDEX IF NOT EXISTS message ON log (message);
    CREATE INDEX IF NOT EXISTS user ON log (user);
    CREATE TABLE IF NOT EXISTS store (
        idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        namespace VARCHAR(100),
        key VARCHAR(100),
        value TEXT
    );
`);
db.function('REGEXP', (a, b) => new RegExp(a, 'm').test(b) ? 1 : 0);

// kv store

const getQuery = db.prepare(`
    SELECT value FROM store WHERE namespace = ? AND key = ?
`);
const setInsertQuery = db.prepare(`
    INSERT INTO store(value,namespace,key) VALUES (?,?,?)
`);
const setUpdateQuery = db.prepare(`
    UPDATE store SET value = ? WHERE namespace = ? AND key = ?
`);
const setDeleteQuery = db.prepare(`
    DELETE FROM store WHERE namespace = ? AND key = ?
`);
const clearQuery = db.prepare(`
    DELETE FROM store WHERE namespace = ?
`);
const allQuery = db.prepare(`
    SELECT key, value FROM store WHERE namespace = ?
`);
// get //
const get = (namespace, key) => {
    const obj = getQuery.get(namespace, key);
    return !obj ? void 0 : String(obj.value);
};
// set //
const set = (namespace, key, value) => {
    const hasData = typeof get(key) != 'undefined';
    // delete data
    if (Object.is(null, value) || typeof value == 'undefined') {
        hasData && setDeleteQuery.run(namespace, key);
    }
    // update / add data
    else if (!hasData) {
        if (String(value).length > 1048576) {
            throw new Error('Store size limit is 1MB');
        }
        setInsertQuery.run(String(value), namespace, key);
    }
    else {
        setUpdateQuery.run(String(value), namespace, key);
    }
};
// load / save
const save = (namespace, key, data) => set(namespace, key, JSON.stringify(data));
const load = (namespace, key, init = {}) => {
    const data = get(namespace, key);
    return typeof data === 'undefined' ? init : JSON.parse(data);
};
// all //
const all = (namespace) => {
    const obj = allQuery.all(namespace);
    return !Array.isArray(obj) ? [] : obj;
};
const clear = (namespace) => {
    clearQuery.run(namespace);
};

const storeFns = { get, set, load, save, all, clear };

// logging

const logQuery = db.prepare(`
    INSERT INTO log(user,command,target,message) VALUES (?,?,?,?)
`);
const logMessage = (currentNick, message) => {
    // function is kind ugly as it has to translate to node-irc objects
    const commands = ['JOIN', 'PART', 'NICK', 'KICK', 'KILL', 'NOTICE', 'MODE', 'PRIVMSG', 'QUIT', 'TOPIC'];
    if (commands.includes(message.command)) {
        if (message.command === 'QUIT') {
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
            (message.args || [])[0] != currentNick
        ) {
            const hasMessage = !!message.args.length;
            const text = hasMessage ? message.args.slice(1).join(' ') : '';
            logQuery.run([
                message.nick,
                message.command,
                hasMessage ? message.args[0] : '',
                text,
            ]);
        }
    }
};
const logFns = (() => {
    const randomQuery = db.prepare(`
        SELECT * FROM log
        WHERE command = 'PRIVMSG' AND target = ?
        ORDER BY RANDOM() LIMIT ?
    `);
    const random = (target, qty = 1) => {
        return randomQuery.all(target, qty);
    };
    const getQuery = db.prepare(`
        SELECT * FROM log
        WHERE message LIKE ? AND target = ?
        ORDER BY idx DESC LIMIT ? OFFSET ?
    `);
    const get = (target, text, limit = 1, offset = 0) => {
        return getQuery.all(`%${text}%`, target, limit, offset);
    };
    const userQuery = db.prepare(`
        SELECT * FROM log
        WHERE lower(user) = lower(?) AND message LIKE ?
        ORDER BY idx DESC LIMIT ? OFFSET ?
    `);
    const user = (_target, name, text = '', limit = 1, offset = 0) => {
        return userQuery.all(name, `%${text}%`, limit, offset);
    }
    const countQuery = db.prepare(`
        SELECT count(idx) FROM log
        WHERE message LIKE ?
    `);
    const count = (_target, text) => {
        return countQuery.get(`%${text}%`)['count(idx)'];
    };
    const regexQuery = db.prepare(`
        SELECT * FROM log
        WHERE message REGEXP ? AND target = ?
        ORDER BY idx DESC LIMIT ? OFFSET ?
    `);
    const regex = (target, rgx, limit = 1, offset = 0) => {
        return regexQuery.all(rgx, target, limit, offset);
    };
    return { get, count, user, random, regex };
})();

parentPort.on('message', ([id, type, subtype, args]) => {
    if (type === 'log') {
        try {
            logMessage(...args);
        } catch(e) {
            console.error(e);
        }
    } else if (type === 'storeFns' || type === 'logFns') {
        try {
            const func = (type === 'storeFns' ? storeFns : logFns)[subtype];
            parentPort.postMessage(['result', id, func(...args)]);
        } catch (e) {
            parentPort.postMessage(['error', id, e.message]);
        }
    } else if (type === 'close') {
        db.close();
        process.exit(0);
    }
});
