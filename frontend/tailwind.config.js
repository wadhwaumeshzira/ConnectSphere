/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0c0c0e', // Very deep, rich dark grey (almost black)
        surface: '#151518',    // Elevated surface
        surfaceHighlight: '#1f1f23', // Hover states
        surfaceBorder: '#27272a',    // Borders
        accent: '#4f46e5',     // Indigo accent (used sparingly)
        accentHover: '#4338ca',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
