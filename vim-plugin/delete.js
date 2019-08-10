const fs = require('fs');
const { getCommand, deleteCommand } = require('../database/commands');
const stdin = fs.readFileSync(0, 'utf-8').toString();

const { name, locked } = getCommand(stdin);
// if (locked) {
//     console.error(`${name} is locked`);
//     process.exit(1);
// } else {
    deleteCommand(name);
// }
