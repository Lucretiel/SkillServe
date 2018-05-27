const webpack = require('webpack')
const path = require('path')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const dir = local => path.resolve(__dirname, local)
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
	context: dir("frontend-src"),
	entry: [
		...(isProd ? ['babel-polyfill'] : []),
		'main.jsx',
		'style.scss',
	],
	output: {
		path: dir("frontend-dist"),
		filename: 'bundle.js'
	},
	resolve: {
		modules: [
			dir("frontend-src"),
			"node_modules"
		],
	},
	plugins: [
		/*new BundleAnalyzerPlugin(),*/
	],
	module: {
		rules: [
			// Babelify everything
			{
				test: /\.jsx?$/,
				exclude: dir('node_modules'),
				use: [{
					loader: 'babel-loader',
					options: {
						presets: [
							'react',
							['env', {
								exclude: isProd ? [] : ['transform-regenerator'],
								modules: false,
							}],
						],
						plugins: [
							"transform-decorators-legacy",
							"transform-class-properties",
							"transform-object-rest-spread",
						],
					},
				}],
			}, {
				test: /\.scss$/,
				exclude: dir('node_modules'),
				use: [
					"style-loader",
					"css-loader",
					"sass-loader",
				]
			}
		],
	},
	devServer: {
		historyApiFallback: true,
	},
}
