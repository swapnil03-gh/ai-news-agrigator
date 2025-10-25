/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a202c', // Main background, slightly darker than image
        'dark-card': '#2d3748', // Card and sidebar background
        'primary-blue': '#4299e1', // Primary blue for buttons, active states
        'accent-purple': '#805ad5', // Purple for accents
        'accent-cyan': '#0bc5ea', // Cyan for accents
        'accent-red': '#e53e3e', // Red for trending
        'text-light': '#e2e8f0', // Light text
        'text-muted': '#a0aec0', // Muted text
      },
    },
  },
  plugins: [],
}
