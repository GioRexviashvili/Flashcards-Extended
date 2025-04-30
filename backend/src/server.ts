// --- Core Imports ---
import express, { Request, Response } from "express"; // Import Express framework and its Request/Response types
import cors from "cors"; // Import CORS middleware

// --- Logic Imports ---
// Import the specific algorithm functions we need to call
import {
  toBucketSets,
  practice,
  update,
  getHint,
  computeProgress,
} from "./logic/algorithm";
import { Flashcard, AnswerDifficulty, BucketMap } from "./logic/flashcards"; // Import core types/enums

// --- State Imports ---
// Import functions to interact with our in-memory state
import {
  getCurrentDay,
  getBuckets,
  setBuckets,
  getHistory,
  addHistoryRecord,
  incrementDay,
  findCard,
  findCardBucket,
  isBucketMapEmpty,
} from "./state";

// --- Type Imports ---
// Import the API data structure interfaces we defined
import type {
  PracticeSession,
  UpdateRequest,
  HintRequest,
  ProgressStats,
  PracticeRecord,
} from "./types";

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
// Middleware functions run on incoming requests before they reach your specific route handlers.

// Enable CORS (Cross-Origin Resource Sharing)
// This is crucial because our frontend and backend are considered different "origins".
// Browsers block requests between different origins by default for security.
// cors() adds headers to the response telling the browser it's okay.
app.use(cors());

// Enable parsing of JSON request bodies
// When the frontend sends data (e.g., in a POST request for /api/update),
// it usually sends it as a JSON string. This middleware parses that string
// and makes the resulting JavaScript object available as `req.body`.
app.use(express.json());

// --- API Routes ---
// Define the specific endpoints the frontend can call.

/**
 * GET /api/practice
 * Gets the flashcards scheduled for practice on the current day.
 */
