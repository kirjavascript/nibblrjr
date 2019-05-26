// used to migrate v3.0 -> v3.1 DB commands

const SQLiteDatabase = require('better-sqlite3');
const fs = require('fs');
const { commandHash } = require('./database/commands');

const filename = __dirname + `/storage/commands.db`;
fs.openSync(filename, 'r');
const db = new SQLiteDatabase(filename);
const list = db.prepare(`
    select * from commands
`).all();

const dir = `${__dirname}/commands`;

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

list.forEach(command => {
    const filename = commandHash(command.name);
    command.locked = command.locked === 'true';
    command.starred = command.starred === 'true';
    fs.writeFileSync(`${__dirname}/commands/${filename}.json`, JSON.stringify(command, null, 4));
});
