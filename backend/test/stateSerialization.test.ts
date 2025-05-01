import { Flashcard, BucketMap, AnswerDifficulty } from '../src/logic/flashcards.ts';
import { PracticeRecord } from '../src/types/index';
import fs from 'fs/promises'; // Import the actual module type for casting mocks

import {
  serializeState,
  deserializeState,
  SerializedState,
  SerializedFlashcard,
  // Import the I/O functions we will test
  saveStateToFile,
  loadStateFromFile,
} from '../src/logic/stateSerialization';

// --- Import and Mock 'fs/promises' ---
// jest.mock MUST be called outside of describe/it blocks
jest.mock('fs/promises');

// --- Test Helper Data (reuse existing data if needed) ---
const card1 = new Flashcard('Q1', 'A1', 'H1', ['tag1']);
const historyRecord1: PracticeRecord = {
    cardFront: 'Q1',
    cardBack: 'A1',
    timestamp: 1678886400000,
    difficulty: AnswerDifficulty.Easy,
    previousBucket: 0,
    newBucket: 1,
};
const mockSerializedState: SerializedState = {
    buckets: { '1': [{ front: 'Q1', back: 'A1', hint: 'H1', tags: ['tag1'] }] },
    history: [historyRecord1],
    day: 1,
};
const mockFilePath = './test-state.json';


// --- Existing Tests for serialize/deserialize ---
describe('State Serialization/Deserialization', () => {
    // ... (keep the existing describe blocks for serializeState and deserializeState) ...
});


// --- New Tests for File I/O ---
describe('File I/O for State', () => {

    // Define mocked functions for type safety and easier access
    let mockedWriteFile: jest.MockedFunction<typeof fs.writeFile>;
    let mockedReadFile: jest.MockedFunction<typeof fs.readFile>;

    beforeEach(() => {
        // Reset mocks before each test to ensure isolation
        jest.clearAllMocks();

        // Assign the mocked functions after clearing mocks
        mockedWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
        mockedReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    });

    // --- Tests for saveStateToFile ---
    describe('saveStateToFile', () => {
        it('should call fs.writeFile with the correct path and stringified data', async () => {
            // Arrange: Mock writeFile to resolve successfully
            mockedWriteFile.mockResolvedValue(undefined); // Simulate successful write

            const expectedJsonString = JSON.stringify(mockSerializedState, null, 2); // Pretty print JSON

            // Act
            await saveStateToFile(mockFilePath, mockSerializedState);

            // Assert
            expect(mockedWriteFile).toHaveBeenCalledTimes(1);
            expect(mockedWriteFile).toHaveBeenCalledWith(
                mockFilePath,
                expectedJsonString, // Verify the serialized string is passed
                'utf-8' // Verify encoding is specified
            );
        });

        it('should propagate errors from fs.writeFile', async () => {
            // Arrange: Mock writeFile to reject with an error
            const writeError = new Error('Disk full');
            mockedWriteFile.mockRejectedValue(writeError);

            // Act & Assert
            await expect(saveStateToFile(mockFilePath, mockSerializedState))
                .rejects.toThrow('Disk full');

            // Verify it was still called
             expect(mockedWriteFile).toHaveBeenCalledTimes(1);
             expect(mockedWriteFile).toHaveBeenCalledWith(
                 mockFilePath,
                 expect.any(String), // Don't need to check content on error usually
                 'utf-8'
             );
        });
    });

    // --- Tests for loadStateFromFile ---
    describe('loadStateFromFile', () => {
        it('should call fs.readFile with the correct path and return parsed JSON on success', async () => {
            // Arrange: Mock readFile to return valid JSON string
            const jsonString = JSON.stringify(mockSerializedState);
            mockedReadFile.mockResolvedValue(Buffer.from(jsonString, 'utf-8')); // readFile returns a Buffer

            // Act
            const result = await loadStateFromFile(mockFilePath);

            // Assert
            expect(mockedReadFile).toHaveBeenCalledTimes(1);
            expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
            expect(result).toEqual(mockSerializedState); // Should return the parsed object
        });

        it('should return null if fs.readFile throws ENOENT (file not found)', async () => {
            // Arrange: Mock readFile to throw a specific "file not found" error
            const fileNotFoundError = new Error('File not found') as NodeJS.ErrnoException;
            fileNotFoundError.code = 'ENOENT'; // Standard Node.js error code for "No Entity"
            mockedReadFile.mockRejectedValue(fileNotFoundError);

            // Act
            const result = await loadStateFromFile(mockFilePath);

            // Assert
            expect(mockedReadFile).toHaveBeenCalledTimes(1);
            expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
            expect(result).toBeNull(); // Expect null when file not found
        });

         it('should throw an error if fs.readFile throws an error other than ENOENT', async () => {
            // Arrange: Mock readFile to throw a generic permission error
            const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
            permissionError.code = 'EACCES';
            mockedReadFile.mockRejectedValue(permissionError);

            // Act & Assert
            await expect(loadStateFromFile(mockFilePath))
                .rejects.toThrow('Permission denied');

             expect(mockedReadFile).toHaveBeenCalledTimes(1);
             expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
        });

        it('should throw an error if the file content is corrupted JSON', async () => {
             // Arrange: Mock readFile to return invalid JSON
            const corruptedJson = '{ "buckets": { "0": [ }'; // Invalid JSON
            mockedReadFile.mockResolvedValue(Buffer.from(corruptedJson, 'utf-8'));

            // Act & Assert
            // Check for specific JSON parsing error message if possible, or a generic one
             await expect(loadStateFromFile(mockFilePath))
                 .rejects.toThrow(/Unexpected token .* JSON/i); // Jest matcher for JSON errors

             expect(mockedReadFile).toHaveBeenCalledTimes(1);
             expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
        });
    });
});