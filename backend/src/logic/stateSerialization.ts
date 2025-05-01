import { Flashcard, BucketMap, AnswerDifficulty } from './flashcards';
import { PracticeRecord } from '../types';
import fs from 'fs/promises';
import path from 'path';


export const STATE_FILE_PATH = path.resolve(__dirname, '../../flashcard_state.json'); // Place it relative to dist/logic after build
console.log(`State file path configured to: ${STATE_FILE_PATH}`); // Log path on startup

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
    console.log(`Application state successfully saved to ${filePath}`);
  } catch (error: any) {
    console.error(`Error saving state to ${filePath}:`, error);
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
    console.log(`Application state successfully loaded from ${filePath}`);
    return parsedState;
  } catch (error: any) {
    // Specific check for "File Not Found" error
    if (error.code === 'ENOENT') {
      console.log(`State file ${filePath} not found. Starting with initial state.`);
      return null; // Return null specifically for ENOENT
    } else if (error instanceof SyntaxError) {
        console.error(`Error parsing state file ${filePath} as JSON:`, error);
        throw new Error(`Failed to parse state file ${filePath}: Corrupted JSON.`); // Throw specific parsing error
    }
     else {
      // Log and re-throw other errors (permissions, disk errors, etc.)
      console.error(`Error loading state from ${filePath}:`, error);
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
  // Implementation needed
  throw new Error('serializeState not implemented');
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
  // Implementation needed
  throw new Error('deserializeState not implemented');
}