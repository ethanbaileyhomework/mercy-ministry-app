import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, './index.html'),
    path.join(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep warm charcoal — near-black with subtle warmth, won't read as brown
        navy: {
          DEFAULT: '#1C1917',
          50:  '#F5F4F3',
          100: '#E8E5E3',
          200: '#C9C4C1',
          300: '#A8A09C',
          400: '#6B6460',
          500: '#1C1917',
          600: '#171412',
          700: '#12100E',
          800: '#0D0B09',
          900: '#080605',
        },
        // Warm amber — from the "Daily" lettering in the logo
        gold: {
          DEFAULT: '#D4892A',
          50:  '#FDF4E7',
          100: '#FAE3C0',
          200: '#F5CB8A',
          300: '#EFB35A',
          400: '#E09B40',
          500: '#D4892A',
          600: '#B87424',
          700: '#9C601E',
          800: '#804D18',
          900: '#5C3810',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
