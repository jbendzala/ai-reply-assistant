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

// npm workspaces hoists react and react-native to the monorepo root.
// Packages loaded from root node_modules (e.g. expo-modules-core) find that
// copy via hierarchical lookup, creating a second React instance that breaks
// hooks. Force every import of react/react-native — regardless of the
// importing file's location — to always resolve to the app's single copy.
const SINGLETON_MODULES = ['react', 'react-native', 'react-native-safe-area-context'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSingleton = SINGLETON_MODULES.some(
    (m) => moduleName === m || moduleName.startsWith(m + '/'),
  );
  if (isSingleton) {
    // Re-resolve the import as if it originated from inside the app directory.
    // This forces hierarchical lookup to find app/node_modules/react first.
    return context.resolveRequest(
      { ...context, originModulePath: __filename },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
