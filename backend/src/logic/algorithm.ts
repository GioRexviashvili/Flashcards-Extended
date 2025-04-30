/**
 * Problem Set 1: Flashcards - Algorithm Functions
 *
 * This file contains the implementations for the flashcard algorithm functions
 * as described in the problem set handout.
 *
 * Please DO NOT modify the signatures of the exported functions in this file,
 * or you risk failing the autograder.
 */

import { Flashcard, AnswerDifficulty, BucketMap } from "./flashcards";

import { PracticeRecord, ProgressStats } from "../types";

/**
 * Converts a Map representation of learning buckets into an Array-of-Set representation.
 *
 * @param buckets Map where keys are bucket numbers and values are sets of Flashcards.
 * @returns Array of Sets, where element at index i is the set of flashcards in bucket i.
 *          Buckets with no cards will have empty sets in the array.
 * @spec.requires buckets is a valid representation of flashcard buckets.
 */
export function toBucketSets(buckets: BucketMap): Array<Set<Flashcard>> {
  if (buckets.size === 0) return [];

  const maxBucket = Math.max(...Array.from(buckets.keys()));

  const result: Array<Set<Flashcard>> = Array.from(
    { length: maxBucket + 1 },
    () => new Set<Flashcard>()
  );

  buckets.forEach((cards, bucketIndex) => {
    result[bucketIndex] = cards;
  });

  return result;
}

/**
 * Finds the range of buckets that contain flashcards, as a rough measure of progress.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @returns object with minBucket and maxBucket properties representing the range,
 *          or undefined if no buckets contain cards.
 * @spec.requires buckets is a valid Array-of-Set representation of flashcard buckets.
 */
export function getBucketRange(
  buckets: Array<Set<Flashcard>>
): { minBucket: number; maxBucket: number } | undefined {
  let minBucket: number | undefined = undefined;
  let maxBucket: number | undefined = undefined;

  buckets.forEach((cards, bucketIndex) => {
    if (cards.size > 0) {
      if (minBucket === undefined) minBucket = bucketIndex;
      maxBucket = bucketIndex;
    }
  });

  return minBucket !== undefined && maxBucket !== undefined
    ? { minBucket, maxBucket }
    : undefined;
}

/**
 * Selects cards to practice on a particular day.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @param day current day number (starting from 0).
 * @returns a Set of Flashcards that should be practiced on day `day`,
 *          according to the Modified-Leitner algorithm.
 * @spec.requires buckets is a valid Array-of-Set representation of flashcard buckets.
 */
export function practice(
  buckets: Array<Set<Flashcard>>,
  day: number
): Set<Flashcard> {
  const reviewSet = new Set<Flashcard>();

  buckets.forEach((cards, bucketIndex) => {
    if (day % 2 ** bucketIndex === 0) {
      cards.forEach((card) => reviewSet.add(card));
    }
  });

  return reviewSet;
}

/**
 * Updates a card's bucket number after a practice trial.
 *
 * @param buckets Map representation of learning buckets.
 * @param card flashcard that was practiced.
 * @param difficulty how well the user did on the card in this practice trial.
 * @returns updated Map of learning buckets.
 * @spec.requires buckets is a valid representation of flashcard buckets.
 */
export function update(
  buckets: BucketMap,
  card: Flashcard,
  difficulty: AnswerDifficulty
): BucketMap {
  const updatedBuckets: BucketMap = new Map();

  for (const [index, cards] of buckets.entries()) {
    updatedBuckets.set(index, new Set(cards));
  }

  let currentBucket = -1;
  for (const [index, cards] of updatedBuckets.entries()) {
    if (cards.has(card)) {
      currentBucket = index;
      cards.delete(card);
      break;
    }
  }

  let newBucket: number;
  if (difficulty === AnswerDifficulty.Wrong) {
    newBucket = 0;
  } else if (difficulty === AnswerDifficulty.Hard) {
    newBucket = Math.max(0, currentBucket - 1);
  } else {
    newBucket = currentBucket + 1;
  }

  // when card is in bucket 4 and answerdifficulty was easy this bucket reached retired bucket
  //
  if (newBucket < 4) {
    // Ensure the new bucket exists
    if (!updatedBuckets.has(newBucket)) {
      updatedBuckets.set(newBucket, new Set());
    }
    updatedBuckets.get(newBucket)!.add(card);
  }

  return updatedBuckets;
}

/**
 * Generates a hint based on the flashcard front.
 *
 * @param card flashcard to generate hint from
 * @returns the first word of the flashcard front, followed by '...'
 *          Example: front = "What is 2+2?" → hint = "What..."
 * @spec.requires card.front is a non-empty string
 */

export function getHint(card: Flashcard): string {
  if (card.hint) {
    return card.hint;
  }
  return "No hint available for this card.";
}

/**
 * Computes statistics about the user's learning progress.
 *
 * @param buckets Map representation of learning buckets.
 * @param history Array of objects representing user's answer history,
 *                each with a `card` (Flashcard) and `difficulty` (AnswerDifficulty).
 * @returns an object containing:
 *   - totalFlashcards: total number of unique flashcards across all buckets.
 *   - bucketDistribution: a mapping from bucket number to number of cards.
 *   - accuracyRate: proportion of correct answers in history (Easy and Hard considered correct).
 *   - reviewsPerBucket: mapping from bucket number to how many cards were reviewed from it.
 * @spec.requires:
 *   - `buckets` is a valid BucketMap.
 *   - `history` contains only cards that appear in some bucket.
 */

export function computeProgress(
  buckets: BucketMap,
  history: PracticeRecord[]
): ProgressStats {
  const bucketDistribution: Record<number, number> = {};
  const reviewsPerBucket: Record<number, number> = {};
  let totalFlashcards = 0;
  let correctAnswers = 0;

  // 1. Calculate totalFlashcards and bucketDistribution from the current buckets state
  // We iterate through the map representing the *current* distribution of cards
  for (const [bucketNum, cardsInBucket] of buckets.entries()) {
    const count = cardsInBucket.size;
    bucketDistribution[bucketNum] = count;
    totalFlashcards += count;
    // Initialize reviewsPerBucket for known buckets, in case some buckets had no reviews in history
    if (!(bucketNum in reviewsPerBucket)) {
      reviewsPerBucket[bucketNum] = 0;
    }
  }

  // 2. Process the history to calculate accuracyRate and reviewsPerBucket
  for (const record of history) {
    // Increment review count for the bucket the card *was in* before the review
    const sourceBucket = record.previousBucket;
    reviewsPerBucket[sourceBucket] = (reviewsPerBucket[sourceBucket] || 0) + 1;

    // Check if the answer was correct (Easy or Hard)
    if (
      record.difficulty === AnswerDifficulty.Easy ||
      record.difficulty === AnswerDifficulty.Hard
    ) {
      correctAnswers += 1;
    }
  }

  // 3. Calculate accuracyRate (handle division by zero if history is empty)
  const accuracyRate =
    history.length === 0 ? 0 : correctAnswers / history.length;

  // 4. Return the results conforming to the ProgressStats interface
  return {
    totalFlashcards,
    bucketDistribution,
    accuracyRate,
    reviewsPerBucket,
  };
}
