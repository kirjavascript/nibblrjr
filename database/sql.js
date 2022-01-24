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

const traverse = item => {
    if (Array.isArray(item)) {
        for (const child of item) {
            traverse(child);
        }
    } else {
        const { type, variant, name } = item;
        if (variant === 'attach') {
            throw new Error('ATTACH forbidden');
        }
        if (variant === 'detach') {
            throw new Error('DETACH forbidden');
        }
        if (variant === 'pragma') {
            throw new Error('PRAGMA disallowed');
        }
        if (type === 'identifier' && variant === 'function' && name.includes('extension')) {
            throw new Error('forbidden function');
        }
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

// SELECT command_trigger as command, count(command_trigger) as count
// FROM (
//     SELECT CASE WHEN instr(message, ' ') <> 0 THEN substr(message, 1, instr(message, ' ')-1) ELSE message END as command_trigger
//     FROM log
//     WHERE time BETWEEN date(?, '-1 month') AND date(?)
//     AND command = 'PRIVMSG'
// )
// WHERE command <> ''
// GROUP BY command
// ORDER BY count DESC
// LIMIT 10

// PRAGma max_page_count;
// SELECT ? FROM foo WHERE (pragma);

// SELECT hexasd(1) FROM foo WHERE (pragma);

// CREATE TABLE Bees (
//   id integer PRIMARY KEY ON CONFLICT ROLLBACK AUTOINCREMENT,
//   name varchar(50) NOT NULL UNIQUE,
//   wings integer CONSTRAINT has_enough_wings CHECK (wings >= 2),
//   legs integer CONSTRAINT too_many_legs CHECK (legs <= 6)
// );

//             CREATE TABLE IF NOT EXISTS foo (
//                 idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
//                 message TEXT
//             );


// INSERT INTO Bees (name, wings, legs) VALUES
//   ('Dr. Bee', 2, 6);

// SELECT *
// FROM Bees b
// WHERE b.wings = 2 AND b.legs = 6;

// INSERT INTO Bees (name, wings, legs) VALUES
//   ('Mr. Dragonfly', 4, 6),
//   ('Nick', 0, 2);




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
