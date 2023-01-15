const { createCommandDB } = require('./commands');
const { createServerDB } = require('./server');
const { useSQLDB, waitSQLClose } = require('./sql');
const { loadPasta, savePasta } = require('./pasta');

class Database {
    constructor(parent) {
        this.commands = createCommandDB(parent);

        this.pasta = {
            load: loadPasta,
            save: savePasta,
        };

        // references to db runtime are stored here,
        // so flushing the require cache has no unintended consequences

        this.createServerDB = createServerDB;

        this.useSQLDB = namespace => useSQLDB(parent, namespace);
        this.waitSQLClose = waitSQLClose;
    }
};

module.exports = {
    Database,
};
