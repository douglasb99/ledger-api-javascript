module.exports = [
    {
    mode: 'development',
    entry: './src/fetchai/ledger/index.js',
    node: {
        fs: 'empty',
    },
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js']
    },
    output: {
        path: __dirname + '/bundle',
        publicPath: '/',
        filename: 'bundle.js',
        library: 'fetchai',
        libraryTarget: 'umd',
        globalObject: 'this'
    },
    devServer: {
        contentBase: './bundle'
    }
},
  {
    mode: 'development',
    entry: './src/fetchai/ledger/index.js',
    node: {
        fs: 'empty',
    },
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js']
    },
    output: {
        path: __dirname + '/bundle',
        publicPath: '/',
        filename: 'vanilla.js',
         library: 'fetchai',
      libraryTarget: 'var'
    },
    devServer: {
        contentBase: './bundle'
    }
}
];
