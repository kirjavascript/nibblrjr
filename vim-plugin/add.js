const fs = require('fs');
const { getCommand, setCommand } = require('../database/commands');
const name = fs.readFileSync(0, 'utf-8').toString();

const command = getCommand(name);
if (command) {
    console.error('command already exists');
    process.exit(1);
} else {
    const data = {
        name,
        command: '',
    };
    setCommand(data);
    console.log(`added ${name}`);
}
