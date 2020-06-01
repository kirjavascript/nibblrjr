const { watch } = require('chokidar');

// config.server[0].get('asd');

watch(__dirname + '/../config.json')
    .on('change', () => {
        console.log('change');
    });

// -> set a new root node / channel / server
