import type { Flashcard, AnswerDifficulty, BucketMap } from "@logic/flashcards";

// === API Data Structures ===

/**
 * Represents the data for a practice session, including the cards
 * to be reviewed and the current day number for scheduling.
 */
export interface PracticeSession {
  cards: Flashcard[];
  day: number;
  retired?: boolean;
}

/**
 * represent the request body for updating card place into bucket 
 * according to how difficult it was answered
 * during practice.
 */
export interface UpdateRequest {
  cardFront: string;
  cardBack: string;
  difficulty: AnswerDifficulty;
}

/**
 * Represents the data needed to identify a card for which
 * a hint is requested. Often derived from query parameters.
 */
export interface HintRequest {
  cardFront: string;
  cardBack: string;
}

/**
 * Represents the statistics calculated by the computeProgress function.
 * 
 * totalFlashcards: The total number of unique flashcards across all buckets.
 * bucketDistribution: A mapping from bucket number to the number of cards currently in that bucket.
     * Example: { 0: 10, 1: 5, 3: 2 }

  * accuracyRate: The proportion of correct answers (Easy or Hard) in the provided history.
     * A value between 0 and 1 (inclusive).

  * reviewsPerBucket: A mapping from bucket number to the total number of times cards
     * belonging to that bucket (at the time of calculation) appeared in the review history.
     * Example: { 0: 25, 1: 10, 3: 4 }
 */
export interface ProgressStats {
  totalFlashcards: number;
  bucketDistribution: Record<number, number>;
  accuracyRate: number;
  reviewsPerBucket: Record<number, number>;
}

/**
 * Represents the history input structure
 */
export interface PracticeRecord {
  cardFront: string;
  cardBack: string;
  timestamp: number;
  difficulty: AnswerDifficulty;
  previousBucket: number;
  newBucket: number;
}

/**
 * Represents the data structure for a request to create a new flashcard.
 * Sent by the client (e.g., browser extension) in the body of a POST request.
 */
export interface CreateCardRequest {
  front: string;   
  back: string;    
  hint?: string;   
  tags?: string[]; 
}