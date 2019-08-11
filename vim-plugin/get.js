const fs = require('fs');
const { getCommand } = require('../database/commands');
const stdin = fs.readFileSync(0, 'utf-8').toString();

const command = getCommand(stdin);
if (command) {
    console.log(command.command);
} else {
    console.error(`// missing command ${stdin}`);
}
