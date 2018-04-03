const webpack = require('webpack');

module.exports = (env={}, args={}) => {

    const config = {
        entry : {
            root: __dirname + '/web/modules/root.js',
        },
        output: {
            path: __dirname  + '/web/bundles',
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
                                    'es2015',
                                    'stage-0',
                                ],
                                plugins: [
                                    'transform-react-jsx',
                                    'transform-decorators-legacy',
                                ]
                            }
                        }
                    ]
                },
                {
                    test: /\.scss/,
                    use: [
                        { loader:'style-loader' },
                        { loader:'raw-loader' },
                        { loader:'sass-loader' },
                        { loader:'import-glob-loader' },
                    ]
                },
            ],
        },
        plugins: [
        ],
        resolve: {
            extensions: ['.js', '.json', '.jsx'],
            alias: {
                '#store': __dirname + '/web/modules/store',
            }
        },
        devtool: env.dev ? 'source-map' : false,
    };

    return config;

}
