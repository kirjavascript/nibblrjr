const webpack = require('webpack');

module.exports = (env={}, args={}) => {

    let config = {
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
                                    'stage-0'
                                ],
                                plugins: [
                                    'transform-react-jsx',
                                ]
                            }
                        }
                    ]
                },
            ],
        },
        plugins: [
        ],
        resolve: {
            extensions: ['.js', '.json', '.jsx'],
            alias: {
                // '#store': __dirname + '/../modules/store',
            }

        },
    };

    return config;

}
