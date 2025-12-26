import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: 'rgb(var(--brand-red) / <alpha-value>)',
          blue: 'rgb(var(--brand-blue) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface) / <alpha-value>)',
          muted: 'rgb(var(--brand-muted) / <alpha-value>)',
          border: 'rgb(var(--brand-border) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
