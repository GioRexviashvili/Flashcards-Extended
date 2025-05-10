# Project TODO Checklist: Enhanced Flashcard App (Extension & Gestures)

## Phase 1: Backend Persistence Layer

_(Crucial prerequisite: Ensure cards created by the extension are saved permanently)_

- [x] **Step 1: State Serialization/Deserialization Helpers**

  - [x] Define and export TypeScript interface(s) for the serializable state structure (e.g., `{ buckets: Record<number, SerializedFlashcard[]>, history: PracticeRecord[], day: number }` where `SerializedFlashcard` is a plain object).
  - [x] Create `test/stateSerialization.test.ts`.
  - [x] Write unit tests for a `serializeState(buckets: BucketMap, history: PracticeRecord[], day: number): SerializedState` function. Cover Map<number, Set<Flashcard>> to plain object conversion.
  - [x] Write unit tests for a `deserializeState(data: SerializedState): { buckets: BucketMap, history: PracticeRecord[], day: number }` function. Cover plain object to Map/Set conversion. Handle potential errors in data format.
  - [x] Include tests for empty state, populated state, and state with history.
  - [x] Create `src/logic/stateSerialization.ts`.
  - [x] Implement the `serializeState` function.
  - [x] Implement the `deserializeState` function.
  - [x] Ensure all tests pass.

- [ ] **Step 2: File I/O for State**

  - [ ] Add tests to `test/stateSerialization.test.ts` for `saveStateToFile` and `loadStateFromFile`.
  - [ ] Test `saveStateToFile` writes correctly formatted JSON (mock `fs/promises` or use temporary files/directories).
  - [ ] Test `loadStateFromFile` handles finding and parsing a valid JSON file.
  - [ ] Test `loadStateFromFile` handles file not found gracefully (e.g., returns null or throws specific error).
  - [ ] Test `loadStateFromFile` handles corrupted/invalid JSON gracefully.
  - [ ] Implement `saveStateToFile(filePath: string, state: SerializedState): Promise<void>` in `src/logic/stateSerialization.ts` (using `fs/promises.writeFile`).
  - [ ] Implement `loadStateFromFile(filePath: string): Promise<SerializedState | null>` in `src/logic/stateSerialization.ts` (using `fs/promises.readFile`, handle errors).
  - [ ] Define a constant for the state file path (e.g., `STATE_FILE_PATH = './flashcard_state.json'`).
  - [ ] Ensure all tests pass.

- [ ] **Step 3: Load State on Server Startup**

  - [ ] Import `loadStateFromFile`, `deserializeState`, `STATE_FILE_PATH` into `src/state.ts`.
  - [ ] Create an `initializeState(): Promise<void>` async function in `src/state.ts`.
  - [ ] Implement logic in `initializeState`:
    - [ ] Attempt to call `loadStateFromFile`.
    - [ ] If successful, call `deserializeState` and update the in-memory state variables (`currentBuckets`, `practiceHistory`, `currentDay`).
    - [ ] If file not found or load fails, log a warning and use the initial default state (as currently defined).
    - [ ] Handle potential errors during deserialization gracefully (log and use defaults).
  - [ ] Add logging within `initializeState` (e.g., "Loading state from file...", "State loaded successfully.", "No state file found/Error loading state, using initial state.").
  - [ ] Modify `src/server.ts`:
    - [ ] Import `initializeState` from `src/state.ts`.
    - [ ] Make the top-level server startup logic async (`async () => { ... }();`).
    - [ ] Call `await initializeState()` _before_ `app.listen()`.

- [ ] **Step 4: Save State on Graceful Shutdown**

  - [ ] Import `saveStateToFile`, `serializeState`, `STATE_FILE_PATH` and state getters (`getBuckets`, `getHistory`, `getCurrentDay`) into `src/server.ts`.
  - [ ] Define an `handleShutdown = async (signal: string): Promise<void>` function in `server.ts`.
  - [ ] Add a simple flag (e.g., `isShuttingDown = false`) to prevent multiple saves during shutdown.
  - [ ] Implement logic in `handleShutdown`:
    - [ ] Check and set the `isShuttingDown` flag.
    - [ ] Log the received signal (e.g., "Received ${signal}. Saving state...").
    - [ ] Get current state using getters.
    - [ ] Call `serializeState`.
    - [ ] Call `await saveStateToFile`.
    - [ ] Log success or failure of saving state.
    - [ ] Call `process.exit(0)` after saving (or appropriate exit code).
  - [ ] Register shutdown handlers in `server.ts`:
    - [ ] `process.on('SIGINT', () => handleShutdown('SIGINT'));`
    - [ ] `process.on('SIGTERM', () => handleShutdown('SIGTERM'));`

