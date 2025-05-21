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
 
// === TensorFlow.js Imports ===
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
 
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
 
  // === New state for Hand Pose Detection Model ===
  const [handDetector, setHandDetector] =
    useState<handPoseDetection.HandDetector | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null); // For model loading errors
 
  // === New state for Gesture Detection Loop ===
  const [isDetectingGestures, setIsDetectingGestures] =
    useState<boolean>(false);
  const [currentDetectedGesture, setCurrentDetectedGesture] = useState<
    string | null
  >(null);
  const requestRef = useRef<number | null>(null);
 
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
    if (handDetector) {
      console.log("PracticeView (Cleanup Effect): Disposing hand detector.");
      handDetector.dispose();
    }
  }, [webcamStream, handDetector]);
 
  // --- Event Handlers ---
  const handleShowBack = () => {
    console.log("PracticeView: Showing back of card.");
    setShowBack(true);
  };
 
  const handleAnswer = async (difficulty: AnswerDifficulty) => {
    stopGestureDetection();
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
        // === Call loadHandPoseModel here! ===
        if (!handDetector && !isModelLoading) {
          // Load model only if not already loaded/loading
          await loadHandPoseModel();
        }
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
    console.log("PracticeView: Stopping webcam and hand detector...");
 
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      console.log("PracticeView: Webcam stopped.");
    }
    setWebcamStream(null);
    setIsWebcamEnabled(false);
    // Do not clear webcamError here, user might want to see why it failed
    // Do not set isWebcamInitializing here
 
    // 2. Dispose of the hand detector
    if (handDetector) {
      handDetector.dispose(); // Call the dispose method
      setHandDetector(null); // Set the state to null
      console.log("PracticeView: Hand detector disposed.");
    }
    stopGestureDetection();
  };
 
  // === Function to Load Hand Pose Model ===
  const loadHandPoseModel = async () => {
    console.log("PracticeView: Attempting to load hand pose model...");
    setIsModelLoading(true);
    setModelError(null); // Clear previous model errors
    setHandDetector(null); // Clear previous detector
 
    try {
      // 1. Set the TensorFlow.js backend to WebGL for performance.
      await tf.setBackend("webgl");
      console.log("PracticeView: TensorFlow.js backend set to WebGL.");
 
      // 2. Specify the model to use (MediaPipeHands is a good default).
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
 
      // 3. Configure the detector.
      // 'runtime': 'tfjs' is standard for browser.
      // 'modelType': 'lite' is faster but less accurate, 'full' is more accurate but slower.
      // Start with 'lite' for better performance, especially on less powerful devices.
      const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig =
        {
          runtime: "mediapipe", // Use 'mediapipe' as required by the type
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands", // Path to MediaPipe solution files
          modelType: "lite", // Can also be 'full'
          // maxHands: 1, // Optional: if you only want to detect one hand
        };
 
      // 4. Create the detector instance. This is where the model is actually loaded.
      const detector = await handPoseDetection.createDetector(
        model,
        detectorConfig
      );
      setHandDetector(detector);
      console.log("PracticeView: Hand pose model loaded successfully.");
    } catch (err: any) {
      console.error("PracticeView: Error loading hand pose model:", err);
      setModelError(
        `Failed to load hand pose model: ${err.message || "Unknown error"}`
      );
      setHandDetector(null);
    } finally {
      setIsModelLoading(false);
    }
  };
 
  const gestureDetectionLoop = async () => {
    if (!isDetectingGestures || !handDetector || !videoRef.current) {
      console.log("Gesture detection loop stopping or prerequisites not met.");
      setCurrentDetectedGesture(null); // Clear gesture if loop stops
      return;
    }
 
    // Ensure video is ready to provide data
    if (videoRef.current.readyState < 3) {
      // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
      // Video not ready enough, try again on the next frame
      requestRef.current = requestAnimationFrame(gestureDetectionLoop);
      return;
    }
 
    try {
      const hands = await handDetector.estimateHands(videoRef.current, {
        flipHorizontal: false, // Adjust if your camera feed is mirrored
      });
 
      const gesture = identifyGesture(hands); // We'll define this next
      setCurrentDetectedGesture(gesture);
    } catch (error) {
      console.error("Error during hand estimation:", error);
      // Optionally set an error state or stop detection
      // stopGestureDetection(); // Example: stop on error
    }
 
    // Continue the loop
    if (isDetectingGestures) {
      // Check again in case it was stopped during async operations
      requestRef.current = requestAnimationFrame(gestureDetectionLoop);
    }
  };
 
  // Keypoint indices (refer to MediaPipe Hand landmarks image)
  const Landmark = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_FINGER_MCP: 5,
    INDEX_FINGER_PIP: 6,
    INDEX_FINGER_DIP: 7,
    INDEX_FINGER_TIP: 8,
    MIDDLE_FINGER_MCP: 9,
    MIDDLE_FINGER_PIP: 10,
    MIDDLE_FINGER_DIP: 11,
    MIDDLE_FINGER_TIP: 12,
    RING_FINGER_MCP: 13,
    RING_FINGER_PIP: 14,
    RING_FINGER_DIP: 15,
    RING_FINGER_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20,
  };
 
  const identifyGesture = (hands: handPoseDetection.Hand[]): string | null => {
    if (hands.length === 0) {
      return null; // No hand detected
    }
 
    const keypoints = hands[0].keypoints; // Use the first detected hand
 
    // Helper to check if a finger is extended (tip is further "out" than a lower joint)
    // For Y coordinate, "out" usually means a smaller Y value (higher on screen)
    const isFingerExtended = (
      tipIndex: number,
      pipIndex: number,
      mcpIndex: number,
      thresholdFactor = 1.2
    ) => {
      // Simple check: tip is above PIP, PIP is above MCP (for vertical fingers)
      // This needs to be adapted if hand is rotated.
      // A more robust check might involve angles or distances.
      return (
        keypoints[tipIndex].y < keypoints[pipIndex].y &&
        keypoints[pipIndex].y < keypoints[mcpIndex].y
      );
    };
 
    // Thumb status
    const thumbTip = keypoints[Landmark.THUMB_TIP];
    const thumbPip = keypoints[Landmark.THUMB_IP]; // Using IP as a reference below the tip
    const thumbMcp = keypoints[Landmark.THUMB_MCP];
    const wrist = keypoints[Landmark.WRIST];
 
    // Other fingers (check if they are generally curled or closed)
    // A simple check: are the tips of other fingers below their PIP or MCP joints?
    const indexFingerClosed =
      keypoints[Landmark.INDEX_FINGER_TIP].y >
      keypoints[Landmark.INDEX_FINGER_PIP].y;
    const middleFingerClosed =
      keypoints[Landmark.MIDDLE_FINGER_TIP].y >
      keypoints[Landmark.MIDDLE_FINGER_PIP].y;
    const ringFingerClosed =
      keypoints[Landmark.RING_FINGER_TIP].y >
      keypoints[Landmark.RING_FINGER_PIP].y;
    const pinkyFingerClosed =
      keypoints[Landmark.PINKY_TIP].y > keypoints[Landmark.PINKY_PIP].y;
 
    const allOtherFingersClosed =
      indexFingerClosed &&
      middleFingerClosed &&
      ringFingerClosed &&
      pinkyFingerClosed;
 
    // --- Thumb Up Detection ---
    // Thumb tip Y is significantly above (smaller Y) thumb MCP and other fingers are closed.
    // And thumb tip X is not too far from thumb MCP X (thumb is mostly vertical)
    if (
      thumbTip.y < thumbMcp.y && // Thumb tip is above MCP
      Math.abs(thumbTip.x - thumbMcp.x) <
        Math.abs(thumbTip.y - thumbMcp.y) * 0.8 && // Thumb is somewhat vertical
      allOtherFingersClosed
    ) {
      return "ThumbUp";
    }
 
    // --- Thumb Down Detection ---
    // Thumb tip Y is significantly below (larger Y) thumb MCP and other fingers are closed.
    if (
      thumbTip.y > thumbMcp.y && // Thumb tip is below MCP
      Math.abs(thumbTip.x - thumbMcp.x) <
        Math.abs(thumbTip.y - thumbMcp.y) * 0.8 && // Thumb is somewhat vertical
      allOtherFingersClosed
    ) {
      return "ThumbDown";
    }
 
    // --- Flat Hand Detection (Open Palm) ---
    // All fingertips are generally above their PIP joints (extended)
    // This is a very basic check and might need refinement.
    const indexExtended =
      keypoints[Landmark.INDEX_FINGER_TIP].y <
      keypoints[Landmark.INDEX_FINGER_PIP].y;
    const middleExtended =
      keypoints[Landmark.MIDDLE_FINGER_TIP].y <
      keypoints[Landmark.MIDDLE_FINGER_PIP].y;
    const ringExtended =
      keypoints[Landmark.RING_FINGER_TIP].y <
      keypoints[Landmark.RING_FINGER_PIP].y;
    const pinkyExtended =
      keypoints[Landmark.PINKY_TIP].y < keypoints[Landmark.PINKY_PIP].y;
    // Thumb might be out to the side or somewhat up
    const thumbOutToSide =
      Math.abs(thumbTip.x - keypoints[Landmark.INDEX_FINGER_MCP].x) >
      keypoints[Landmark.THUMB_MCP].y - thumbTip.y;
 
    if (
      indexExtended &&
      middleExtended &&
      ringExtended &&
      pinkyExtended &&
      (thumbTip.y < thumbMcp.y || thumbOutToSide)
    ) {
      // Check if fingers are spread (distance between fingertips)
      const tipDistance1 = Math.hypot(
        keypoints[Landmark.INDEX_FINGER_TIP].x -
          keypoints[Landmark.MIDDLE_FINGER_TIP].x,
        keypoints[Landmark.INDEX_FINGER_TIP].y -
          keypoints[Landmark.MIDDLE_FINGER_TIP].y
      );
      const mcpDistance1 = Math.hypot(
        keypoints[Landmark.INDEX_FINGER_MCP].x -
          keypoints[Landmark.MIDDLE_FINGER_MCP].x,
        keypoints[Landmark.INDEX_FINGER_MCP].y -
          keypoints[Landmark.MIDDLE_FINGER_MCP].y
      );
 
      // Heuristic: if tips are further apart than MCPs (relative to some base like wrist to middle finger MCP dist)
      // This is very rough and needs calibration
      if (tipDistance1 > mcpDistance1 * 0.7) {
        // Adjust 0.7 factor
        return "FlatHand";
      }
    }
 
    return "None"; // No specific gesture detected or hand not clear
  };
 
  const startGestureDetection = () => {
    if (!handDetector) {
      console.warn("Hand detector not ready, cannot start gesture detection.");
      return;
    }
    console.log("Starting gesture detection loop...");
    setIsDetectingGestures(true);
    // Initial call to the loop
    requestRef.current = requestAnimationFrame(gestureDetectionLoop);
  };
 
  const stopGestureDetection = () => {
    console.log("Stopping gesture detection loop...");
    setIsDetectingGestures(false);
    setCurrentDetectedGesture(null); // Clear detected gesture
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current); // Stop the animation frame loop
    }
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
          // "Show Answer" button is always available if the answer isn't shown
          <button onClick={handleShowBack}>Show Answer</button>
        ) : // Answer is shown. Now decide whether to show difficulty buttons OR expect gestures.
        !isWebcamEnabled ? (
          // If webcam is NOT enabled, show the traditional difficulty buttons
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
        ) : (
          <p style={{ fontStyle: "italic", color: "var(--neutral-400)" }}>
            Use hand gestures to answer (Thumb Up - Easy, Down - Hard, or Flat
            Hand - Wrong).
          </p>
        )}
      </div>
 
      {showBack &&
        isWebcamEnabled && ( // Only show this section if answer is visible and webcam is on
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            {handDetector && !isModelLoading && !isDetectingGestures && (
              <button
                onClick={() => startGestureDetection()} // We'll define this function
                className="btn-primary" // Or your preferred style
              >
                Start Gesture Input
              </button>
            )}
            {isDetectingGestures && (
              <p>Detecting gestures... Look at the camera.</p>
            )}
            {currentDetectedGesture && isDetectingGestures && (
              <p style={{ fontWeight: "bold", marginTop: "5px" }}>
                Detected: {currentDetectedGesture}
              </p>
            )}
            {!handDetector && !isModelLoading && !modelError && (
              <p>Waiting for hand model to be ready...</p>
            )}
          </div>
        )}
 
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
            {" "}
            {/* Use your CSS class if you created one */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="webcam-video-feed"
            />
            <button
              onClick={stopWebcam}
              className="btn-secondary"
              style={{ marginTop: "10px" }}
            >
              Disable Webcam
            </button>
            {isModelLoading && (
              <p style={{ marginTop: "5px" }}>
                Loading hand detection model...
              </p>
            )}
            {modelError && (
              <p className="error" style={{ color: "red", marginTop: "5px" }}>
                {modelError}
              </p>
            )}
            {!isModelLoading && handDetector && (
              <p style={{ marginTop: "5px", color: "green" }}>
                Hand detection model loaded. Ready for gestures.
              </p>
            )}
            {!isModelLoading && !handDetector && !modelError && (
              // This state might occur if webcam started but model loading hasn't begun or was interrupted
              <p style={{ marginTop: "5px" }}>
                Webcam enabled. Initializing model...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
 
export default PracticeView;
 