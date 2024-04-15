import { defineConfig, pluginCreator, preset } from '@ziloen/tailwind-config'

export default defineConfig({
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    ...preset.theme,
    colors: {
      // Default colors
      inherit: 'inherit',
      current: 'currentColor',
      transparent: 'transparent',
      black: '#000',
      white: '#fff',

      'button.background': '#404754',
      'button.hoverBackground': '#4d5565',
      'editor.findMatchHighlightBackground': 'rgba(97, 153, 255, 0.18)',
      'scrollbarSlider.activeBackground': 'rgba(116, 125, 145, 0.5)',
      'scrollbarSlider.background': 'rgba(78, 86, 102, 0.38)',
      'scrollbarSlider.hoverBackground': 'rgba(90, 99, 117, 0.5)',
      'toolbar.hoverBackground': 'rgba(90, 93, 94, 0.31)',
      foreground: '#cccccc',
      iconForeground: '#c5c5c5',
      mainBackground: '#1e2227',

      addedForeground: '#81b88b',
      modifiedForeground: '#e2c08d',
      deletedForeground: '#c74e39',
      ignoredForeground: '#636b78',
    },

    extend: {
      fontFamily: {
        mono: [
          'Fira Code Variable',
          'ui-monospace',
          'Cascadia Code',
          'Source Code Pro',
          'Menlo',
          'Consolas',
          'DejaVu Sans Mono',
          'monospace',
        ],
      },
    },
  },
  experimental: {
    // Remove unused global css variables, e.g. --tw-translate-x: 0;
    optimizeUniversalDefaults: true,
    // matchVariant: true,
  },
  // https://tailwindcss.com/docs/theme#configuration-reference
  // https://github.com/tailwindlabs/tailwindcss/blob/master/src/corePlugins.js
  corePlugins: {},
  plugins: [pluginCreator],
})
