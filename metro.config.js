const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    './src',
    './android',
    './ios',
    './node_modules',
    './.vscode',
    './.yarn',
  ],

  watchman: true,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
