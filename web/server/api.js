function msgHandler({parent, ws}) {
    let isAdmin = false;

    const apiData = {
        'AUTH': (obj) => {
            if ('password' in obj) {
                isAdmin = obj.password == parent.web.password;
                ws.sendObj('AUTH', {success: isAdmin});
            }
        },
        'COMMANDS': (obj) => {
            if ('getList' in obj) {
                parent.database.commands.list()
                    .then((list) => {
                        ws.sendObj('COMMANDS', {list});
                    })
                    .catch(() => {});
            }
            else if (typeof obj.getInfo == 'string') {
                parent.database.commands.get(obj.getInfo)
                    .then((info) => {
                        ws.sendObj('COMMANDS', { info });
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
