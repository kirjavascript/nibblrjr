const { getAllCommands } = require('../database/commands');
getAllCommands()
    .forEach(command => {
        console.log(command.name);
    });
