const { parseCommand } = require('../../irc/parse-command');

function msgHandler({parent, ws}) {
    let isAdmin = false;

    const sendList = () => {
        const list = parent.database.commands.list();
        ws.sendObj('COMMANDS', {list});
    };

    const apiData = {
        'AUTH': (obj) => {
            if ('password' in obj) {
                isAdmin = obj.password == parent.web.password;
                if (isAdmin) {
                    ws.sendObj('AUTH', {success: true});
                }
            }
        },
        'COMMANDS': (obj) => {
            if ('getList' in obj) {
                sendList();
            }
            else if ('getCommand' in obj) {
                const info = parent.database.commands.get(obj.getCommand)
                ws.sendObj('COMMANDS', { info });
            }
            else if ('setCommand' in obj) {
                const { name, commandData } = obj.setCommand;
                const info = parent.database.commands.get(name);
                if (info && (!info.locked || isAdmin)) {
                    parent.database.commands.set(name, commandData);
                }
            }
            else if ('deleteCommand' in obj) {
                const info = parent.database.commands.get(obj.deleteCommand);
                if (info && (!info.locked || isAdmin)) {
                    parent.database.commands.delete(obj.deleteCommand);
                }
                sendList();
            }
            else if ('setConfig' in obj) {
                if (isAdmin) {
                    const { name, config } = obj.setConfig;
                    parent.database.commands.setConfig(name, config);
                    const info = parent.database.commands.get(name);
                    ws.sendObj('COMMANDS', { config: {
                        starred: info.starred,
                        locked: info.locked,
                    }});
                    sendList();
                }
            }
            else if ('newCommand' in obj) {
                const name = obj.newCommand.replace(/\s+/g, '');
                const exists = !!parent.database.commands.get(name);
                const parentCmdName = parseCommand({text: name}).list[0];
                const parentCmd = parent.database.commands.get(parentCmdName);
                const locked = parentCmd && parentCmd.locked;
                const isEval = ['>', '#'].includes(name);
                if (!isEval && !exists && (!locked || isAdmin)) {
                    parent.database.commands.set(name, '');
                    sendList();
                }
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
