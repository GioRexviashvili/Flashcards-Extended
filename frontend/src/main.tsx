import React from 'react';
import ReactDOM from 'react-dom/client'; // Import the specific client renderer
import App from './App.tsx'; // Import your root App component
// Optional: Import your main CSS file if you have one
// import './index.css'; // Make sure the path is correct

// Find the root DOM element in index.html
const rootElement = document.getElementById('root');

// Ensure the root element exists before trying to render
if (rootElement) {
  // Create a React root attached to the DOM element
  ReactDOM.createRoot(rootElement).render(
    // React.StrictMode is a wrapper that helps find potential problems in your app during development.
    <React.StrictMode>
      {/* Render your main App component */}
      <App />
    </React.StrictMode>,
  );
} else {
  console.error("Failed to find the root element. Ensure your index.html has an element with id='root'.");
}