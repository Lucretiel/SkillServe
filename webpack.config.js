const path = require('path')
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin')

const dir = local => path.resolve(__dirname, local)
const isProd = process.env.NODE_ENV === 'production'
const ifProd = thing => isProd ? thing : null
const filtered = array => array.filter(el => el)

module.exports = {
	context: dir("frontend2"),
	entry: filtered([
		ifProd('babel-polyfill'),
		ifProd('whatwg-fetch'),
		'main.jsx',
	]),
	output: {
		path: dir("frontend-dist/webpack"),
		filename: 'bundle.js',
	},
	resolve: {
		modules: [
			dir("frontend2"),
			"node_modules",
		],
	},
	plugins: [
		//new LodashModuleReplacementPlugin(),
	],
	module: {
		rules: [{
			// Babelify everything
			test: /\.jsx?$/,
			exclude: dir('node_modules'),
			use: [{
				loader: 'babel-loader',
				options: {
					presets: [
						'react',
						'env',
					],
					plugins: [
						'lodash',
						"transform-class-properties",
						"transform-object-rest-spread",
						"transform-strict-mode",
					],
				},
			}],
		}],
	},
}
