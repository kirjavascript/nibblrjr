const fs = require('fs').promises;
const path = require('path');
const { commandHash } = require('./commands');

function getFilename(commandName, name) {
    const namespace = commandHash(commandName);
    const cleanName = commandHash(name);
    return path.join(__dirname, `../storage/pasta/${namespace}/${cleanName}`);
}

async function dirSize(commandName) {
    const dir = path.join(
        __dirname,
        `../storage/pasta/${commandHash(commandName)}`,
    );
    const stats = (await readdir(dir)).map((file) =>
        fs.stat(path.join(dir, file)),
    );
    return (await Promise.all(stats)).reduce((acc, { size }) => acc + size, 0);
}

async function loadPasta(commandName, pastaName) {
    const filename = getFilename(commandName, pastaName);
    if (!(await fs.access(filename))) return;
    return await fs.readFile(filename, 'utf8');
}
async function savePasta(commandName, pastaName, content) {
    if ((await dirSize(commandName)) > 20971520)
        throw new Error('paste namespace limit is 20MB');
    const filename = getFilename(commandName, pastaName);
    if (typeof content !== 'string')
        throw new Error('content must be a string');
    if (!content.length) throw new Error('string cannot be length zero');
    if (content.length > 1048576) throw new Error('paste size limit is 1MB');
    await fs.writeFile(filename, content, 'utf8');
    const url = `/${commandName}/${pastaName}`;
    return {
        html: `/html${url}`,
        text: `/text${url}`,
    };
}

module.exports = { loadPasta, savePasta };
