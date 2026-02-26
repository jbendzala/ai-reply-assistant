const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the modules/ directory alongside the app
config.watchFolders = [monorepoRoot];

// When resolving deps of local modules, also look in app/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
