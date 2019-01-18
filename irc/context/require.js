const { acquireFactory } = require('./acquire');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

        // TODO: validation / require() alone
        // TODO: mock fs

function extractRequires(source) {
    const ast = parse(input, {
        allowAwaitOutsideFunction: true,
    });
    const requires = [];
    try {
        traverse(ast, {
            enter(path) {
                if (path.isIdentifier({ name: 'require' })
                    && path.container.type == 'CallExpression'
                    && path.container.arguments[0].type == 'StringLiteral') { // TODO:
                    requires.push(path.container.arguments[0].value);
                }
            }
        });
        return [undefined, requires];
    } catch (e) {
        return [e];
    }
}

async function createRequireModules(input) {
    const [err, requires] = extractRequires(input);

    if (err) {
        return () => () => {
            throw new Error('issues parsing require calls: ' + err.message);
        };
    } else {
        const result = await Promise.all(
            requires.map(req => acquireFactory(req, source => source))
        );

        // following function is run in the sandbox context
        return () => {
            const modules = {};
            requires.map((name, i) => [name, result[i]])
                .forEach(([name, source]) => {
                    modules[name] = new Function(`
                        const self = {};
                        ${source}
                        return self.__acquire__;
                    `)()
                });
            return (name) => modules[name];
        };
    }
}


module.exports = {
    createRequireModules,
};
