const SQLiteDatabase = require('better-sqlite3');
const { join } = require('path');
const { commandHash } = require('./commands');

// can load other databases in readonly mode
// write only in events

const useSQLDB = (path) => {
    const db = new SQLiteDatabase(join(__dirname, '../storage', path));
    db.pragma('max_page_count = 1000');
    db.pragma('page_size = 4096');

        db.exec(`

            CREATE TABLE IF NOT EXISTS foo (
                idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                message TEXT
            );
    `);
    // generate AST and validate
    // db.pragma('journal_mode = WAL');
    // TODO handle cleanup
    // check intransaction
    // have connection ppol, so only ever one connection
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
