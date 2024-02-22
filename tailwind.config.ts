import type { Config } from 'tailwindcss'
import type { PluginAPI } from 'tailwindcss/types/config'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    colors: {
      // Default colors
      inherit: 'inherit',
      current: 'currentColor',
      transparent: 'transparent',
      black: '#000',
      white: '#fff',

      foreground: '#cccccc',
      iconForeground: '#c5c5c5',
      mainBackground: '#1e2227',
      toolbarHoverBackground: 'rgba(90, 93, 94, 0.31)',
    },

    lineHeight: {
      none: '1',
    },

    zIndex: {
      auto: 'auto',
      0: '0',
      1: '1',
      2: '2',
      3: '3',
      max: '2147483647',
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
  plugins: [
    function ({ addUtilities, matchUtilities }: PluginAPI) {
      addUtilities({
        // Flex
        '.flex-center': {
          display: 'flex',
          'justify-content': 'center',
          'align-items': 'center',
        },
        '.flex-justify': {
          display: 'flex',
          'justify-content': 'center',
        },
        '.flex-align': {
          display: 'flex',
          'align-items': 'center',
        },
        '.flex-between': {
          display: 'flex',
          'justify-content': 'space-between',
        },
        '.flex-column': {
          display: 'flex',
          'flex-direction': 'column',
        },

        '.outline-solid': {
          'outline-style': 'solid',
        },

        // Scrollbar
        '.scrollbar-none': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
        },

        // Leading trim simulate
        // text-box-trim: both;
        // https://caniuse.com/css-text-box-trim
        // (1lh - 1em) / 2 * -1
        '.leading-trim-both': {
          'margin-block': 'calc(0.5em - 0.5lh)',
        },
        '.leading-trim-start': {
          'margin-block-start': 'calc(0.5em - 0.5lh)',
        },
        '.leading-trim-end': {
          'margin-block-end': 'calc(0.5em - 0.5lh)',
        },

        // https://developer.mozilla.org/en-US/docs/Web/CSS/justify-content#safe
        '.justify-safe-center': {
          'justify-content': 'safe center',
        },
        '.justify-safe-start': {
          'justify-content': 'safe start',
        },
        '.justify-safe-end': {
          'justify-content': 'safe end',
        },
      })

      matchUtilities(
        {
          'webkit-scrollbar': value => ({
            '&::-webkit-scrollbar-button': {
              display: 'none',
            },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: '9999px',
            },
            '&::-webkit-scrollbar': {
              width: value,
              height: value,
              borderRadius: '9999px',
            },
          }),
        },
        {
          type: 'length',
          values: {
            DEFAULT: '4px',
            1: '4px',
            2: '8px',
          },
        }
      )

      matchUtilities(
        {
          'webkit-scrollbar': value => ({
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: value,
            },
          }),
        },
        { type: ['color', 'any'] }
      )

      // add margin to scrollbar
      // Notice: this will cause some side effects
      matchUtilities(
        {
          'webkit-scrollbar-m': value => ({
            '&::-webkit-scrollbar-track': {
              margin: value,
            },
          }),
          'webkit-scrollbar-mx': value => ({
            '&::-webkit-scrollbar-track': {
              'margin-left': value,
              'margin-right': value,
            },
          }),
          'webkit-scrollbar-my': value => ({
            '&::-webkit-scrollbar-track': {
              'margin-top': value,
              'margin-bottom': value,
            },
          }),
          'webkit-scrollbar-mt': value => ({
            '&::-webkit-scrollbar-track': {
              'margin-top': value,
            },
          }),
          'webkit-scrollbar-mb': value => ({
            '&::-webkit-scrollbar-track': {
              'margin-bottom': value,
            },
          }),
          'webkit-scrollbar-ml': value => ({
            '&::-webkit-scrollbar-track': {
              'margin-left': value,
            },
          }),
          'webkit-scrollbar-mr': value => ({
            '&::-webkit-scrollbar-track': {
              'margin-right': value,
            },
          }),
        },
        {
          type: 'length',
          values: {
            1: '4px',
            2: '8px',
            3: '12px',
          },
        }
      )
    },
  ],
} satisfies Config
