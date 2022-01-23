const SQLiteDatabase = require('better-sqlite3');
const { join } = require('path');
const { commandHash } = require('./commands');

// can load other databases in readonly mode
// write only in events

// parse to AST, validate.

// have a connection pool
// handle nsting
yeah that's huge. I guess nestris is a simple game when it comes down to it and needs minimal process


const useSQLDB = (path) => {
    const db = new SQLiteDatabase(join(__dirname, '../storage', path));
    db.pragma('max_page_count = 1000');
    db.pragma('page_size = 4096');
    db.pragma('journal_mode = WAL');

    db.exec(`

            CREATE TABLE IF NOT EXISTS foo (
                idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                message TEXT
            );
    `);
    // enable WAL on normal DBs
    // generate AST and validate
    // TODO handle cleanup
    // check intransaction
    // have connection pool, so only ever one connection
    // pollClose()
    // check if you can pragma on blank

    // view tables / schema
    return {
        db,
        dispose: () => db.close(),
    };
};


const test = useSQLDB('test.db');

// console.log(test.db.pragma('pragma_list'))
console.log(test.db.pragma('max_page_count'))
console.log(test.db.exec('SELECT 1;PRAGMA max_page_count = 10'))
console.log(test.db.pragma('max_page_count'))

module.exports = {};
