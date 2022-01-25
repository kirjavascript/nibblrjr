const SQLiteDatabase = require('better-sqlite3');
const { join } = require('path');
const parser = require('sqlite-parser');
const { commandHash } = require('./commands');

// can load other databases in readonly mode
// write only in events

const connections = new Map();

const traverse = item => {
    if (Array.isArray(item)) {
        for (const child of item) {
            traverse(child);
        }
    } else {
        const { type, variant, name } = item;
        if (variant === 'attach') throw new Error('ATTACH forbidden');
        if (variant === 'detach') throw new Error('DETACH forbidden');
        if (variant === 'pragma') throw new Error('PRAGMA disallowed');
        if (
            type === 'identifier'
            && variant === 'function'
            && name.includes('extension')
        ) throw new Error('dont breathe this');

        for (const child of Object.values(item)) {
            if (typeof child === 'object' && child !== null) {
                traverse(child);
            }
        }
    }
};

const assertNotEvil = (query) => {
    const ast = parser(query);
    traverse(ast.statement);
};

const useSQLDB = (path) => {
    if (connections.has(path)) {
        return connections.get(path);
    }

    const db = new SQLiteDatabase(
        join(__dirname, '../storage/namespace', commandHash(path))
    );
    db.pragma('max_page_count = 1000');
    db.pragma('page_size = 4096');
    db.pragma('journal_mode = WAL');

    let timeout;
    const bump = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            connections.delete(path);
            db.close();
        }, 60000)
    };

    bump();

    const prepareCache = new Map();

    const prepare = (query) => {
        if (prepareCache.has(query)) return prepareCache.get(query);
        const statement = db.prepare(query);
        prepareCache.set(query, statement);
        return statement;
    };

    const sqlFns = {
        // TODO: other shit
        // SQL.all``
        // SQL.exec``
        all: (query, params) => {
            assertNotEvil(query);
            bump();
            return prepare(query).all(...params);
        },
    };

    connections.set(path, sqlFns);

    return sqlFns;
};


module.exports = { useSQLDB };
