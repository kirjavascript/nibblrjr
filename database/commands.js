const { parseCommand } = require('../irc/evaluate/scripts/parse-command');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const reserved = require('../base/reserved');

function commandPath(name = '') {
    return path.join(__dirname, '../commands', name);
}

function commandHash(name) {
    const hash = crypto.createHmac('sha1', 'nibblr').update(name).digest('hex').slice(0,12);
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').slice(0,128);
    return `${clean}-${hash}`;
}

function getCommand(name) {
    const filename = commandPath(commandHash(name) + '.json');
    if (!fs.existsSync(filename)) return;
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function setCommand(obj) {
    const filename = commandPath(commandHash(obj.name) + '.json');
    fs.writeFileSync(filename, JSON.stringify(obj, null, 4), 'utf8');
}

function deleteCommand(name) {
    fs.unlinkSync(commandPath(commandHash(name) + '.json'));
}

function getAllCommands() {
    const commands = [];
    const commandList = fs.readdirSync(commandPath());
    for (let i = 0; i < commandList.length; i++) {
        const filename = commandPath(commandList[i]);
        commands.push(JSON.parse(fs.readFileSync(filename, 'utf8')));
    }
    return commands;
}

function createCommandDB({ reloadEvents }) {
    const get = (unsafeName) => {
        const name = unsafeName.replace(/\s+/g, '');
        const obj = getCommand(name);
        if (!obj) return;
        const { root } = parseCommand({ text: name });
        if (name == root) return obj;
        const parent = getCommand(root);
        if (!parent) return obj;
        return {
            ...parent,
            name,
            command: obj.command,
        };
    };

    const set = (name, value) => {
        const safeName = name.replace(/\s+/g, '');
        const options = getCommand(safeName) || {
            event: false,
            locked: false, // setting these is really optional
            starred: false,
        };
        setCommand({
            ...options,
            name: safeName,
            command: value || '',
        });
        reloadEvents();
    };

    const setConfig = (name, config) => {
        // only operates on the parent (if it exists)
        const { root } = parseCommand({ text: name })
        const parent = getCommand(root);
        const realName = parent ? root : name;
        const obj = getCommand(realName);
        setCommand(Object.assign(obj, config));
        reloadEvents();
    };

    const _new = (unsafeName, isAdmin) => {
        const name = unsafeName.replace(/\s+/g, '');
        const exists = !!get(name);
        const parentCmdName = parseCommand({text: name}).root;
        const parentCmd = get(parentCmdName);
        const locked = parentCmd && parentCmd.locked;
        const isReserved = reserved.includes(name);
        if (!isReserved && !exists && (!locked || isAdmin)) {
            set(name, '');
            return true;
        }
        return false;
    };

    // public API

    const list = () => {
        return getAllCommands().map(cmd => {
            delete cmd.command;
            const { root } = parseCommand({ text: cmd.name });
            if (cmd.name == root) return cmd;
            const parent = getCommand(root);
            if (!parent) return cmd;
            const obj = {
                ...parent,
                name: cmd.name
            };
            delete obj.command;
            return obj;
        });
    };

    const names = () => {
        return getAllCommands().map(cmd => cmd.name);
    };

    const count = () => {
        return fs.readdirSync(commandPath()).length;
    };

    const setSafe = (name, value) => {
        const obj = get(name);
        const isReserved = reserved.includes(name);
        const parentCmdName = parseCommand({text: name}).root;
        const parentCmd = get(parentCmdName);
        if (
            obj && obj.locked
            || isReserved
            || !obj && parentCmd && parentCmd.locked
        ) {
            return false;
        }
        else {
            set(name, value);
            return true;
        }
    };

    const deleteSafe = (name) => {
        const obj = get(name);
        if (obj && obj.locked) {
            return false;
        } else {
            deleteCommand(name);
            return true;
        }
    };

    const fns = {
        get,
        list,
        names,
        count,
        setSafe,
        deleteSafe,
    };

    return {
        get,
        set,
        new: _new,
        delete: deleteCommand,
        count,
        list,
        setConfig,
        fns,
    };
}

module.exports = {
    createCommandDB,
    commandHash,
    getAllCommands,
    getCommand,
    setCommand,
    deleteCommand,
};
