export const colors = {
  sage: {
    50:  '#F0EEDF',
    100: '#E5E2D0',
    200: '#DEDBCA',
    300: '#C5C2A8',
    400: '#A6A074',
    500: '#8B8660',
    600: '#7E8A6E',
    700: '#5F6B52',
    800: '#3A3727',
    900: '#1F1E15',
  },
  gold: {
    50:  '#FAF3DD',
    100: '#F2E5BD',
    200: '#E8D29A',
    300: '#E0C58A',
    400: '#D4B370',
    500: '#C9A35E',
    600: '#B89766',
    700: '#8E7424',
    800: '#5C4A1B',
    900: '#332810',
  },
  ink:     { DEFAULT: '#1B1B16', soft: '#3A3A33', muted: '#6B6B62', subtle: '#9A9A91' },
  surface: { DEFAULT: '#E5E2D0', card: '#FFFFFF', raised: '#EDEAD8', input: '#DEDBCA' },
  success: '#3F8A4F', warning: '#D88A2A', danger: '#C44545', info: '#3A6FB1',
  white: '#FFFFFF', black: '#000000',

  // Gradient stops for primary CTA
  goldGradient: ['#B89766', '#E0C58A'] as const,
} as const;
