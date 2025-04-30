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
    "What is the capital of France?",
    "Paris",
    "Eiffel Tower city",
    ["geography"]
  ),
  new Flashcard("13 * 11", "141", "sum of digits of 13 place between of ones", [
    "math",
  ]),
  new Flashcard(
    "What planet is known as the Red Planet?",
    "Mars",
    "Fourth from the Sun",
    ["science"]
  ),
  new Flashcard(
    "Who holds the record for most 3-pointers in NBA history?",
    "Stephen Curry",
    "The 3-point king 👑",
    ["sport", "basketball"]
  ),
  new Flashcard(
    "Who is the fastest man in history?",
    "Usain Bolt",
    "100 metters in less than 10 seconds ⚡️",
    ["sport", "athletics"]
  ),
  new Flashcard(
    "Who wrote 'Hamlet'?",
    "William Shakespeare",
    "English playwright",
    ["literature"]
  ),
  new Flashcard(
    "What is the chemical symbol for water?",
    "H2O",
    "Two hydrogens",
    ["science"]
  ),
  new Flashcard(
    "Who painted the Mona Lisa?",
    "Leonardo da Vinci",
    "Italian artist",
    ["art"]
  ),
  new Flashcard(
    "What is the largest ocean?",
    "Pacific",
    "Between Asia and Americas",
    ["geography"]
  ),
  new Flashcard("What is the square root of 64?", "8", "Perfect square", [
    "math",
  ]),
  new Flashcard(
    "Who won the historic sextuple in 2009?",
    "FC Barcelona",
    "Only club to win 6 trophies in a year 🏆🏆🏆🏆🏆🏆",
    ["sport", "football", "history"]
  ),
  new Flashcard(
    "Who discovered gravity?",
    "Isaac Newton",
    "Falling apple story",
    ["science", "history"]
  ),
  new Flashcard(
    "What is the boiling point of water (°C)?",
    "100",
    "Triple digits",
    ["science"]
  ),
  new Flashcard("In what year did World War II end?", "1945", "Mid-40s", [
    "history",
  ]),
  new Flashcard(
    "Which language is spoken in Brazil?",
    "Portuguese",
    "Not Spanish",
    ["language"]
  ),
  new Flashcard("What is 7 x 6?", "42", "think as sum of six 7", ["math"]),
  new Flashcard(
    "Who is the NBA all-time leading scorer?",
    "LeBron James",
    "MJ fans stay mad",
    ["sport", "basketball"]
  ),
  new Flashcard("What is the smallest prime number?", "2", "Only even prime", [
    "math",
  ]),
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
 * finds and returns Flashcard with corresponding front and back.
 *
 * @param front string which indicates first side of the card
 * @param back string which indicates second side of the card
 * @returns Flashcard if there exist such flashcard with these front and back
 * @returns undefined if there does not exist such flashcard
 */
export function findCard(front: string, back: string): Flashcard | undefined {
  for (let i = 0; i < initialCards.length; i++) {
    if (initialCards[i].front == front && initialCards[i].back == back)
      return initialCards[i];
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

// --- Confirmation Log ---
// This runs once when the server starts and loads this file.
// Useful for confirming that the initial state was set up.
console.log(
  `Initial state loaded. ${initialCards.length} cards in bucket 0. Current day: ${currentDay}`
);
console.log("Initial buckets:", currentBuckets); // Log the initial map structure
