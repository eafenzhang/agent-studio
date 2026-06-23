/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--cb-button-primary)',
          hover: 'var(--cb-button-primary-hover)',
        },
        surface: {
          DEFAULT: 'var(--cb-bg-primary)',
          secondary: 'var(--cb-bg-secondary)',
        },
        border: {
          DEFAULT: 'var(--cb-border)',
          subtle: 'var(--cb-border-subtle)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
  prefix: 'tw-',
};
