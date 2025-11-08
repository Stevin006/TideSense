// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add video file extensions to asset types
config.resolver.assetExts.push('glb', 'gltf', 'mp4', 'mov', 'avi');

module.exports = config;