- [ ] **Step 5: Manual Test: Persistence**
  - [ ] Start the backend server (`npm run dev` or `npm start`).
  - [ ] Use the frontend app to practice a few cards, changing their buckets.
  - [ ] Stop the backend server using Ctrl+C (SIGINT). Check logs for save confirmation.
  - [ ] Inspect the created `flashcard_state.json` file (optional).
  - [ ] Restart the backend server. Check logs for load confirmation.
  - [ ] Use the frontend app and verify that the card progress was persisted.

## Phase 2: Backend API for Browser Extension

- [ ] **Step 6: Enhance `Flashcard` Class and State Management**

  - [x] Review `src/logic/flashcards.ts`: Ensure `Flashcard` constructor can handle potentially optional `hint` and `tags`. If not, update it (e.g., make `hint` optional, accept `tags` defaulting to `[]`).
  - [x] Review `src/state.ts`:
    - [x] Consider adding an `addCard(card: Flashcard): void` function to encapsulate adding a new card to Bucket 0 and updating `currentBuckets`. This function should handle creating Bucket 0 if it doesn't exist.
    - [x] Ensure `findCard(front: string, back: string)` correctly searches through _all_ cards managed by the state (including newly added ones, not just `initialCards`). You might need to iterate through all buckets in `currentBuckets`.
    - [x] Consider adding a helper `doesCardExist(front: string, back: string): boolean` in `state.ts` for efficiency.

- [x] **Step 7: Implement `POST /api/cards` Endpoint**
  - [x] Define the API request body structure in `src/types/index.ts` (e.g., `interface CreateCardRequest { front: string; back: string; hint?: string; tags?: string[]; }`).
  - [x] In `src/server.ts`:
    - [x] Add a new route handler: `app.post('/api/cards', async (req: Request, res: Response) => { ... });`.
    - [x] Import `CreateCardRequest` type and the `addCard` / `doesCardExist` helpers from `state.ts`.
    - [x] Implement the route handler logic:
      - [x] Extract `front`, `back`, `hint`, `tags` from `req.body as CreateCardRequest`.
      - [x] Validate required fields (`front`, `back`). Respond with 400 Bad Request if invalid.
      - [x] (Optional but recommended) Check if a card with the same front/back already exists using `doesCardExist`. Respond with 409 Conflict if duplicate.
      - [x] Create a new `Flashcard` instance: `new Flashcard(front, back, hint || '', tags || [])`.
      - [x] Call the `addCard(newCard)` function from `state.ts` to add it to Bucket 0.
      - [x] Respond with 201 Created status and potentially the created card object `{ message: "Card created successfully", card: newCard }`.
      - [x] Include robust `try...catch` block for error handling (respond with 500 Internal Server Error).
  - [x] Add basic logging within the endpoint (request received, validation result, card created/duplicate, errors).

## Phase 3: Browser Extension Frontend & Logic

- [ ] **Step 8: Basic Extension Structure & Manifest**

  - [X] Create `extension/` directory at the root of your project (alongside `backend/` and `frontend/`).
  - [X] Create `extension/manifest.json` (Manifest V3).
  - [X] Configure `manifest.json`:
    - [X] `manifest_version`: 3
    - [X] `name`: "Flashcard Quick Creator" (or similar)
    - [X] `version`: "1.0"
    - [X] `description`: "Select text on any page to create flashcards."
    - [X] `permissions`: [`contextMenus`, `storage`, `activeTab`, `scripting`] (add `notifications` later if needed).
    - [X] `host_permissions`: [`http://localhost:3001/*`] (for API calls).
    - [X] `background`: `{ "service_worker": "background.js" }`
    - [X] `action`: `{ "default_popup": "popup.html", "default_title": "Create Flashcard" }` (for the input form).

