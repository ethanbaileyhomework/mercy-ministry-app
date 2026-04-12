/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B3A5C',
          50: '#E8EDF2',
          100: '#C5D3E3',
          200: '#9AB3CD',
          300: '#6F93B7',
          400: '#4473A1',
          500: '#1B3A5C',
          600: '#163050',
          700: '#112644',
          800: '#0D1D38',
          900: '#08132C',
        },
        gold: {
          DEFAULT: '#C9A84C',
          50: '#FBF6E9',
          100: '#F5E9C8',
          200: '#EDD89F',
          300: '#E5C776',
          400: '#D4B45E',
          500: '#C9A84C',
          600: '#B59340',
          700: '#9A7E35',
          800: '#7F682A',
          900: '#5C4D23',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'kiosk-body': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px min
        'kiosk-lg': ['1.5rem', { lineHeight: '2rem' }],          // 24px
        'kiosk-xl': ['1.75rem', { lineHeight: '2.25rem' }],      // 28px
        'kiosk-2xl': ['2.25rem', { lineHeight: '2.75rem' }],     // 36px
        'kiosk-3xl': ['3rem', { lineHeight: '3.5rem' }],         // 48px
      },
    },
  },
  plugins: [],
};
