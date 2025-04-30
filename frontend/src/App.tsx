// Import the main view component we created
import PracticeView from './components/PracticeView';
// Optional: Import a main CSS file if you create one for global styles
// import './App.css'; // Or './index.css' or similar

function App() {
  return (
    // You can add a main container div if desired
    <div>
      {/* Render a main title for the application */}
      <h1>Flashcard Learner</h1>

      <hr /> {/* Optional: Add a horizontal line for separation */}

      {/* Render the PracticeView component */}
      {/* This is where the main practice session UI will appear */}
      <PracticeView />

      {/* Later, you might replace PracticeView with routing logic */}
      {/* e.g., using React Router to show different components based on the URL */}
    </div>
  );
}

export default App; // Export the App component so main.tsx can use it