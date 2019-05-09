function parseCommand({ trigger = '', text }) {
    const command = text.slice(trigger.length).match(/(^\S*\((.*?)\)|^\S*)/);
    const input = text.slice(trigger.length + command[1].length + 1);
    const params = command[2];
    const paramList = params ? params.split(',') : [];
    const commandPath = command[1].slice(0, command[1].length - (typeof params != 'undefined' ? params.length + 2 : 0));
    const commandList = commandPath.split('.');

    return {
        path: commandPath,
        list: commandList,
        params: paramList,
        input,
    };
}

module.exports = {
    parseCommand,
};
