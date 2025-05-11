import { Flashcard, BucketMap, AnswerDifficulty } from "./logic/flashcards";
import { PracticeRecord } from "./types";
import {
  loadStateFromFile,
  deserializeState,
  STATE_FILE_PATH,
  serializeState
} from "./logic/stateSerialization";
import fs from 'fs/promises';
import path from 'path';
 
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
  new Flashcard("Which language is spoken in Brazil?", "Portuguese", "Not Spanish", ["language"]),
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
 
// Initial state setup
let currentBuckets: BucketMap = new Map();
currentBuckets.set(0, new Set(initialCards));
let practiceHistory: PracticeRecord[] = [];
let currentDay: number = 0;
 
// --- State Accessors & Mutators ---
export function getBuckets(): BucketMap {
  return currentBuckets;
}
 
export function setBuckets(newBuckets: BucketMap): void {
  currentBuckets = newBuckets;
}
 
export function getHistory() {
  return practiceHistory;
}
 
export function addHistoryRecord(record: PracticeRecord) {
  practiceHistory.push(record);
}
 
export function getCurrentDay(): number {
  return currentDay;
}
 
export function incrementDay(): void {
  currentDay += 1;
  console.log(`Advanced to day: ${currentDay}`);
}
 
// --- Helper Functions ---
export function findCard(front: string, back: string): Flashcard | undefined {
  for (const cardsInBucket of currentBuckets.values()) {
    for (const card of cardsInBucket) {
      if (card.front === front && card.back === back) {
        return card;
      }
    }
  }
  return undefined;
}
 
export function findCardBucket(cardToFind: Flashcard): number | undefined {
  for (let i = 0; i < currentBuckets.size; i++) {
    if (currentBuckets.get(i)?.has(cardToFind)) return i;
  }
  return undefined;
}
 
export function isBucketMapEmpty(): boolean {
  return (
    currentBuckets.get(0)?.size === 0 &&
    currentBuckets.get(1)?.size === 0 &&
    currentBuckets.get(2)?.size === 0 &&
    currentBuckets.get(3)?.size === 0
  );
}
 
export function addCard(newCard: Flashcard): void {
  if (!currentBuckets.has(0)) {
    currentBuckets.set(0, new Set<Flashcard>());
  }
  const bucketZero = currentBuckets.get(0)!;
  bucketZero.add(newCard);
  console.log(`Card "${newCard.front}" added to Bucket 0.`);
}
 
export function doesCardExist(front: string, back: string): boolean {
  return findCard(front, back) !== undefined;
}
 
// --- Confirmation Log ---
console.log(
  `Initial state loaded. ${initialCards.length} cards in bucket 0. Current day: ${currentDay}`
);
 
// --- Initialize State Function ---
/**
 * Initializes the application state by attempting to load from a persisted file.
 * Falls back to the default initial state if loading fails.
 */
export async function initializeState(): Promise<void> {
  console.log("Initializing application state...");
 
  try {
    console.log(`Attempting to load state from file: ${STATE_FILE_PATH}`);
    const serializedState = await loadStateFromFile(STATE_FILE_PATH);
 
    if (serializedState === null) {
      console.log("No saved state found. Creating default state file...");
     
      // Create default state
      const defaultState = serializeState(currentBuckets, practiceHistory, currentDay);
     
      // Ensure directory exists and save
      await fs.mkdir(path.dirname(STATE_FILE_PATH), { recursive: true });
      await fs.writeFile(STATE_FILE_PATH, JSON.stringify(defaultState, null, 2));
     
      console.log("Default state file created successfully.");
      return;
    }
 
    console.log("Deserializing saved state...");
    const deserializedState = deserializeState(serializedState);
 
    // Update in-memory state
    currentBuckets = deserializedState.buckets;
    practiceHistory = deserializedState.history;
    currentDay = deserializedState.day;
 
    const totalCards = Array.from(currentBuckets.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );
 
    console.log(`State loaded. Day: ${currentDay}, Cards: ${totalCards}`);
  } catch (error) {
    console.error("State initialization error:", error instanceof Error ? error.message : error);
   
    // Fallback to initial state
    currentBuckets = new Map();
    currentBuckets.set(0, new Set(initialCards));
    practiceHistory = [];
    currentDay = 0;
   
    console.log("Using default initial state.");
  }
}
 