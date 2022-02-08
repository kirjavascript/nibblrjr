const fs = require('fs');
const SQLiteDatabase = require('better-sqlite3');

const { createCommandDB } = require('./commands');
const { createServerDB } = require('./server');
const { useSQLDB, waitSQLClose } = require('./sql');

class Database {
    constructor(parent) {
        this.commands = createCommandDB(parent);

        this.createServerDB = createServerDB;

        this.useSQLDB = namespace => useSQLDB(parent, namespace);
        this.waitSQLClose = waitSQLClose;
    }

    createDB(name, schema) {
        const filename = __dirname + `/../storage/server/${name}.db`;
        fs.openSync(filename, 'a');
        const db = new SQLiteDatabase(filename);
        db.pragma('journal_mode = WAL'); // only one connection at a time is made
        db.exec(schema);
        db.function('REGEXP', (a, b) => new RegExp(a, 'm').test(b) ? 1 : 0);
        return db;
    }
};

module.exports = {
    Database,
};