- [X] **Step 9: Context Menu & Background Script**

  -[X] Create `extension/background.js`.
  - [X] Implement `chrome.runtime.onInstalled` listener in `background.js` to create a context menu item:
    - [X] `chrome.contextMenus.create({ id: "createFlashcard", title: "Create Flashcard from '%s'", contexts: ["selection"] });`
  - [X] Implement `chrome.contextMenus.onClicked` listener in `background.js`:
    - [X] Check if `info.menuItemId === "createFlashcard"` and `info.selectionText`.
    - [X] Get the selected text: `const backText = info.selectionText;`
    - [X] Store the `backText` temporarily using `chrome.storage.local.set({ cardBack: backText })`.
    - [X] Trigger the extension's popup (it will read the stored text): `chrome.action.openPopup()` might work, or you may need `chrome.windows.create` if `openPopup` isn't reliable from context menu click. Research best V3 approach.
  - [X] Test loading the unpacked extension in your browser. Select text, right-click, see the menu item. Clicking it should (for now) just store the text (check extension dev tools storage).

- [ ] **Step 10: Card Creation Popup UI & Logic**

  - [ ] Create `extension/popup.html`.
  - [ ] Design the HTML form in `popup.html`:
    - [ ] Label and `textarea` for "Front".
    - [ ] Read-only display area (e.g., `div` or disabled `textarea`) for "Back" (to be populated).
    - [ ] (Optional) Input field for "Hint".
    - [ ] (Optional) Input field for "Tags" (comma-separated).
    - [ ] "Save Card" button.
    - [ ] Placeholder for status/error messages.
  - [ ] Create `extension/popup.js`.
  - [ ] Implement `popup.js`:
    - [ ] Add event listener `DOMContentLoaded`.
    - [ ] Inside listener: Use `chrome.storage.local.get(['cardBack'], (result) => { ... })` to retrieve the stored back text.
    - [ ] Populate the "Back" display area with `result.cardBack`.
    - [ ] Add event listener to the "Save Card" button.
    - [ ] In the save button listener:
      - [ ] Read values from "Front", "Hint", "Tags" fields.
      - [ ] Perform basic validation (Front text is required). Show error in popup if invalid.
      - [ ] Prepare the data payload: `{ front: ..., back: result.cardBack, hint: ..., tags: tags.split(',').map(t => t.trim()).filter(Boolean) }`.
      - [ ] Use `fetch('http://localhost:3001/api/cards', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) })`.
      - [ ] Handle `fetch` response:
        - [ ] If `response.ok` (e.g., 201): Show success message in popup, maybe close popup (`window.close()`). Clear stored `cardBack`.
        - [ ] If 409 Conflict: Show "Card already exists" message.
        - [ ] If 400 Bad Request: Show validation error message.
        - [ ] Otherwise (e.g., 500, network error): Show generic error message.
      - [ ] Handle `fetch` `catch` block for network errors.

- [ ] **Step 11: Manual Test: Full Extension Flow**
  - [ ] Ensure backend is running (with persistence working).
  - [ ] Reload the unpacked extension.
  - [ ] Go to any webpage, select some text.
  - [ ] Right-click -> "Create Flashcard from '...'"
  - [ ] Verify the popup opens and the selected text is shown as the "Back".
  - [ ] Enter text for the "Front". Add optional hint/tags.
  - [ ] Click "Save Card".
  - [ ] Verify success message and popup closes (or appropriate feedback).
  - [ ] Test error cases: saving without front text, saving a duplicate card (if implemented).
  - [ ] Go to your main frontend application (`http://localhost:xxxx`).
  - [ ] Practice cards and verify the newly created card appears in the session (it should be in Bucket 0, so likely appears soon).

## Phase 4: Frontend Gesture Recognition Integration

