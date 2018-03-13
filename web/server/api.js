function msgHandler({parent, ws}) {

    // isAdmin

    const apiData = {
        'COMMANDS': (obj) => {
            if (obj.list) {
                parent.database.commands.list()
                    .then((list) => {
                        ws.sendObj('COMMANDS', {list});
                    })
                    .catch(() => {});
            }
        },
    };

    return (_type, obj) => {
        apiData[_type] &&
        apiData[_type](obj);
    };
}

module.exports = {
    msgHandler,
};
