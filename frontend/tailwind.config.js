/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ur-bg': '#111821',
        'ur-primary': '#3BD671',
        'ur-text-muted': '#a0aab2',
        'ur-border': '#1d2633',
        'ur-glass-bg': 'rgba(17, 24, 33, 0.7)',
      },
    },
  },
  plugins: [],
}
