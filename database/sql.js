const SQLiteDatabase = require('better-sqlite3');
const { join } = require('path');
const { commandHash } = require('./commands');

console.log('once');
// can load other databases in readonly mode
// write only in events

// parse to AST, validate.

// have a connection pool
// handle nsting

const connections = new Map();


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

    const sqlFns = {
        exec: (query) => {
            bump();
            db.exec(query);
        },
    };


//     db.exec(`

//             CREATE TABLE IF NOT EXISTS foo (
//                 idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
//                 message TEXT
//             );
//     `);
    // generate AST and validate
    // TODO handle cleanup
    // check intransaction
    // have connection pool, so only ever one connection
    // pollClose()
    // check if you can pragma on blank

    // view tables / schema
    // return {
    //     db,
    //     dispose: () => db.close(),
    // };

    connections.set(path, sqlFns);
};


module.exports = { useSQLDB };
