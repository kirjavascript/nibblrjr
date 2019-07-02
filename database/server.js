function createServerDBFactory(database) {
    return (node) => {

        const name = node.address.replace(/[^a-zA-Z0-9.]/g, '');
        const db = database.createDB(name, `
            CREATE TABLE IF NOT EXISTS log (
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                time DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME'))),
                user VARCHAR (100),
                command VARCHAR (10),
                target VARCHAR (100),
                message TEXT
            );
            CREATE TABLE IF NOT EXISTS store (
                idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                namespace VARCHAR(100),
                key VARCHAR(100),
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS events (
                idx INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
                callback VARCHAR (100),
                type VARCHAR (10),
                timestamp DATETIME (20),
                init DATETIME (20),
                user VARCHAR (100),
                target VARCHAR (100),
                message TEXT
            );
        `);

        // logging

        const logQuery = db.prepare(`
            INSERT INTO log(user,command,target,message) VALUES (?,?,?,?)
        `);
        const log = (node, message) => {
            // this function is ugly af because it's legacy stuff from OG nibblr
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
                    (message.args || [])[0] != node.client.nick
                ) {
                    const hasMessage = !!message.args.length;
                    const text = hasMessage ? message.args.slice(1).join(' ') : '';
                    if (
                        node.get('logCommands', true)
                        || !text.startsWith(node.trigger)
                    ) {
                        logQuery.run([
                            message.nick,
                            message.command,
                            hasMessage ? message.args[0] : '',
                            text,
                        ]);
                    }
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
                return getGlobalQuery.all(`%${text}%`, limit, offset);
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
                callback,
                type,
                timestamp,
                init,
                user,
                target,
                message
            )
            VALUES (?,?,?,?,?,?,?)
        `);

        const eventFns = {};
        const speakElapsedQuery = db.prepare(`
            SELECT * FROM events
            WHERE timestamp < ?
            AND type = "speak"
            AND UPPER(target) = UPPER(?)
        `);
        eventFns.speakElapsed = (target) => {
            const obj = speakElapsedQuery.all((new Date()).toISOString(), target);
            return Array.isArray(obj) ? obj : [];
        };
        const tickElapsedQuery = db.prepare(`
            SELECT * FROM events
            WHERE timestamp < ?
            AND type = "tick"
        `);
        eventFns.tickElapsed = () => {
            const obj = tickElapsedQuery.all((new Date()).toISOString());
            return Array.isArray(obj) ? obj : [];
        };
        // getByCallback
        // unused
        // const tickPendingQuery = db.prepare(`
        //     SELECT * FROM events
        //     WHERE type = "tick"
        //     AND callback = ?
        // `);
        // eventFns.tickPending = (callback = '') => {
        //     const obj = tickPendingQuery.all(callback);
        //     return Array.isArray(obj) ? obj : [];
        // };
        // const speakPendingQuery = db.prepare(`
        //     SELECT * FROM events
        //     WHERE type = "speak"
        //     AND callback = ?
        // `);
        // eventFns.speakPending = (callback = '') => {
        //     const obj = speakPendingQuery.all(callback);
        //     return Array.isArray(obj) ? obj : [];
        // };
        const deleteQuery = db.prepare(`
            DELETE FROM events WHERE idx = ?
        `);
        eventFns.delete = (idx) => {
            return deleteQuery.run(idx);
        };

        const eventFactory = (msgData) => {
            const addEvent = (type, { callback, time = new Date(), message = '', target = '' }) => {
                if (String(message).length > 400) {
                    throw new Error('Store size limit is 400');
                }
                if (['speak', 'tick'].includes(type)) {
                    const fixedTarget = type == 'tick'
                        ? (msgData.isPM ? msgData.from : msgData.target)
                        : target;
                    return eventInsertQuery.run(
                        callback,
                        type,
                        time.toISOString(),
                        (new Date()).toISOString(),
                        msgData.from,
                        fixedTarget,
                        message,
                    );
                }
            };

            return { addEvent, ...eventFns };
        };

        // key/value store

        const getQuery = db.prepare(`
            SELECT value FROM store WHERE namespace = ? AND key = ?
        `);
        const setInsertQuery = db.prepare(`
            INSERT INTO store(value,namespace,key) VALUES (?,?,?)
        `);
        const setUpdateQuery = db.prepare(`
            UPDATE store SET value = ? WHERE namespace = ? AND key = ?
        `);
        const setDeleteQuery = db.prepare(`
            DELETE FROM store WHERE namespace = ? AND key = ?
        `);
        const clearQuery = db.prepare(`
            DELETE FROM store WHERE namespace = ?
        `);
        const allQuery = db.prepare(`
            SELECT key, value FROM store WHERE namespace = ?
        `);
        const storeFactory = (namespace) => {
            // get //
            const get = (key) => {
                const obj = getQuery.get(namespace, key);
                return !obj ? void 0 : String(obj.value);
            };
            // set //
            const set = (key, value) => {
                const hasData = typeof get(key) != 'undefined';
                // delete data
                if (Object.is(null, value) || typeof value == 'undefined') {
                    hasData && setDeleteQuery.run(namespace, key);
                }
                // update / add data
                else if (!hasData) {
                    if (String(value).length > 1048576) {
                        throw new Error('Store size limit is 1MB');
                    }
                    setInsertQuery.run(String(value), namespace, key);
                }
                else {
                    setUpdateQuery.run(String(value), namespace, key);
                }
            };
            // all //
            const all = () => {
                const obj = allQuery.all(namespace);
                return !Array.isArray(obj) ? [] : obj;
            };
            const clear = () => {
                clearQuery.run(namespace);
            };
            return { get, set, all, clear };
        };

        return { log, logFactory, storeFactory, eventFactory, eventFns };
    };
}

module.exports = {
    createServerDBFactory,
};