app.get("/api/practice", (req: Request, res: Response) => {
  console.log("GET /api/practice received");

  try {
    const day = getCurrentDay();
    const buckets = getBuckets();

    const bucketMapAsArray = toBucketSets(buckets);

    if (isBucketMapEmpty()) res.json({ cards: [], day: day, retired: true });

    const cardsToPractice: Set<Flashcard> = practice(bucketMapAsArray, day);

    // Convert the result (Set) to an array for JSON response
    const cardsArray = Array.from(cardsToPractice);

    console.log(
      `Practice session for day ${day}. Found ${cardsArray.length} cards.`
    );

    const responseData: PracticeSession = {
      cards: cardsArray,
      day: day,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error in /api/practice:", error);
    // Send a generic server error response
    res.status(500).json({
      message: "Internal server error during practice session retrieval.",
    });
  }
});

/**
 * POST /api/update
 * Updates a card's bucket number after a practice trial.
 */
app.post("/api/update", (req: Request, res: Response) => {
  console.log("POST /api/update received");

  try {
    const { cardFront, cardBack, difficulty } = req.body as UpdateRequest;

    // 2. Validate input (Basic Example)
    if (
      !cardFront ||
      !cardBack ||
      difficulty === undefined ||
      !(difficulty in AnswerDifficulty)
    ) {
      console.error("Invalid input for /api/update:", req.body);
      res.status(400).json({
        message:
          "Invalid request body. Required fields: cardFront, cardBack, difficulty (valid enum value).",
      });
      return;
    }
    const validDifficulty = difficulty as AnswerDifficulty; // Cast after check

    const card = findCard(cardFront, cardBack);
    if (!card) {
      console.error("Card not found", cardFront, cardBack);
      res.status(404).json({ message: "Flashcard not found" });
      return;
    }

    const buckets = getBuckets();

    const previousBucket = findCardBucket(card);
    if (previousBucket === undefined) {
      // This shouldn't happen if findCard succeeded, but good to check
      console.error(`Could not find current bucket for card: ${card.front}`);
      res.status(500).json({
        message: "Internal error: Card exists but couldn't find its bucket.",
      });
      return;
    }

    setBuckets(update(buckets, card, validDifficulty));

    const newBucket = findCardBucket(card);
    if (newBucket === undefined) {
      // This might happen if the card was retired or logic is complex
      console.warn(
        `Could not find new bucket for card after update: ${card.front}`
      );
      // Decide how to handle - maybe record as 'retired' or a special value?
      // For now, let's proceed but log it.
    }

    const record: PracticeRecord = {
      cardFront: card.front,
      cardBack: card.back,
      timestamp: Date.now(), // Record the time of the update
      difficulty: validDifficulty,
      previousBucket: previousBucket,
      newBucket: newBucket !== undefined ? newBucket : -1,
    };
    addHistoryRecord(record);

    // 10. Log the update details
    console.log(
      `Updated card "${card.front}". Difficulty: ${
        AnswerDifficulty[validDifficulty]
      }. Moved from bucket ${previousBucket} to ${
        newBucket !== undefined ? newBucket : "?"
      }.`
    );

    // 11. Respond with a success message
    res.status(200).json({ message: "Card updated successfully." });
  } catch (error) {
    console.error("Error in /api/update:", error);
    res
      .status(500)
      .json({ message: "Internal server error during card update." });
  }
});

/**
 * GET /api/hint
 * Gets a hint for a specific flashcard.
 */
app.get("/api/hint", (req: Request, res: Response) => {
  console.log("GET /api/hint received with query:", req.query);
  try {
    // 1. Extract card identifiers from query parameters
    const { cardFront, cardBack } = req.query;

    // 2. Validate input
    if (
      typeof cardFront !== "string" ||
      typeof cardBack !== "string" ||
      !cardFront ||
      !cardBack
    ) {
      console.error("Invalid query params for /api/hint:", req.query);
      res.status(400).json({
        message:
          "Invalid request query. Required string parameters: cardFront, cardBack.",
      });
      return;
    }

    // 3. Find the actual Flashcard object
    const card = findCard(cardFront, cardBack);
    if (!card) {
      console.error(`Card not found for hint: ${cardFront} / ${cardBack}`);
      res.status(404).json({ message: "Flashcard not found." });
      return;
    }

    const hint = getHint(card);

    // 5. Log the request
    console.log(
      `Hint requested for card "${card.front}". Hint generated: "${hint}"`
    );

    // 6. Respond with the hint
    res.json({ hint: hint });
  } catch (error) {
    console.error("Error in /api/hint:", error);
    res
      .status(500)
      .json({ message: "Internal server error during hint generation." });
  }
});

/**
 * GET /api/progress
 * Computes and returns learning progress statistics.
 */
app.get("/api/progress", (req: Request, res: Response) => {
  console.log("GET /api/progress received");
  try {
    // 1. Get current state needed for progress calculation
    const buckets = getBuckets();
    const history = getHistory();

    const stats: ProgressStats = computeProgress(buckets, history);

    // 3. Log calculation
    console.log("Progress stats calculated:", stats);

    // 4. Respond with the computed statistics
    res.json(stats);
  } catch (error) {
    console.error("Error in /api/progress:", error);
    res
      .status(500)
      .json({ message: "Internal server error during progress calculation." });
  }
});

/**
 * POST /api/day/next
 * Advances the current learning day by one.
 */
app.post("/api/day/next", (req: Request, res: Response) => {
  console.log("POST /api/day/next received");
  try {
    // 1. Call the state mutator to increment the day
    incrementDay();

    // 2. Get the new day value
    const newDay = getCurrentDay();

    // 4. Respond with success and the new day number
    res
      .status(200)
      .json({ message: "Day advanced successfully.", newDay: newDay });
  } catch (error) {
    console.error("Error in /api/day/next:", error);
    res
      .status(500)
      .json({ message: "Internal server error during day advancement." });
  }
});

// --- Start Server ---
// Tell the Express app to start listening for incoming connections on the specified PORT.
app.listen(PORT, () => {
  console.log(
    `Backend server is running and listening on http://localhost:${PORT}`
  );
});
