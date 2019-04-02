const { acquireFactory } = require('./acquire');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function extractRequires(input) {
    try {
        const ast = parse(input, {
            allowAwaitOutsideFunction: true,
        });
        const requires = [];
        traverse(ast, {
            enter(path) {
                if (path.isIdentifier({ name: 'require' })
                    && path.container
                    && path.container.type == 'CallExpression'
                    && path.container.arguments.length > 0) {
                    if (path.container.arguments[0].type == 'StringLiteral') {
                        requires.push(path.container.arguments[0].value);
                    } else {
                        throw new Error('first argument must be a string literal');
                    }
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
            err.name = 'require()';
            throw err;
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