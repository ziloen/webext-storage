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
      'button.hover-background': '#4d5565',
      'editor.find-match-highlight-background': 'rgba(97, 153, 255, 0.18)',
      'scrollbar-slider.activeBackground': 'rgba(116, 125, 145, 0.5)',
      'scrollbar-slider.background': 'rgba(78, 86, 102, 0.38)',
      'scrollbar-slider.hover-background': 'rgba(90, 99, 117, 0.5)',
      'toolbar.hover-background': 'rgba(90, 93, 94, 0.31)',
      foreground: '#cccccc',
      'icon-foreground': '#c5c5c5',
      'main-background': '#1e2227',

      'added-foreground': '#81b88b',
      'modified-foreground': '#e2c08d',
      'deleted-foreground': '#c74e39',
      'ignored-foreground': '#636b78',
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
