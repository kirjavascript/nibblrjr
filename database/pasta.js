const fs = require('fs').promises;
const path = require('path');
const { commandHash } = require('./commands');

function getFilename(commandName, name) {
    const namespace = commandHash(commandName);
    const cleanName = commandHash(name);
    return path.join(__dirname, `../storage/pasta/${namespace}/${cleanName}`);
}

async function loadPasta(commandName, pastaName) {
    const filename = getFilename(commandName, pastaName);
    if (!await fs.access(filename)) return;
    return await fs.readFile(filename, 'utf8');
}
async function savePasta(commandName, pastaName, content) {
// TODO: https://stackoverflow.com/questions/30448002/how-to-get-directory-size-in-node-js-without-recursively-going-through-directory
    throw new Error('asd');

    const filename = getFilename(commandName, pastaName);
    if (typeof content !== 'string') throw new Error('content must be a string');
    if (!content.length) throw new Error('string cannot be length zero');
    if (content.length > 1048576) throw new Error('paste size limit is 1MB');
    return await fs.writeFile(filename, content, 'utf8');
}

module.exports = { loadPasta, savePasta };
