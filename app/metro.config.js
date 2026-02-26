const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the modules/ directory alongside the app
config.watchFolders = [monorepoRoot];

// When resolving deps of local modules, look in app/node_modules first,
// then fall back to the monorepo root node_modules (where npm workspaces
// hoists shared packages like react-native, expo-modules-core, etc.)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
