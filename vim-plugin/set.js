const fs = require('fs');
const { getCommand, setCommand } = require('../database/commands');
const stdin = fs.readFileSync(0, 'utf-8').toString();
const idx = stdin.indexOf(' ');
const [name, script] = [stdin.slice(0, idx), stdin.slice(idx + 1)];

const command = getCommand(name);
command.command = script;
setCommand(command);
console.log(`Saved ${command.name}`)
