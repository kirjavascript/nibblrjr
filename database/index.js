const fs = require('fs');
const SQLiteDatabase = require('better-sqlite3');

const { createCommandDB } = require('./commands');
const { createServerDBFactory } = require('./server');
const dateFns = require('date-fns');

class Database {
    constructor(parent) {

        // commands //

        this.commands = createCommandDB();

        // server data //

        this.createServerDB = createServerDBFactory(this);
    }

    createDB(name, schema) {
        const storageDir = __dirname + '/../storage';
        if (!fs.existsSync(storageDir)){
            fs.mkdirSync(storageDir);
        }
        const filename = `${storageDir}/${name}.db`;
        fs.openSync(filename, 'a');
        const db = new SQLiteDatabase(filename);
        db.exec(schema);
        db.register(function REGEXP(a, b) {
            return new RegExp(a, 'm').test(b) ? 1 : 0;
        });
        return db;
    }
};

module.exports = {
    Database,
};
