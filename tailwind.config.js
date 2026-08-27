/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // "Break Free" green. Used for every primary action, streak figure and
        // accent in place of the old blue.
        brand: {
          50: '#F1F8F3',
          100: '#DDEEE3',
          200: '#BBDCC8',
          300: '#8FC4A5',
          400: '#5CA77E',
          500: '#348A5E',
          600: '#1F7049',
          700: '#19583B',
          800: '#164732',
          900: '#133A2A',
          950: '#082016',
        },
        // Warm, faintly green neutrals. Replaces Tailwind's blue-grey `gray`
        // so surfaces sit next to the brand colour without going cold.
        sage: {
          50: '#F6F8F5',
          100: '#ECF0EA',
          200: '#DCE3D9',
          300: '#C2CDBE',
          400: '#97A493',
          500: '#6F7C6C',
          600: '#566253',
          700: '#414B3F',
          800: '#232E26',
          900: '#151D18',
          950: '#0B120E',
        },
        // The dark chrome: sidebar, hero card, craving screen.
        forest: {
          400: '#2E6B49',
          500: '#245539',
          600: '#1B402C',
          700: '#152F21',
          800: '#0F231A',
          900: '#0A1712',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(21, 41, 30, 0.04), 0 8px 24px -12px rgba(21, 41, 30, 0.12)',
        'card-hover': '0 2px 4px rgba(21, 41, 30, 0.06), 0 16px 32px -16px rgba(21, 41, 30, 0.2)',
      },
      gridTemplateColumns: {
        // The check-in trend draws a fortnight, one column per day.
        '14': 'repeat(14, minmax(0, 1fr))',
      },
      spacing: {
        'safe': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      padding: {
        'safe': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};