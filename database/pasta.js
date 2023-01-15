// check bytes
const fs = require('fs').promises;
const path = require('path');
const { commandHash } = require('../commands');

function getFilename(commandName, name) {
    const namespace = commandHash(commandName);
    const cleanName = commandHash(name);
    return path.join(__dirname, `../storage/pasta/${namespace}/${cleanName}`);
}

async function loadPasta(commandName, pastaName) {
    const filename = getFilename(commandName, pastaName);
    if (!await fs.exists(filename)) return;
    return await fs.readFile(filename, 'utf8');
}
async function savePasta(commandName, pastaName, content) {
    const filename = getFilename(commandName, pastaName);
    if (typeof content !== 'string') throw new Error('content must be a string');
    if (!content.length) throw new Error('string cannot be length zero');
    if (content.length > 1048576) throw new Error('paste size limit is 1MB');
    return await writeFile(filename);
}

module.exports = { loadPasta, savePasta };
