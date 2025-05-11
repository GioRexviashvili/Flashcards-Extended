import {
  saveStateToFile,
  serializeState,
  STATE_FILE_PATH
} from "./logic/stateSerialization";
 
// --- Core Imports ---
import express, { Request, Response } from "express";
import cors from "cors";
import fs from 'fs/promises';
import path from 'path';
 
// --- Logic Imports ---
import {
  toBucketSets,
  practice,
  update,
  getHint,
  computeProgress,
} from "./logic/algorithm";
import { Flashcard, AnswerDifficulty, BucketMap } from "./logic/flashcards";
 
// --- State Imports ---
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
  addCard,
  doesCardExist,
  initializeState,
} from "./state";
 
// --- Type Imports ---
import type {
  PracticeSession,
  UpdateRequest,
  HintRequest,
  ProgressStats,
  PracticeRecord,
  CreateCardRequest,
} from "./types";
 
const app = express();
const PORT = process.env.PORT || 3001;
let isShuttingDown = false;
 
// --- Middleware ---
app.use(cors());
app.use(express.json());
 
// --- API Routes ---
 
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
 
/**
 * POST /api/cards
 * Creates a new flashcard and adds it to Bucket 0.
 */
app.post("/api/cards", (req: Request, res: Response) => {
  console.log("POST /api/cards received with body:", req.body);
 
  try {
    // 1. Extract and validate data from the request body
    const { front, back, hint, tags } = req.body as CreateCardRequest;
 
    // Basic validation: front and back are required
    if (!front || !back) {
      console.error("Validation failed: front or back missing.", req.body);
      res.status(400).json({
        message: "Invalid request body. 'front' and 'back' are required fields.",
      });
      return; // Added return to prevent execution continuing
    }
 
    // Check if card already exists
    if (doesCardExist(front, back)) {
      console.warn(`Attempted to create a duplicate card: "${front}"`);
      res.status(409).json({ // 409 Conflict
        message: "A flashcard with this front and back already exists.",
      });
      return; // Added return to prevent execution continuing
    }
 
    // Create a new Flashcard instance
    // The Flashcard constructor now handles optional hint/tags with defaults
    const newCard = new Flashcard(front, back, hint, tags);
 
    // Add the card to the state (Bucket 0)
    addCard(newCard);
 
    // Respond with success
    console.log(`Card created successfully: "${newCard.front}"`);
    res.status(201).json({ // 201 Created
      message: "Flashcard created successfully.",
      card: { // Send back the created card details (good practice)
        front: newCard.front,
        back: newCard.back,
        hint: newCard.hint,
        tags: newCard.tags,
      },
    });
 
  } catch (error) {
    console.error("Error in POST /api/cards:", error);
    res.status(500).json({
      message: "Internal server error while creating the flashcard.",
    });
  }
});
 
// --- Shutdown Handler ---
async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log(`[SHUTDOWN] Shutdown already in progress. Ignoring ${signal}.`);
    return;
  }
  isShuttingDown = true;
  console.log(`[SHUTDOWN] Received ${signal}, saving state...`);
 
  try {
    const buckets = getBuckets();
    const history = getHistory();
    const day = getCurrentDay();
 
    console.log(`[SHUTDOWN] Fetched state. Day: ${day}, Bucket count: ${buckets.size}`);
 
    const serializedState = serializeState(buckets, history, day);
    console.log(`[SHUTDOWN] State serialized successfully.`);
 
    // Ensure directory exists
    await fs.mkdir(path.dirname(STATE_FILE_PATH), { recursive: true });
 
    console.log(`[SHUTDOWN] Saving state to file: ${STATE_FILE_PATH}`);
    await fs.writeFile(STATE_FILE_PATH, JSON.stringify(serializedState, null, 2));
    console.log(`[SHUTDOWN] State saved to file successfully.`);
 
    // Give time for write to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    process.exit(0);
  } catch (error) {
    console.error(`[SHUTDOWN] Failed to save state: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
 
// Register shutdown handlers
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
 
// --- Start Server ---
(async () => {
  try {
    console.log("Starting backend server...");
    await initializeState();
    app.listen(PORT, () => {
      console.log(`Backend server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();