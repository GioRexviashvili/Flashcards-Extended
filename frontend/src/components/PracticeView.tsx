import { useState, useEffect } from "react";

// Import necessary types
import type { Flashcard } from "../types";
import { AnswerDifficulty } from "../types"; // Import the enum itself

// Import API service functions
import {
  fetchPracticeCards,
  submitAnswer,
  advanceDay,
  fetchHint,
} from "../services/api";

// Import the child component
import FlashcardDisplay from "./FlashcardDisplay";

function PracticeView() {
  // --- State Variables ---
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showBack, setShowBack] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<number>(0); // Will be updated from API
  const [sessionFinished, setSessionFinished] = useState<boolean>(false);
  const [retiredBucket, setRetiredBucket] = useState<boolean>(false);

  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  // --- Data Fetching Function ---
  const loadPracticeCards = async () => {
    console.log("PracticeView: Attempting to load practice cards...");
    setIsLoading(true);
    setError(null);
    setSessionFinished(false);
    // Reset card index and visibility when loading a new set
    setCurrentCardIndex(0);
    setShowBack(false);

    try {
      const result = await fetchPracticeCards();
      console.log("PracticeView: Data received:", result);
      setPracticeCards(result.cards);
      setDay(result.day);

      if (result.retired) {
        setRetiredBucket(true); // No cards to practice today
      }

      if (result.cards.length === 0) {
        console.log(
          "PracticeView: No cards returned, session considered finished."
        );
        setSessionFinished(true); // Mark session finished if no cards
      }
    } catch (err) {
      console.error("PracticeView: Failed to load practice cards:", err);
      setError(
        "Failed to load practice cards. Please check the connection or try again later."
      );
      setPracticeCards([]); // Clear cards on error
    } finally {
      setIsLoading(false); // Stop loading indicator
      console.log("PracticeView: Finished loading attempt.");
    }
  };

  // --- Effect for Initial Load ---
  // Use useEffect with an empty dependency array to run loadPracticeCards once on mount
  useEffect(() => {
    loadPracticeCards();
  }, []); // [] means run only once when the component mounts

  // --- Event Handlers ---
  const handleShowBack = () => {
    console.log("PracticeView: Showing back of card.");
    setShowBack(true);
  };

  const handleAnswer = async (difficulty: AnswerDifficulty) => {
    // Ensure we have a valid card index
    if (currentCardIndex >= practiceCards.length) {
      console.error("PracticeView: handleAnswer called with invalid index.");
      setError("An internal error occurred (invalid card index).");
      return;
    }

    const currentCard = practiceCards[currentCardIndex];
    console.log(
      `PracticeView: Handling answer for "${currentCard.front}" - Difficulty: ${AnswerDifficulty[difficulty]}`
    );
    setError(null); // Clear previous errors before submitting

    try {
      // Call the API service to submit the answer
      await submitAnswer(currentCard.front, currentCard.back, difficulty);
      console.log("PracticeView: Answer submitted successfully.");

      // Check if this was the last card
      const isLastCard = currentCardIndex >= practiceCards.length - 1;
      if (isLastCard) {
        console.log("PracticeView: Last card answered.");
        setSessionFinished(true);
      } else {
        // Move to the next card
        setCurrentCardIndex((prevIndex) => prevIndex + 1);
        setShowBack(false); // Hide the answer for the next card
        setHint(null);
        console.log(
          `PracticeView: Moving to next card index ${currentCardIndex + 1}`
        );
      }
    } catch (err) {
      console.error("PracticeView: Failed to submit answer:", err);
      setError("Failed to submit answer. Please try again.");
    }
  };

  const handleNextDay = async () => {
    console.log("PracticeView: Handling next day action...");
    setError(null);
    setIsLoading(true);
    try {
      await advanceDay();
      console.log("PracticeView: Day advanced on backend, reloading cards...");
      await loadPracticeCards(); // Reload cards for the new day
    } catch (err) {
      console.error("PracticeView: Failed to advance day:", err);
      setError("Failed to advance to the next day. Please try again.");
      // setIsLoading(false); // Ensure loading is false if you set it true above
    }
  };

  const handleGetHint = async () => {
    if (!currentCard) return;
    setLoadingHint(true);
    setHintError(null);
    setHint(null);
    try {
      const fetchedHint = await fetchHint(currentCard);
      setHint(fetchedHint);
    } catch (err) {
      console.error("Failed to fetch hint:", err);
      setHintError("Could not load hint.");
    } finally {
      setLoadingHint(false);
    }
  };

  // --- Rendering Logic ---

  // 1. Handle Loading State
  if (isLoading) {
    return <div>Loading practice session...</div>;
  }

  // 2. Handle Error State
  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  if (retiredBucket) {
    return (
      <div className="session-finished">
        <div className="day-counter">Day {day}</div>
        <p>Congrats! You have learned all Flashcards!</p>
      </div>
    );
  }

  // 3. Handle Session Finished State
  if (sessionFinished) {
    return (
      <div>
        <h2>Session Complete!</h2>
        <p>No more cards to practice for Day {day}.</p>
        <button onClick={handleNextDay}>Go to Next Day</button>
      </div>
    );
  }

  // 4. Handle No Cards Available (but not finished - e.g., initial load returned none)
  if (practiceCards.length === 0) {
    return (
      <div>
        <h2>Practice Session - Day {day}</h2>
        <p>No cards scheduled for practice today!</p>
        {/* Optionally allow advancing day even if no cards */}
        <button onClick={handleNextDay}>Go to Next Day</button>
      </div>
    );
  }

  // 5. Handle Active Practice Session State
  // Ensure currentCardIndex is valid before trying to access the card
  if (currentCardIndex >= practiceCards.length) {
    // This case might indicate an issue, maybe session should be finished
    console.warn(
      "PracticeView: currentCardIndex is out of bounds, marking session finished."
    );
    // setSessionFinished(true); // Or handle differently
    return (
      <div style={{ color: "orange" }}>Reached end of cards unexpectedly.</div>
    );
  }

  // Get the current card safely now
  const currentCard = practiceCards[currentCardIndex];

  return (
    <div>
      <h2>Practice Session - Day {day}</h2>
      <p>
        Card {currentCardIndex + 1} of {practiceCards.length}
      </p>

      {/* Render the FlashcardDisplay component */}
      <FlashcardDisplay card={currentCard} showBack={showBack} />

      {!showBack && (
        <div style={{ marginTop: "15px" }}>
          <button onClick={handleGetHint} disabled={loadingHint}>
            {loadingHint ? "Loading Hint..." : "Get Hint"}
          </button>
          {hint && (
            <p style={{ color: "red", fontStyle: "italic" }}>Hint: {hint}</p>
          )}
          {hintError && <p style={{ color: "red" }}>{hintError}</p>}
        </div>
      )}

      {/* Render Action Buttons */}
      <div style={{ marginTop: "20px" }}>
        {!showBack ? (
          // Show "Show Answer" button if back is hidden
          <button onClick={handleShowBack}>Show Answer</button>
        ) : (
          // Show difficulty buttons if back is visible
          <>
            {" "}
            {/* React Fragment to group buttons without adding extra DOM element */}
            <button
              onClick={() => handleAnswer(AnswerDifficulty.Wrong)}
              style={{
                marginRight: "10px",
                backgroundColor: "#dc3545",
                color: "white",
              }}
            >
              Wrong
            </button>
            <button
              onClick={() => handleAnswer(AnswerDifficulty.Hard)}
              style={{
                marginRight: "10px",
                backgroundColor: "#ffc107",
                color: "black",
              }}
            >
              Hard
            </button>
            <button
              onClick={() => handleAnswer(AnswerDifficulty.Easy)}
              style={{ backgroundColor: "#28a745", color: "white" }}
            >
              Easy
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default PracticeView;
