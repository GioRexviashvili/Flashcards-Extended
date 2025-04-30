// 1. Import necessary modules and types
import type { Flashcard } from "../types"; // Import the Flashcard type definition

// 2. Define the Props interface
// This specifies what information this component expects to receive from its parent.
interface Props {
  card: Flashcard; // The flashcard data object to display
  showBack: boolean; // A flag indicating whether to show the back side or '???'
}

function FlashcardDisplay({ card, showBack }: Props) {
  // 6. Render the JSX (HTML-like structure)
  return (
    // Basic styling using inline styles (you could use CSS classes instead)
    <div
      style={{
        border: "1px solid #ccc",
        padding: "15px",
        margin: "10px 0", // Add some vertical margin
        borderRadius: "5px",
        backgroundColor: "#f9f9f9", // Light background
      }}
    >
      {/* Always render the front of the card */}
      <h2 style={{ marginTop: 0 }}>{card.front}</h2>

      <hr style={{ margin: "10px 0" }} />

      {/* Conditionally render the back or '???' based on the showBack prop */}
      <p
        style={{
          fontSize: "1.1em",
          minHeight: "1.5em", // Ensure space even when '???'
          fontStyle: showBack ? "normal" : "italic",
          color: showBack ? "black" : "#777",
        }}
      >
        {showBack ? card.back : "???"}
      </p>
    </div>
  );
}

// Export the component to make it available for use in other files
export default FlashcardDisplay;
