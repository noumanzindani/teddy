/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#F0EEDF',
          100: '#E5E2D0',  // app cream bg
          200: '#DEDBCA',  // input bg
          300: '#C5C2A8',
          400: '#A6A074',
          500: '#8B8660',
          600: '#7E8A6E',  // splash bg
          700: '#5F6B52',
          800: '#3A3727',
          900: '#1F1E15',
        },
        gold: {
          50:  '#FAF3DD',
          100: '#F2E5BD',
          200: '#E8D29A',
          300: '#E0C58A',  // gradient end (light)
          400: '#D4B370',
          500: '#C9A35E',
          600: '#B89766',  // gradient start (dark)
          700: '#8E7424',
          800: '#5C4A1B',
          900: '#332810',
        },
        ink: {
          DEFAULT: '#1B1B16',
          soft:    '#3A3A33',
          muted:   '#6B6B62',
          subtle:  '#9A9A91',
        },
        surface: {
          DEFAULT: '#E5E2D0',
          card:    '#FFFFFF',
          raised:  '#EDEAD8',
          input:   '#DEDBCA',
        },
        success: '#3F8A4F',
        warning: '#D88A2A',
        danger:  '#C44545',
        info:    '#3A6FB1',
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
      },
    },
  },
  plugins: [],
};
