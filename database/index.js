const fs = require('fs');
const SQLiteDatabase = require('better-sqlite3');
const _dir = __dirname + '/../storage/';

const { createCommandDB } = require('./commands');
const { createServerDBFactory } = require('./server');

class Database {
    constructor(parent) {

        // commands //

        this.commands = createCommandDB(this);

        // server data //

        this.createServerDB = createServerDBFactory(this);
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
