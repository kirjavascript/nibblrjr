const fs = require('fs').promises;
const path = require('path');
const { commandHash } = require('./commands');

const exists = async (dir) => !!await fs.stat(dir).catch(_err => false);

function getFilename(commandName, name) {
    const namespace = commandHash(commandName);
    const cleanName = commandHash(name);
    return path.join(__dirname, `../storage/pasta/${namespace}/${cleanName}`);
}

function getDir(commandName) {
    return path.join(
        __dirname,
        `../storage/pasta/${commandHash(commandName)}`,
    );
}

async function dirSize(dir) {
    const stats = (await fs.readdir(dir)).map((file) =>
        fs.stat(path.join(dir, file)),
    );
    return (await Promise.all(stats)).reduce((acc, { size }) => acc + size, 0);
}

async function loadPasta(commandName, pastaName) {
    const filename = getFilename(commandName, pastaName);
    if (!(await exists(filename))) return;
    return await fs.readFile(filename, 'utf8');
}
async function savePasta(commandName, pastaName, content) {
    const dir = getDir(commandName);
    if (!await exists(dir)) {
        await fs.mkdir(dir);
    }
    if ((await dirSize(dir)) > 20971520)
        throw new Error('paste namespace limit is 20MB');
    const filename = getFilename(commandName, pastaName);
    if (typeof content !== 'string')
        throw new Error('content must be a string');
    if (!content.length) throw new Error('string cannot be length zero');
    if (content.length > 1048576) throw new Error('paste size limit is 1MB');
    await fs.writeFile(filename, content, 'utf8');
    const url = `/${encodeURIComponent(commandName)}/${encodeURIComponent(pastaName)}`;
    return {
        html: `/html${url}`,
        text: `/text${url}`,
    };
}

module.exports = { loadPasta, savePasta };
