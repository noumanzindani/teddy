module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@features': './src/features',
            '@navigation': './src/navigation',
            '@theme': './src/theme',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@mock': './src/mock-data',
            '@app-types': './src/types',
            '@utils': './src/utils',
            '@assets': './src/assets',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
