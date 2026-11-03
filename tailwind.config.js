/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // iOS system colors (light variants; dark variants come from the --vc-* tokens)
        ios: {
          blue: '#007aff',
          red: '#ff3b30',
          orange: '#ff9500',
          yellow: '#ffcc00',
          green: '#34c759',
          teal: '#30b0c7',
          indigo: '#5856d6',
          purple: '#af52de',
          pink: '#ff2d55',
          gray: '#8e8e93'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'system-ui', '"Helvetica Neue"', 'Arial', 'sans-serif']
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.04)',
        lift: '0 10px 30px rgb(0 0 0 / 0.14)'
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        shimmer: 'shimmer 1.6s linear infinite'
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
}
