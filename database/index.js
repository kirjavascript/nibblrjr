const fs = require('fs');
const sqlite3 = require('sqlite3');
const _dir = __dirname + '/../storage/';

class Database {
    constructor(nibblr) {

        this.cmdDB = this.createDB('commands', `
            CREATE TABLE IF NOT EXISTS commands (
                name VARCHAR (100) PRIMARY KEY UNIQUE,
                command TEXT,
                locked BOOLEAN DEFAULT false
            );
        `);

        this.getCommand = (name) => {
            return new Promise((resolve, reject) => {
                this.cmdDB.get(`
                    SELECT command, locked FROM commands WHERE name = ?
                `, name, (err, obj) => {
                    if (err || typeof obj == 'undefined') {
                        reject(err);
                    }
                    else {
                        resolve(obj);
                    }
                });
            });
        };

        // .run(str, [params]);
        // .get / .all / .each

        // give each server a db
    }

    createDB(name, schema) {
        fs.openSync(`${_dir}${name}.db`, 'a');
        const db = new sqlite3.Database(`${_dir}${name}.db`);
        db.run(schema);
        return db;
    }
};

module.exports = {
    Database,
};