- [ ] **Step 12: Webcam Access & UI Elements**

  - [ ] Modify `frontend/src/components/PracticeView.tsx`.
  - [ ] Add state variables:
    - [ ] `isWebcamEnabled: boolean` (tracks if user wants webcam active)
    - [ ] `webcamStream: MediaStream | null`
    - [ ] `webcamError: string | null`
    - [ ] `isWebcamInitializing: boolean`
  - [ ] Add UI elements:
    - [ ] A button "Enable Webcam Gestures".
    - [ ] A `<video>` element (e.g., `#webcamFeed`, initially hidden or small preview). Ensure `muted`, `autoPlay`, `playsInline` attributes.
    - [ ] Conditional UI for displaying errors (`webcamError`).
    - [ ] Conditional UI for initialization (`isWebcamInitializing`).
  - [ ] Implement `startWebcam` async function:
    - [ ] Set `isWebcamInitializing = true`, `webcamError = null`.
    - [ ] Use `try...catch` around `navigator.mediaDevices.getUserMedia({ video: true })`.
    - [ ] On success: Get the stream, set `webcamStream`, set video element's `srcObject`, set `isWebcamEnabled = true`.
    - [ ] On error: Catch specific errors (e.g., `NotAllowedError`, `NotFoundError`), set `webcamError` state with user-friendly message.
    - [ ] Finally: Set `isWebcamInitializing = false`.
  - [ ] Wire the "Enable Webcam Gestures" button to call `startWebcam`.
  - [ ] Add `useEffect` hook to cleanup (stop stream tracks) when component unmounts or `isWebcamEnabled` becomes false: `stream?.getTracks().forEach(track => track.stop());`.

- [ ] **Step 13: Hand Pose Detection Library Setup**

  - [ ] Install TensorFlow.js dependencies: `npm install @tensorflow/tfjs-core @tensorflow/tfjs-backend-webgl @tensorflow-models/hand-pose-detection` in `frontend/` directory.
  - [ ] Import necessary modules in `PracticeView.tsx`:
    - [ ] `import * as tf from '@tensorflow/tfjs-core';`
    - [ ] `import '@tensorflow/tfjs-backend-webgl';`
    - [ ] `import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';`
  - [ ] Add state variables:
    - [ ] `handDetector: handPoseDetection.HandDetector | null`
    - [ ] `isModelLoading: boolean`
  - [ ] Implement `loadHandPoseModel` async function:
    - [ ] Set `isModelLoading = true`.
    - [ ] `await tf.setBackend('webgl');`
    - [ ] `const model = handPoseDetection.SupportedModels.MediaPipeHands;`
    - [ ] `const detectorConfig = { runtime: 'tfjs', modelType: 'lite' }; // or 'full'`
    - [ ] `const detector = await handPoseDetection.createDetector(model, detectorConfig);`
    - [ ] Set `handDetector` state.
    - [ ] Log success message.
    - [ ] Handle errors with `try...catch`, log error, maybe set an error state.
    - [ ] Finally: Set `isModelLoading = false`.
  - [ ] Modify `startWebcam` or add `useEffect` watching `webcamStream` to call `loadHandPoseModel` _after_ the webcam stream is ready.

- [ ] **Step 14: Gesture Detection Loop & Basic Recognition Logic**

  - [ ] Add state variables:
    - [ ] `isDetectingGestures: boolean` (controls the loop)
    - [ ] `currentDetectedGesture: string | null` (e.g., 'ThumbUp', 'ThumbDown', 'FlatHand', 'None')
  - [ ] Add UI element: Button "Start Gesture Input" (visible only when webcam/model ready and answer not shown).
  - [ ] Create `gestureDetectionLoop` async function.
  - [ ] Implement `startGestureDetection`: Set `isDetectingGestures = true`, call `gestureDetectionLoop`.
  - [ ] Implement `stopGestureDetection`: Set `isDetectingGestures = false`.
  - [ ] Implement `gestureDetectionLoop` logic:
    - [ ] Get reference to the `<video>` element.
    - [ ] If `!isDetectingGestures || !handDetector || !videoElement.readyState >= 3` return (stop loop).
    - [ ] `const hands = await handDetector.estimateHands(videoElement);`
    - [ ] Implement `identifyGesture(hands: handPoseDetection.Hand[]): string | null` helper function:
      - [ ] If `hands.length === 0`, return `null`.
      - [ ] Get landmarks from the first detected hand (`hands[0].keypoints`).
      - [ ] **Implement logic to detect Thumb Up:** (e.g., thumb tip Y coordinate significantly above thumb MCP Y, other fingertips Y below their respective PIPs/MCPs).
      - [ ] **Implement logic to detect Thumb Down:** (e.g., thumb tip Y significantly below thumb MCP Y, other fingertips Y below their PIPs/MCPs).
      - [ ] **Implement logic to detect Flat Hand:** (e.g., all fingertips Y roughly aligned and above their PIPs/MCPs, thumb maybe to the side).
      - [ ] Return 'ThumbUp', 'ThumbDown', 'FlatHand', or `null`. _This requires experimentation._
    - [ ] `const gesture = identifyGesture(hands);`
    - [ ] Set `currentDetectedGesture` state (for potential UI feedback).
    - [ ] Use `requestAnimationFrame(gestureDetectionLoop)` to continue the loop efficiently.
  - [ ] Wire "Start Gesture Input" button to `startGestureDetection`.
  - [ ] Ensure `stopGestureDetection` is called when:
    - [ ] User clicks "Show Answer".
    - [ ] An answer is submitted (by gesture or button).
    - [ ] The component unmounts or webcam is disabled.

