const SQLiteDatabase = require('better-sqlite3');
const { join } = require('path');
const parser = require('sqlite-parser');

// const { commandHash } = require('./commands');

// can load other databases in readonly mode
// write only in events

// parse to AST, validate.

// have a connection pool
// handle nsting

const connections = new Map();
const types = [
];
const variants = [
];
const functions = [];

const traverse = item => {
    if (Array.isArray(item)) {
        for (const child of item) {
            traverse(child);
        }
    } else {
        // object check valie
        console.log(item.type, item.variant, item.name);
        for (const child of Object.values(item)) {
            if (typeof child === 'object') {
                traverse(child);
            }
        }
    }

};

const assertNotEvil = (query) => {
    const ast = parser(query);
    traverse(ast.statement);

    console.log(require('util').inspect(ast, {depth: 9}));
    // traverse keys
    // for each node, check type and varient
};



assertNotEvil(`
    SELECT command_trigger as command, count(command_trigger) as count
    FROM (
        SELECT CASE WHEN instr(message, ' ') <> 0 THEN substr(message, 1, instr(message, ' ')-1) ELSE message END as command_trigger
        FROM log
        WHERE time BETWEEN date(?, '-1 month') AND date(?)
        AND command = 'PRIVMSG'
    )
    WHERE command <> ''
    GROUP BY command
    ORDER BY count DESC
    LIMIT 10

`);





const useSQLDB = (path) => {
    if (connections.has(path)) {
        return connections.get(path);
    }

    const db = new SQLiteDatabase(join(__dirname, '../storage', path));
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
        // exec
        all: (query, params) => {
            assertNotEvil(query);
            bump();
            return prepare(query).all(...params);
        },
    };

    connections.set(path, sqlFns);
};


module.exports = { useSQLDB };
