const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Fix "Cannot use 'import.meta' outside a module" on Expo web.
// Metro bundles for the web in CommonJS mode, so ESM-only packages that
// use import.meta need to be transformed through Babel instead of being
// passed through verbatim.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
