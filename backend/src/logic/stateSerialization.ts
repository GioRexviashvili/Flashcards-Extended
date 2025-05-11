import { Flashcard, BucketMap, AnswerDifficulty } from './flashcards';
import { PracticeRecord } from '../types';
import fs from 'fs/promises';
import path from 'path';
 
// Change this to ensure it's saving in the root directory
export const STATE_FILE_PATH = path.resolve(__dirname, '../../flashcard_state.json');
 
/**
 * Saves the application's serialized state to a JSON file.
 * @param filePath - The absolute path to the file where state should be saved.
 * @param state - The SerializedState object to save.
 * @returns A Promise that resolves when saving is complete.
 * @throws Error if writing fails.
 */
export async function saveStateToFile(filePath: string, state: SerializedState): Promise<void> {
  try {
    // Log the exact file path to help with debugging
    console.log(`[DEBUG] Attempting to write state to: ${filePath}`);
   
    // Ensure directory exists (will do nothing if it already exists)
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
   
    const jsonString = JSON.stringify(state, null, 2); // Pretty-print for readability
    await fs.writeFile(filePath, jsonString, 'utf-8');
   
    try {
      // Optional verification - wrap in try/catch so it doesn't fail the whole operation
      const stats = await fs.stat(filePath);
      console.log(`[DEBUG] Successfully wrote ${stats.size} bytes to ${filePath}`);
    } catch (verifyError) {
      console.warn(`[WARN] Could not verify file write: ${verifyError instanceof Error ? verifyError.message : verifyError}`);
    }
  } catch (error: any) {
    // Log detailed error information
    console.error(`[ERROR] Failed to save state file: ${error.message}`);
    if (error.code) {
      console.error(`[ERROR] Error code: ${error.code}`);
    }
    if (error.stack) {
      console.error(`[ERROR] Stack trace: ${error.stack}`);
    }
    // Re-throw the error so the caller knows saving failed
    throw error;
  }
}
 
/**
 * Loads the application's serialized state from a JSON file.
 * @param filePath - The absolute path to the file from which state should be loaded.
 * @returns A Promise that resolves with the loaded SerializedState object,
 *          or null if the file does not exist (ENOENT error).
 * @throws Error if reading fails for other reasons or if JSON parsing fails.
 */
export async function loadStateFromFile(filePath: string): Promise<SerializedState | null> {
  try {
    console.log(`[DEBUG] Attempting to read state from: ${filePath}`);
    const fileContentBuffer = await fs.readFile(filePath, 'utf-8');
    const fileContentString = fileContentBuffer.toString(); // Ensure it's a string if readFile didn't specify encoding already
   
    // Log success and size for debugging
    console.log(`[DEBUG] Successfully read ${fileContentString.length} characters from ${filePath}`);
   
    const parsedState: SerializedState = JSON.parse(fileContentString);
    return parsedState;
  } catch (error: any) {
    // Specific check for "File Not Found" error
    if (error.code === 'ENOENT') {
      console.log(`[DEBUG] No state file found at: ${filePath}`);
      return null; // Return null specifically for ENOENT
    } else if (error instanceof SyntaxError) {
      console.error(`[ERROR] Failed to parse state file ${filePath}: Corrupted JSON.`);
      throw new Error(`Failed to parse state file ${filePath}: Corrupted JSON.`); // Throw specific parsing error
    } else {
      // Log and re-throw other errors (permissions, disk errors, etc.)
      console.error(`[ERROR] Failed to load state file: ${error.message}`);
      throw error;
    }
  }
}
 
/**
 * Represents a Flashcard as a plain JavaScript object for serialization.
 */
export interface SerializedFlashcard {
  front: string;
  back: string;
  hint?: string;
  tags: ReadonlyArray<string>;
}
 
/**
 * Represents the entire application state in a serializable format.
 * Buckets are stored as a Record (object) where keys are bucket numbers (as strings, JSON standard)
 * and values are arrays of serialized flashcards.
 */
export interface SerializedState {
  // Use Record<string, ...> because JSON object keys must be strings
  buckets: Record<string, SerializedFlashcard[]>;
  history: PracticeRecord[]; // PracticeRecord should already be serializable
  day: number;
}
 
