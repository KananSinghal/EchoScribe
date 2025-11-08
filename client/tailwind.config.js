module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Ensure Inter is available if we use it in index.css or components
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Define your custom colors if needed
        cyan: {
          400: '#22d3ee', // Used in App.jsx
          600: '#0891b2', // Used in App.jsx
        },
      }
    },
  },
  plugins: [],
}