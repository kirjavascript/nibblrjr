const { acquireFactory } = require('./acquire');

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

async function createRequireModules(input) {
    const ast = parse(input, {
        allowAwaitOutsideFunction: true,
    });
    const requires = [];
    traverse(ast, {
        enter(path) {
            if (path.isIdentifier({ name: 'require' })
                && path.container.type == 'CallExpression'
                && path.container.arguments[0].type == 'StringLiteral') {
                requires.push(path.container.arguments[0].value);
            }
        }
    });

    const result = await Promise.all(
        requires.map(req => acquireFactory(req, source => source))
    );

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


module.exports = {
    createRequireModules,
};
