// The spike imports the web's published-map reader from ../src/features/routes/ (ADR 0008,
// commuter-app ticket 03) and @/shared/utils/geo it imports: Metro watches
// those folders. ponytail: two folders watched; a workspace package if 03 settles on one.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.join(root, 'src/features/routes'), path.join(root, 'src/shared/utils')];
// The shared files' one package, zod, comes from the app's own node_modules: the web's are
// outside what Metro watches.
config.resolver.extraNodeModules = { zod: path.join(__dirname, 'node_modules/zod') };

module.exports = config;