- [ ] **Step 15: Gesture Confirmation & Triggering Action**

  - [ ] Add state variables:
    - [ ] `confirmingGesture: string | null` (The gesture being held)
    - [ ] `confirmStartTime: number | null` (Timestamp when confirmation started)
  - [ ] Define constant: `CONFIRM_DURATION = 2000; // ms` (adjust as needed).
  - [ ] Modify the `gestureDetectionLoop` after `const gesture = identifyGesture(hands);`:
    - [ ] If `gesture` is one of the target gestures ('ThumbUp', 'ThumbDown', 'FlatHand'):
      - [ ] If `gesture === confirmingGesture`:
        - [ ] Check if `Date.now() - confirmStartTime >= CONFIRM_DURATION`.
        - [ ] If yes:
          - [ ] `stopGestureDetection()`.
          - [ ] Map `gesture` to `AnswerDifficulty` (e.g., ThumbUp -> Easy, ThumbDown -> Wrong, FlatHand -> Hard).
          - [ ] Call the existing `handleAnswer(mappedDifficulty)` function.
          - [ ] Reset `confirmingGesture = null`, `confirmStartTime = null`.
      - [ ] Else (`gesture !== confirmingGesture`):
        - [ ] Start confirmation: Set `confirmingGesture = gesture`, `confirmStartTime = Date.now()`.
    - [ ] Else (`gesture` is null or not a target gesture):
      - [ ] Reset confirmation: Set `confirmingGesture = null`, `confirmStartTime = null`.
  - [ ] Add visual feedback to the UI based on `confirmingGesture` and `confirmStartTime` (e.g., highlight an icon, show a progress timer).

- [ ] **Step 16: Integration & User Experience Refinements**

  - [ ] Ensure gesture detection only runs when the answer is hidden.
  - [ ] Ensure the "Start Gesture Input" button is clearly visible and enabled/disabled appropriately.
  - [ ] Provide clear visual feedback during detection and confirmation.
  - [ ] Ensure clicking the regular difficulty buttons still works and correctly stops any active gesture detection/confirmation.
  - [ ] Consider edge cases: What if the user moves their hand away during confirmation? (Should reset). What if detection is slow?

- [ ] **Step 17: Manual Test: Gesture Recognition**
  - [ ] Test enabling the webcam (allow/deny permissions).
  - [ ] Test loading the hand pose model.
  - [ ] Test starting gesture detection.
  - [ ] Test making each gesture (Thumb Up, Thumb Down, Flat Hand) and holding it for the confirmation duration.
    - [ ] Verify the correct `handleAnswer` action is triggered.
    - [ ] Verify the next card loads.
  - [ ] Test changing gestures during confirmation (should reset timer).
  - [ ] Test moving hand out of view during confirmation (should reset).
  - [ ] Test interaction with "Show Answer" button (should stop detection).
  - [ ] Test interaction with regular difficulty buttons (should work and stop detection).
  - [ ] Test performance and accuracy on your machine.

---
