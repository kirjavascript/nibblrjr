const webpack = require('webpack');
const path = require('path');

module.exports = (env={}, args={}) => {

    const config = {
        entry : {
            main: path.join(__dirname, './web/modules/main.js'),
        },
        output: {
            path:     path.join(__dirname, env.dev ? 'web/bundles' : 'web/static'),
            filename: '[name].js',
        },
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    '@babel/preset-env',
                                    '@babel/preset-react',
                                ],
                                plugins: [
                                    ['@babel/plugin-proposal-decorators', {
                                        legacy: true,
                                    }],
                                    ['@babel/plugin-proposal-class-properties', {
                                        loose: true,
                                    }],
                                ]
                            }
                        }
                    ],
                },
                {
                    test: /\.scss/,
                    use: [
                        { loader:'style-loader' },
                        { loader:'raw-loader' },
                        { loader:'sass-loader' },
                    ]
                },
            ],
        },
        plugins: [ ],
        resolve: {
            extensions: ['.js', '.json', '.jsx'],
            alias: {
                '#store': __dirname + '/web/modules/store',
            }
        },
        devtool: env.dev ? 'source-map' : false,
        performance: {
            hints: false,
        },
    };

    return config;

}
