const { getAllCommands } = require('../database/commands');
getAllCommands()
    .forEach(({ name, locked, starred }) => {
        console.log(
            `${name.padEnd(20)} ${starred ? '★' : ' '} ${locked ? '🔒' : ''}`
        );
    });
