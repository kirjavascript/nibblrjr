const fs = require('fs');
const SQLiteDatabase = require('better-sqlite3');

const { createCommandDB } = require('./commands');
const { createServerDBFactory } = require('./server');

class Database {
    constructor(_parent) {

        // commands //

        this.commands = createCommandDB();

        // server data //

        this.createServerDB = createServerDBFactory(this);
    }

    createDB(name, schema) {
        const filename = __dirname + `/../storage/${name}.db`;
        fs.openSync(filename, 'a');
        const db = new SQLiteDatabase(filename);
        db.exec(schema);
        db.function('REGEXP', (a, b) => {
            return new RegExp(a, 'm').test(b) ? 1 : 0;
        });
        return db;
    }
};

module.exports = {
    Database,
};
