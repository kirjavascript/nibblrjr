const fs = require('fs');
const sqlite3 = require('sqlite3');
const _dir = __dirname + '/../storage/';

class Database {
    constructor(nibblr) {

        // commands //

        this.commands = this.createDB('commands', `
            CREATE TABLE IF NOT EXISTS commands (
                name VARCHAR (100) PRIMARY KEY UNIQUE,
                command TEXT,
                locked BOOLEAN DEFAULT false
            );
        `);

        this.getCommand = (name) => {
            return new Promise((resolve, reject) => {
                this.commands.get(`
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

        // server data //

        this.createServerDB = (node) => {
            const name = node.address.replace(/[^a-zA-Z0-9.]/g, '');
            const db = this.createDB(name, `
                CREATE TABLE IF NOT EXISTS store (
                    idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                    namespace VARCHAR(100),
                    key VARCHAR(100),
                    value TEXT
                );
                CREATE TABLE IF NOT EXISTS events (
                    idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                    timestamp VARCHAR (20),
                    type VARCHAR (10),
                    user VARCHAR (20),
                    message TEXT,
                    target VARCHAR (20)
                );
                CREATE TABLE IF NOT EXISTS log (
                    idx INTEGER PRIMARY KEY AUTOINCREMENT,
                    time DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME'))),
                    user VARCHAR (100),
                    command VARCHAR (10),
                    target VARCHAR (100),
                    message TEXT
                );
            `);

            // logging

            const log = (message) => {
                const run = (data) => {
                    db.run(`
                        INSERT INTO log(user,command,target,message) VALUES (?,?,?,?)
                    `, data);
                };
                if ('JOIN PART NICK KICK KILL NOTICE MODE PRIVMSG QUIT TOPIC'.split(' ').includes(message.command)) {
                    if (message.command == 'QUIT') {
                        run([message.nick, message.command, '', args.join(' ')]);
                    }
                    // check if has a source and is  not PM
                    else if (message.nick && (message.args || [])[0] != node.nickname) {
                        run([
                            message.nick,
                            message.command,
                            message.args.length ? message.args[0] : '',
                            message.args.splice(1).join(' ')
                        ]);
                    }
                }
            };

            // key/value store

            const storeFactory = (namespace) => {
                const get = (key) => {
                    return new Promise((resolve, reject) => {
                        db.get(`
                            SELECT value FROM store WHERE namespace = ? AND key = ?
                        `, [namespace, key], (err, obj) => {
                            if (!err && typeof obj == 'object') {
                                resolve(obj.value);
                            }
                            else {
                                reject(err);
                            }
                        });
                    });
                };

                const set = (key, value) => {
                    db.get(`
                        SELECT idx FROM store WHERE namespace = ? AND key = ?
                    `, [namespace, key], (err, obj) => {
                        if (typeof obj == 'undefined') {
                            db.run(`
                                INSERT INTO store(value,namespace,key) VALUES (?,?,?)
                            `, [value, namespace, key]);
                        }
                        else {
                            db.run(`
                                UPDATE store SET value = ? WHERE namespace = ? AND key = ?
                            `, [value, namespace, key]);
                        }
                    });
                };

                // all
                // setObj
                // getObj

                return { get, set, namespace };
            };

            return {
                db,
                log,
                storeFactory,
            };
        };

    }

    createDB(name, schema) {
        fs.openSync(`${_dir}${name}.db`, 'a');
        const db = new sqlite3.Database(`${_dir}${name}.db`);
        schema
            .split(';')
            .filter(d => d.trim())
            .forEach(statement => {
                db.run(statement + ';');
            });
        return db;
    }
};

module.exports = {
    Database,
};
