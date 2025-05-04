import { Flashcard, BucketMap, AnswerDifficulty } from './flashcards';
import { PracticeRecord } from '../types';
import fs from 'fs/promises';
import path from 'path';


export const STATE_FILE_PATH = path.resolve(__dirname, '../../flashcard_state.json'); // Place it relative to dist/logic after build

/**
 * Saves the application's serialized state to a JSON file.
 * @param filePath - The absolute path to the file where state should be saved.
 * @param state - The SerializedState object to save.
 * @returns A Promise that resolves when saving is complete.
 * @throws Error if writing fails.
 */
export async function saveStateToFile(filePath: string, state: SerializedState): Promise<void> {
  try {
    const jsonString = JSON.stringify(state, null, 2); // Pretty-print for readability
    await fs.writeFile(filePath, jsonString, 'utf-8');
  } catch (error: any) {
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
    const fileContentBuffer = await fs.readFile(filePath, 'utf-8');
    const fileContentString = fileContentBuffer.toString(); // Ensure it's a string if readFile didn't specify encoding already
    const parsedState: SerializedState = JSON.parse(fileContentString);
    return parsedState;
  } catch (error: any) {
    // Specific check for "File Not Found" error
    if (error.code === 'ENOENT') {
      return null; // Return null specifically for ENOENT
    } else if (error instanceof SyntaxError) {
        throw new Error("Failed to parse state file ${filePath}: Corrupted JSON."); // Throw specific parsing error
    }
     else {
      // Log and re-throw other errors (permissions, disk errors, etc.)
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

// --- Function Implementations (will be filled in later) ---

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
  // Create the buckets object for the serialized state
  const serializedBuckets: Record<string, SerializedFlashcard[]> = {};

  // Loop through each bucket in the Map
  buckets.forEach((flashcards, bucketNumber) => {
    // Convert the Set of Flashcards to an array of SerializedFlashcard objects
    const serializedFlashcardArray: SerializedFlashcard[] = Array.from(flashcards).map(card => ({
      front: card.front,
      back: card.back,
      hint: card.hint || undefined, // Include hint only if it exists and is not empty
      tags: [...card.tags] // Convert ReadonlyArray to regular array for serialization
    }));

    // Add the array to the serialized buckets object with the bucket number as a string key
    serializedBuckets[bucketNumber.toString()] = serializedFlashcardArray;
  });

  // Return the complete serialized state
  return {
    buckets: serializedBuckets,
    history: history, // History records are already in a serializable format
    day: day
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
      throw new Error("Invalid format for bucket key: ${bucketKey} is not a valid number string");
    }

    // Validate the serialized flashcards array
    if (!Array.isArray(serializedFlashcards)) {
      throw new Error("Invalid format for bucket key: ${bucketKey} value must be an array");
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
        throw new Error("Invalid card data in bucket ${bucketKey}: ${JSON.stringify(cardData)}");
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