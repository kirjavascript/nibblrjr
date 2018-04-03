
function createServerDBFactory(database) {
    return (node) => {

        const name = node.address.replace(/[^a-zA-Z0-9.]/g, '');
        const db = database.createDB(name, `
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

        db.register(function REGEXP(a, b) {
            return new RegExp(a, 'm').test(b) ? 1 : 0;
        });

        // logging

        const logQuery = db.prepare(`
            INSERT INTO log(user,command,target,message) VALUES (?,?,?,?)
        `);
        const log = (message) => {
            const commands = ['JOIN', 'PART', 'NICK', 'KICK', 'KILL', 'NOTICE', 'MODE', 'PRIVMSG', 'QUIT', 'TOPIC'];
            if (commands.includes(message.command)) {
                if (message.command == 'QUIT') {
                    logQuery.run([
                        message.nick,
                        message.command,
                        '',
                        message.args.join(' '),
                    ]);
                }
                // check if has a source and is  not PM
                else if (
                    message.nick &&
                    (message.args || [])[0] != node.nickname
                ) {
                    logQuery.run([
                        message.nick,
                        message.command,
                        message.args.length ? message.args[0] : '',
                        message.args.splice(1).join(' '),
                    ]);
                }
            }
        };
        const logFactory = (target) => {
            const randomQuery = db.prepare(`
                SELECT * FROM log
                WHERE command = 'PRIVMSG' AND target = ?
                ORDER BY RANDOM() LIMIT ?
            `);
            const random = (qty = 1) => {
                return randomQuery.all(target, qty);
            };
            const getQuery = db.prepare(`
                SELECT * FROM log
                WHERE message LIKE ? AND target = ?
                ORDER BY idx DESC LIMIT ? OFFSET ?
            `);
            const get = (text, limit = 1, offset = 0) => {
                return getQuery.all(`%${text}%`, target, limit, offset);
            };
            const getGlobalQuery = db.prepare(`
                SELECT * FROM log
                WHERE message LIKE ?
                ORDER BY idx DESC LIMIT ? OFFSET ?
            `);
            const getGlobal = (text, limit = 1, offset = 0) => {
                return getQuery.all(`%${text}%`, limit, offset);
            };
            const userQuery = db.prepare(`
                SELECT * FROM log
                WHERE lower(user) = lower(?) AND message LIKE ?
                ORDER BY idx DESC LIMIT ? OFFSET ?
            `);
            const user = (name, text = '', limit = 1, offset = 0) => {
                return userQuery.all(name, `%${text}%`, limit, offset);
            }
            const countQuery = db.prepare(`
                SELECT count(idx) FROM log
                WHERE message LIKE ?
            `);
            const count = (text) => {
                return countQuery.get(`%${text}%`)['count(idx)'];
            };
            const regexQuery = db.prepare(`
                SELECT * FROM log
                WHERE message REGEXP ? AND target = ?
                ORDER BY idx DESC LIMIT ? OFFSET ?
            `);
            const regex = (rgx, limit = 1, offset = 0) => {
                return regexQuery.all(rgx, target, limit, offset);
            };
            return { get, getGlobal, count, user, random, regex };
        };

        // events

        const eventInsertQuery = db.prepare(`
            INSERT INTO events (
                timestamp,
                type,
                user,
                target,
                message
            )
            VALUES (?,?,?,?,?)
        `);
        const eventInsert = (date, type, user, target, message) => {
            eventInsertQuery(date.toISOString(), type.toUpperCase(), user, target, message);
        };

        // key/value store

        const storeFactory = (namespace) => {

            // get //
            const getQuery = db.prepare(`
                SELECT value FROM store WHERE namespace = ? AND key = ?
            `);
            const get = (key) => {
                const obj = getQuery.get(namespace, key);
                return !obj ? void 0 : String(obj.value);
            };

            // set //
            const setInsertQuery = db.prepare(`
                INSERT INTO store(value,namespace,key) VALUES (?,?,?)
            `);
            const setUpdateQuery = db.prepare(`
                UPDATE store SET value = ? WHERE namespace = ? AND key = ?
            `);
            const setDeleteQuery = db.prepare(`
                DELETE FROM store WHERE namespace = ? AND key = ?
            `);
            const set = (key, value) => {
                const hasData = typeof get(key) != 'undefined';
                // delete data
                if (Object.is(null, value) || typeof value == 'undefined') {
                    hasData && setDeleteQuery.run(namespace, key);
                }
                // update / add data
                else if (!hasData) {
                    setInsertQuery.run(String(value), namespace, key);
                }
                else {
                    setUpdateQuery.run(String(value), namespace, key);
                }
            };

            // all //
            const allQuery = db.prepare(`
                SELECT key, value FROM store WHERE namespace = ?
            `);
            const all = () => {
                const obj = allQuery.all(namespace);
                return !Array.isArray(obj) ? [] : obj;
            };

            return { get, set, all, namespace };
        };

        return { log, logFactory, storeFactory };
    };
}

module.exports = {
    createServerDBFactory,
};
