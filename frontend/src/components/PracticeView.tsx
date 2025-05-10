import { useState, useEffect, useRef } from "react";

import type { Flashcard } from "../types";
import { AnswerDifficulty } from "../types";

import {
  fetchPracticeCards,
  submitAnswer,
  advanceDay,
  fetchHint,
} from "../services/api";

import FlashcardDisplay from "./FlashcardDisplay";

function PracticeView() {
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showBack, setShowBack] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<number>(0);
  const [sessionFinished, setSessionFinished] = useState<boolean>(false);
  const [retiredBucket, setRetiredBucket] = useState<boolean>(false);

  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  // === New state for Webcam Gestures ===
  const [isWebcamEnabled, setIsWebcamEnabled] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isWebcamInitializing, setIsWebcamInitializing] =
    useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null); // Ref for the video element

  // --- Data Fetching Function ---
  const loadPracticeCards = async () => {
    console.log("PracticeView: Attempting to load practice cards...");
    setIsLoading(true);
    setError(null);
    setSessionFinished(false);
    setCurrentCardIndex(0);
    setShowBack(false);

    try {
      const result = await fetchPracticeCards();
      console.log("PracticeView: Data received:", result);
      setPracticeCards(result.cards);
      setDay(result.day);

      if (result.retired) {
        setRetiredBucket(true);
      }

      if (result.cards.length === 0) {
        console.log(
          "PracticeView: No cards returned, session considered finished."
        );
        setSessionFinished(true);
      }
    } catch (err) {
      console.error("PracticeView: Failed to load practice cards:", err);
      setError(
        "Failed to load practice cards. Please check the connection or try again later."
      );
      setPracticeCards([]);
    } finally {
      setIsLoading(false);
      console.log("PracticeView: Finished loading attempt.");
    }
  };

  // --- Effect for Initial Load ---
  useEffect(() => {
    loadPracticeCards();
  }, []);

  useEffect(() => {
    // This effect runs when webcamStream changes.
    if (webcamStream && videoRef.current) {
      console.log(
        "PracticeView (useEffect for video): Attaching stream to video element."
      );
      videoRef.current.srcObject = webcamStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch((error) => {
          console.error(
            "PracticeView (useEffect for video): Error trying to play video:",
            error
          );
        });
      };
    } else if (!webcamStream && videoRef.current) {
      videoRef.current.srcObject = null;
      console.log(
        "PracticeView (useEffect for video): Cleared srcObject as webcamStream is null."
      );
    }
  }, [webcamStream]);

  // --- Event Handlers ---
  const handleShowBack = () => {
    console.log("PracticeView: Showing back of card.");
    setShowBack(true);
  };

  const handleAnswer = async (difficulty: AnswerDifficulty) => {
    if (currentCardIndex >= practiceCards.length) {
      console.error("PracticeView: handleAnswer called with invalid index.");
      setError("An internal error occurred (invalid card index).");
      return;
    }

    const currentCard = practiceCards[currentCardIndex];
    console.log(
      `PracticeView: Handling answer for "${currentCard.front}" - Difficulty: ${AnswerDifficulty[difficulty]}`
    );
    setError(null);

    try {
      await submitAnswer(currentCard.front, currentCard.back, difficulty);
      console.log("PracticeView: Answer submitted successfully.");

      const isLastCard = currentCardIndex >= practiceCards.length - 1;
      if (isLastCard) {
        console.log("PracticeView: Last card answered.");
        setSessionFinished(true);
      } else {
        setCurrentCardIndex((prevIndex) => prevIndex + 1);
        setShowBack(false);
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
      await loadPracticeCards();
    } catch (err) {
      console.error("PracticeView: Failed to advance day:", err);
      setError("Failed to advance to the next day. Please try again.");
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

  // === Webcam Functions ===
  const startWebcam = async () => {
    console.log("PracticeView: Attempting to start webcam...");
    setIsWebcamInitializing(true);
    setWebcamError(null);
    setIsWebcamEnabled(false);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        console.log("PracticeView: Webcam stream object:", stream);
        if (!stream.active) {
          console.warn("PracticeView: Stream is not active upon acquisition.");
        }
        setWebcamStream(stream);
        setIsWebcamEnabled(true);
        console.log("PracticeView: Webcam stream acquired and state set.");
      } catch (err: any) {
        console.error("PracticeView: Error accessing webcam:", err);
        let message = "Failed to access webcam.";
        if (err.name === "NotAllowedError") {
          message =
            "Webcam permission denied. Please allow access in your browser settings.";
        } else if (err.name === "NotFoundError") {
          message =
            "No webcam found. Please ensure a webcam is connected and enabled.";
        }
        setWebcamError(message);
        setIsWebcamEnabled(false);
        setWebcamStream(null);
      } finally {
        setIsWebcamInitializing(false);
      }
    } else {
      setWebcamError("Webcam access is not supported by your browser.");
      setIsWebcamInitializing(false);
      setIsWebcamEnabled(false);
      setWebcamStream(null);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      console.log("PracticeView: Webcam stopped.");
    }
    setWebcamStream(null);
    setIsWebcamEnabled(false);
    // Do not clear webcamError here, user might want to see why it failed
    // Do not set isWebcamInitializing here
  };

  // --- Rendering Logic ---

  // 1. Handle Loading State
  if (isLoading) {
    return <div className="loading">Loading practice session...</div>;
  }

  // 2. Handle Error State
  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  // 3. Handle Retired Bucket State
  if (retiredBucket) {
    return (
      <div className="session-finished">
        <div className="day-counter">Day {day}</div>
        <div className="celebrate-icon">🎓</div>
        <h2>Congratulations!</h2>
        <p>You have mastered all flashcards!</p>
      </div>
    );
  }

  // 4. Handle Session Finished State
  if (sessionFinished) {
    return (
      <div className="session-finished">
        <div className="day-counter">Day {day}</div>
        <div className="celebrate-icon">🎉</div>
        <h2>Session Complete!</h2>
        <p>No more cards to practice for today.</p>
        <button onClick={handleNextDay}>Advance to Next Day</button>
      </div>
    );
  }

  // 5. Handle No Cards Available
  if (practiceCards.length === 0) {
    return (
      <div className="session-finished">
        <div className="day-counter">Day {day}</div>
        <h2>Practice Session</h2>
        <p>No cards scheduled for practice today!</p>
        <button onClick={handleNextDay}>Advance to Next Day</button>
      </div>
    );
  }

  // 6. Handle Card Index Out of Bounds
  if (currentCardIndex >= practiceCards.length) {
    console.warn(
      "PracticeView: currentCardIndex is out of bounds, marking session finished."
    );
    return <div className="error">Reached end of cards unexpectedly.</div>;
  }

  // Get the current card
  const currentCard = practiceCards[currentCardIndex];

  return (
    <div className="practice-container">
      <div className="practice-header">
        <div className="day-counter">Day {day}</div>
        <div className="progress-indicator">
          Card {currentCardIndex + 1} of {practiceCards.length}
        </div>
      </div>

      {/* Render the FlashcardDisplay component */}
      <FlashcardDisplay card={currentCard} showBack={showBack} />

      {/* Hint section */}
      {!showBack && (
        <div className="hint-container">
          <button
            onClick={handleGetHint}
            disabled={loadingHint}
            className="btn-secondary"
          >
            {loadingHint ? "Loading Hint..." : "Get Hint"}
          </button>

          {hint && <div className="hint-text">Hint: {hint}</div>}
          {hintError && <div className="hint-error">{hintError}</div>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="button-group">
        {!showBack ? (
          <button onClick={handleShowBack}>Show Answer</button>
        ) : (
          <>
            <button
              onClick={() => handleAnswer(AnswerDifficulty.Wrong)}
              className="btn-danger"
            >
              Wrong
            </button>
            <button
              onClick={() => handleAnswer(AnswerDifficulty.Hard)}
              className="btn-warning"
            >
              Hard
            </button>
            <button
              onClick={() => handleAnswer(AnswerDifficulty.Easy)}
              className="btn-success"
            >
              Easy
            </button>
          </>
        )}
      </div>

      {/* === Webcam Gesture Controls Section === */}
      <div
        className="webcam-controls"
        style={{ marginTop: "20px", textAlign: "center" }}
      >
        {!isWebcamEnabled && !isWebcamInitializing && (
          <button onClick={startWebcam} className="btn-secondary">
            Enable Webcam for Gestures
          </button>
        )}
        {isWebcamInitializing && <p>Initializing webcam...</p>}
        {webcamError && (
          <p className="error" style={{ color: "red" }}>
            {webcamError}
          </p>
        )}

        {isWebcamEnabled && (
          <div className="webcam-video-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="webcam-video-feed"
            />
            <button onClick={stopWebcam} className="btn-secondary">
              Disable Webcam
            </button>
            <p>Webcam enabled. Ready for gesture model.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PracticeView;
