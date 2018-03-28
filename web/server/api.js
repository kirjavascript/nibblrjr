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
                const list = parent.database.commands.list();
                ws.sendObj('COMMANDS', {list});
            }
            else if ('getInfo' in obj) {
                const info = parent.database.commands.get(obj.getInfo)
                ws.sendObj('COMMANDS', { info });
            }
            else if ('setCommand' in obj) {
                // TODO: isAdmin
                const { name, commandData } = obj.setCommand;
                parent.database.commands.set(name, commandData);
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
