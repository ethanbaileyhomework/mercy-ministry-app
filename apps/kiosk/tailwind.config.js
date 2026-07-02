import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, './index.html'),
    path.join(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
  ],
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
      fontSize: {
        'kiosk-body': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px min
        'kiosk-lg': ['1.5rem', { lineHeight: '2rem' }],          // 24px
        'kiosk-xl': ['1.75rem', { lineHeight: '2.25rem' }],      // 28px
        'kiosk-2xl': ['2.25rem', { lineHeight: '2.75rem' }],     // 36px
        'kiosk-3xl': ['3rem', { lineHeight: '3.5rem' }],         // 48px
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '80%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseOnce: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'pulse-once': 'pulseOnce 1s ease-in-out',
      },
    },
  },
  plugins: [],
};
