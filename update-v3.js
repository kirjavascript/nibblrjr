const fs = require('fs');
const { join } = require('path');
const SQLiteDatabase = require('better-sqlite3');
const { commandHash } = require('./database/commands');
fs.rmSync(join(__dirname, 'cache/acquire'), { recursive: true, force: true });
const storagePath = join(__dirname, 'storage');
[
    'storage/server',
    'storage/namespace',
].forEach((dir) => {
    const path = join(__dirname, dir);
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
});
const memoDB = SQLiteDatabase(join(storagePath, 'namespace', commandHash('memo')));
const remindDB = SQLiteDatabase(join(storagePath, 'namespace', commandHash('remind')));

remindDB.exec(`
    DROP TABLE IF EXISTS remind;

    CREATE TABLE remind (
        key INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        "from" VARCHAR (100),
        "when" DATETIME,
        server TEXT,
        channel TEXT,
        message TEXT,
        time DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME')))
    );

    CREATE INDEX idx_from
    ON remind ('from', 'when');
`);

memoDB.exec(`
    DROP TABLE IF EXISTS memo;

    CREATE TABLE memo (
        key INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        "from" VARCHAR (100),
        "to" VARCHAR (100),
        server TEXT,
        channel TEXT,
        message TEXT,
        time DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME')))
    );

    CREATE INDEX idx_to
    ON memo ('to');
`);

fs.readdirSync(storagePath)
    .filter(file => file.endsWith('.db'))
    .map(file => {
        const path = join(storagePath, file);
        return [SQLiteDatabase(path), [file, path]];
    })
    .forEach(([db, [file, path]]) => {
        const events = db.prepare('SELECT * from events').all();
        const memo = events.filter(d => d.callback === 'memo.event');
        const remind = events.filter(d => d.callback === 'remind.event');
        // append
        const server = file.replace(/.db$/, '');
        const memoIn = memoDB.prepare('INSERT INTO memo ("from", "to", "server", "channel", "message", "time") VALUES (?,?,?,?,?,?)');

        memoDB.transaction((list) => {
            list.forEach(({ timestamp, init, user, target, message }) => {
                memoIn.run(user, target, server, null, message, init);
            });
        })(memo);

        // db.exec('DROP TABLE events');
        // fs.renameSync(path, join(storagePath, 'server', file);
    });
