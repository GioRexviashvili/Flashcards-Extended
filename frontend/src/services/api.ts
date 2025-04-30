// 1. Import Axios and necessary types
import axios, { AxiosError } from "axios"; // Import Axios library and its error type

// Import the types we defined earlier to describe the data structures
import type {
  Flashcard,
  AnswerDifficulty,
  PracticeSession,
  UpdateRequest,
  ProgressStats,
} from "../types/index";

// 2. Define the Backend API Base URL
// This is the root URL for all your backend API endpoints.
// IMPORTANT: Make sure the port (3001) matches the port your backend server is running on.
const API_BASE_URL = "http://localhost:3001/api";

// 3. Create a pre-configured Axios instance
// This instance will automatically use the base URL for all requests.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- API Call Functions ---
/**
 * Fetches the practice cards for the current day from the backend.
 * Corresponds to: GET /api/practice
 * @returns A Promise that resolves with the PracticeSession data.
 */
export async function fetchPracticeCards(): Promise<PracticeSession> {
  console.log("API Service: Fetching practice cards...");
  try {
    // Use the apiClient to make a GET request to '/practice' (appends to baseURL)
    // We expect the response data to match the PracticeSession interface.
    const response = await apiClient.get<PracticeSession>("/practice");
    console.log("API Service: Practice cards received:", response.data);
    // Axios puts the actual response data inside the 'data' property
    return response.data;
  } catch (error) {
    console.error("API Service: Error fetching practice cards:", error);
    // Handle error appropriately - maybe re-throw or return a specific structure
    // Rethrowing allows the calling component to handle the error with its own try/catch
    throw error;
  }
}

/**
 * Updatesthe flashcard according to answer difficulty
 * Corresponds to: POST /api/update
 * @param cardFront - The front text of the card.
 * @param cardBack - The back text of the card.
 * @param difficulty - The difficulty level chosen by the user.
 * @returns A Promise that resolves when the update is successful (no data needed back).
 */
export async function submitAnswer(
  cardFront: string,
  cardBack: string,
  difficulty: AnswerDifficulty
): Promise<void> {
  console.log("API Service: Updating flashcard after answering...");
  const payload: UpdateRequest = {
    cardFront,
    cardBack,
    difficulty,
  };
  try {
    await apiClient.post<void>("/update", payload);
    console.log("API Service: Card updated");
  } catch (error) {
    console.error("API Service: Error updating card", error);
    throw error;
  }
}

/**
 * Fetches the hint for corresponding data.
 * @param card - The Flashcard object for which to fetch a hint.
 * @returns A Promise that resolves with the hint string.
 */
export async function fetchHint(card: Flashcard): Promise<string> {
  console.log('API Service: Fetching hint for "${card.front}..."');
  try {
    const response = await apiClient.get<{ hint: string }>("/hint", {
      params: {
        cardFront: card.front,
        cardBack: card.back,
      },
    });
    console.log("API Service: Hint Received: ", response.data.hint);
    return response.data.hint;
  } catch (error) {
    console.error("API Service: Error fetching hint:", error);
    throw error;
  }
}

/**
 * Fetches progressStats, history of all cards practiced by user
 * @returns A Promise that resolves object of ProgressStats which contain all info about history
 */
export async function fetchProgress(): Promise<ProgressStats> {
  console.log("API Service: Fetching ProgressStats...");
  try {
    const response = await apiClient.get<ProgressStats>("/progress");
    console.log("API Service: ProgressStats Received", response.data);
    return response.data;
  } catch (error) {
    console.error("API Service: Error fetching progress stats:", error);
    throw error;
  }
}

/**
 * Tells the backend to advance the current learning day.
 * Corresponds to: POST /api/day/next
 * @returns A Promise that resolves with the new current day number.
 */
export async function advanceDay(): Promise<number> {
  console.log("API Service: Advancing day...");
  try {
    const response = await apiClient.post<{ newDay: number }>("/day/next");
    console.log(
      "API Service: Day advanced successfully. New day:",
      response.data.newDay
    );
    return response.data.newDay;
  } catch (error) {
    console.error("API Service: Error advancing day:", error);
    throw error;
  }
}

// Add a helper function to check for Axios errors for more specific handling
export function isApiError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
