// --- Client Entry Point (client/src/index.js) ---

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Import your main application component

// Optional: You might need a global CSS file here if you had one.
// For now, we assume Tailwind/CSS is handled within App.jsx or imported elsewhere.

// Get the root element from public/index.html
const container = document.getElementById('root');

// Use the modern React 18 API to create the root instance
const root = ReactDOM.createRoot(container);

// Render the main App component inside React's strict mode
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);