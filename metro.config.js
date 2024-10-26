const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 */
const config = {
  watchFolders: [
    './src',
    './android',
    './node_modules',
    './.vscode',
    './.yarn',
  ],
  resolver: {
    blockList: [/ios\/.*/],
  },
  watchman: {
    ignoreDirs: ['ios'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