/**
 * Converts the application's live state (using Map/Set) into a serializable plain object.
 * @param buckets - The current BucketMap (Map<number, Set<Flashcard>>)
 * @param history - The current practice history array
 * @param day - The current day number
 * @returns A SerializedState object ready for JSON stringification.
 */
export function serializeState(
  buckets: BucketMap,
  history: PracticeRecord[],
  day: number
): SerializedState {
  console.log("0 - Starting serialization");
  if (!(buckets instanceof Map)) {
    console.error("ERROR: buckets is NOT a Map!", typeof buckets, buckets);
    throw new Error("buckets must be a Map");
  }
  if (buckets.size === 0) {
    console.warn("Buckets map is empty");
  }
 
  const serializedBuckets: Record<string, SerializedFlashcard[]> = {};
 
  buckets.forEach((flashcards, bucketNumber) => {
    console.log(`Processing bucket ${bucketNumber}`);
    const serializedArray = Array.from(flashcards).map(card => ({
      front: card.front,
      back: card.back,
      hint: card.hint || undefined,
      tags: card.tags ? [...card.tags] : [],
    }));
    serializedBuckets[bucketNumber.toString()] = serializedArray;
  });
 
  console.log("1 - Successfully serialized buckets", serializedBuckets);
 
  return {
    buckets: serializedBuckets,
    history,
    day,
  };
}
 
/**
 * Converts a plain SerializedState object (likely from JSON) back into the
 * application's live state format (using Map/Set and Flashcard instances).
 * @param data - The SerializedState object.
 * @returns An object containing the deserialized buckets, history, and day.
 * @throws Error if the input data structure is invalid.
 */
export function deserializeState(data: SerializedState): {
  buckets: BucketMap;
  history: PracticeRecord[];
  day: number;
} {
  // Validate the overall structure of the serialized data
  if (!data || typeof data !== 'object' || data === null) {
    throw new Error('Invalid serialized state format: top-level data must be an object');
  }
 
  if (!data.buckets || typeof data.buckets !== 'object' || Array.isArray(data.buckets)) {
    throw new Error('Invalid serialized state format: buckets must be an object');
  }
 
  if (!Array.isArray(data.history)) {
    throw new Error('Invalid serialized state format: history must be an array');
  }
 
  if (typeof data.day !== 'number') {
    throw new Error('Invalid serialized state format: day must be a number');
  }
 
  // Create a new Map to hold the deserialized buckets
  const buckets: BucketMap = new Map();
 
  // Process each bucket in the serialized data
  for (const [bucketKey, serializedFlashcards] of Object.entries(data.buckets)) {
    // Validate the bucket key format (must be a numeric string)
    const bucketNumber = Number(bucketKey);
    if (isNaN(bucketNumber) || bucketNumber.toString() !== bucketKey) {
      throw new Error(`Invalid format for bucket key: ${bucketKey} is not a valid number string`);
    }
 
    // Validate the serialized flashcards array
    if (!Array.isArray(serializedFlashcards)) {
      throw new Error(`Invalid format for bucket key: ${bucketKey} value must be an array`);
    }
 
    // Create a new Set to hold the flashcards for this bucket
    const flashcardSet: Set<Flashcard> = new Set();
 
    // Process each serialized flashcard in the array
    for (const cardData of serializedFlashcards) {
      // Validate the card data
      if (!cardData ||
          typeof cardData !== 'object' ||
          typeof cardData.front !== 'string' ||
          typeof cardData.back !== 'string') {
        throw new Error(`Invalid card data in bucket ${bucketKey}: ${JSON.stringify(cardData)}`);
      }
 
      // Create a new Flashcard instance from the serialized data
      const card = new Flashcard(
        cardData.front,
        cardData.back,
        cardData.hint || '', // Use empty string as default if hint is undefined
        Array.isArray(cardData.tags) ? [...cardData.tags] : [] // Ensure tags is an array
      );
 
      // Add the card to the set for this bucket
      flashcardSet.add(card);
    }
 
    // Add the flashcard set to the bucket map with the numeric bucket key
    buckets.set(bucketNumber, flashcardSet);
  }
 
  // Return the complete deserialized state
  return {
    buckets,
    history: data.history, // History records are already in the correct format
    day: data.day
  };
}