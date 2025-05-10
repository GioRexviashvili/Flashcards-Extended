// --- Imports ---

// We need these types to define the structure of our state variables.
import { Flashcard, BucketMap, AnswerDifficulty } from "./logic/flashcards";
import { PracticeRecord } from "./types";

// let create initial cards
const initialCards: Flashcard[] = [
  new Flashcard(
    "Who has scored the most goals in football history?",
    "Cristiano Ronaldo",
    "Messi is better, by the way",
    ["sport", "football"]
  ),
  new Flashcard(
    "Who holds the record for most 3-pointers in NBA history?",
    "Stephen Curry",
    "Golden Boy 👑",
    ["sport", "basketball"]
  ),
  new Flashcard(
    "Who won the historic sextuple in 2009?",
    "FC Barcelona",
    "Only club to win 6 trophies in a year 🏆🏆🏆🏆🏆🏆",
    ["sport", "football", "history"]
  ),
  new Flashcard(
    "Which footballer is known for the 'Siiuu' celebration?",
    "Cristiano Ronaldo",
    "You can hear it in your head",
    ["sport", "football"]
  ),
];

// initially, put all cards into 0 bucket
let currentBuckets: BucketMap = new Map();
currentBuckets.set(0, new Set(initialCards));

let practiceHistory: PracticeRecord[] = [];
let currentDay: number = 0;

// --- State Accessors & Mutators ---
// These are functions that other parts of our backend (like server.ts) will use
// to READ or CHANGE the state variables. This is good practice because it
// controls how the state is accessed and modified, preventing accidental errors.

/**
 * Gets the current state of all learning buckets.
 * @returns The BucketMap representing the current buckets.
 */
export function getBuckets(): BucketMap {
  return currentBuckets;
}

/**
 * Updates the entire bucket map.
 * @param newBuckets The new BucketMap to set.
 */
export function setBuckets(newBuckets: BucketMap): void {
  currentBuckets = newBuckets;
}

/**
 * Gets history of all practices.
 * @returns Array of practiceRecords
 */
export function getHistory() {
  return practiceHistory;
}

/**
 * Adds a single practice record into practiceHistory
 * @param PracticeRecord record of single card practice
 */
export function addHistoryRecord(record: PracticeRecord) {
  practiceHistory.push(record);
}

/**
 * Gets the current day number for the learning process.
 * @returns The current day number.
 */
export function getCurrentDay(): number {
  return currentDay;
}

/**
 * Increments the current day number by 1.
 */
export function incrementDay(): void {
  currentDay += 1;
  console.log(`Advanced to day: ${currentDay}`); // Log day change
}

// --- Helper Functions (Optional but Recommended) ---
// These functions make common tasks easier when interacting with the state.

/**
 * Finds and returns a Flashcard with the corresponding front and back
 * by searching through all cards in all current buckets.
 *
 * @param front string which indicates first side of the card
 * @param back string which indicates second side of the card
 * @returns Flashcard if there exists such flashcard with these front and back,
 *          otherwise undefined.
 */
export function findCard(front: string, back: string): Flashcard | undefined {
  // Iterate over each bucket in currentBuckets
  for (const cardsInBucket of currentBuckets.values()) {
    // Iterate over each card within that bucket's Set
    for (const card of cardsInBucket) {
      if (card.front === front && card.back === back) {
        return card;
      }
    }
  }
  return undefined;
}

/**
 * finds and returns index of bucket to which this flashcard belongs.
 *
 * @param cardToFind flashcard which's buckets whould be found.
 * @returns number if this flashcard exists in one of the buckets
 * @returns undedined if this flashcard does not exist in any bucket
 */
export function findCardBucket(cardToFind: Flashcard): number | undefined {
  for (let i = 0; i < currentBuckets.size; i++) {
    if (currentBuckets.get(i)?.has(cardToFind)) return i;
  }
  return undefined;
}

/**
 * Checks if all cards are in retired bucket
 */
export function isBucketMapEmpty(): boolean {
  if (
    currentBuckets.get(0)?.size == 0 &&
    currentBuckets.get(1)?.size == 0 &&
    currentBuckets.get(2)?.size == 0 &&
    currentBuckets.get(3)?.size == 0
  )
    return true;

  return false;
}


/**
 * Adds a new flashcard to Bucket 0.
 * If Bucket 0 does not exist, it will be created.
 * @param newCard The Flashcard object to add.
 */
export function addCard(newCard: Flashcard): void {
  if (!currentBuckets.has(0)) {
    console.log("Bucket 0 does not exist. Creating it.");
    currentBuckets.set(0, new Set<Flashcard>());
  }

  const bucketZero = currentBuckets.get(0)!; // We know it exists now
  bucketZero.add(newCard);
  console.log(`Card "${newCard.front}" added to Bucket 0.`);


}


/**
 * Checks if a flashcard with the given front and back already exists in any bucket.
 * @param front The front text of the card.
 * @param back The back text of the card.
 * @returns True if the card exists, false otherwise.
 */
export function doesCardExist(front: string, back: string): boolean {
  return findCard(front, back) !== undefined;
}


// --- Confirmation Log ---
// This runs once when the server starts and loads this file.
// Useful for confirming that the initial state was set up.
console.log(
  `Initial state loaded. ${initialCards.length} cards in bucket 0. Current day: ${currentDay}`
);
console.log("Initial buckets:", currentBuckets); // Log the initial map structure
