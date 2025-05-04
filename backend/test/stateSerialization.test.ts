import { Flashcard, BucketMap, AnswerDifficulty } from '../src/logic/flashcards';
import { PracticeRecord } from '../src/types/index';
import fs from 'fs/promises';

import {
  serializeState,
  deserializeState,
  SerializedState,
  SerializedFlashcard,
  saveStateToFile,
  loadStateFromFile,
} from '../src/logic/stateSerialization';

// --- Mock 'fs/promises' ---
jest.mock('fs/promises');

// --- Test Helper Data ---
const card1 = new Flashcard('Q1', 'A1', 'H1', ['tag1']);
const card2 = new Flashcard('Q2', 'A2', 'H2', ['tag2', 'tag1']);
const card3 = new Flashcard('Q3', 'A3', 'H3', []);

const historyRecord1: PracticeRecord = {
    cardFront: 'Q1',
    cardBack: 'A1',
    timestamp: 1678886400000,
    difficulty: AnswerDifficulty.Easy,
    previousBucket: 0,
    newBucket: 1,
};
const historyRecord2: PracticeRecord = {
    cardFront: 'Q2',
    cardBack: 'A2',
    timestamp: 1678886500000,
    difficulty: AnswerDifficulty.Wrong,
    previousBucket: 1,
    newBucket: 0,
};

const mockSerializedState: SerializedState = {
    buckets: { '1': [{ front: 'Q1', back: 'A1', hint: 'H1', tags: ['tag1'] }] },
    history: [historyRecord1],
    day: 1,
};
const mockFilePath = './test-state.json';

// --- Tests for State Serialization/Deserialization ---
describe('State Serialization/Deserialization Logic', () => {

  describe('serializeState', () => {
    it('should correctly serialize an empty state', () => {
      const emptyBuckets: BucketMap = new Map();
      const emptyHistory: PracticeRecord[] = [];
      const day = 0;

      const expected: SerializedState = {
        buckets: {},
        history: [],
        day: 0,
      };

      expect(serializeState(emptyBuckets, emptyHistory, day)).toEqual(expected);
    });

    it('should correctly serialize a populated state with multiple buckets and history', () => {
        const buckets: BucketMap = new Map();
        buckets.set(0, new Set([card2])); // Card 2 in bucket 0
        buckets.set(1, new Set([card1, card3])); // Card 1 and 3 in bucket 1

        const history = [historyRecord1, historyRecord2];
        const day = 5;

        const serializedCard1: SerializedFlashcard = { front: 'Q1', back: 'A1', hint: 'H1', tags: ['tag1'] };
        const serializedCard2: SerializedFlashcard = { front: 'Q2', back: 'A2', hint: 'H2', tags: ['tag2', 'tag1'] };
        const serializedCard3: SerializedFlashcard = { front: 'Q3', back: 'A3', hint: 'H3', tags: [] };

        const expected: SerializedState = {
          buckets: {
            // Keys MUST be strings for JSON compatibility
            '0': [serializedCard2],
            '1': [serializedCard1, serializedCard3], // Use arrayContaining if order isn't guaranteed
          },
          history: history,
          day: 5,
        };

        const actual = serializeState(buckets, history, day);

        expect(actual.day).toEqual(expected.day);
        expect(actual.history).toEqual(expected.history);
        expect(Object.keys(actual.buckets).sort()).toEqual(Object.keys(expected.buckets).sort());

        // Use arrayContaining because Set iteration order isn't strictly guaranteed
        expect(actual.buckets['0']).toEqual(expect.arrayContaining(expected.buckets['0']));
        expect(actual.buckets['1']).toEqual(expect.arrayContaining(expected.buckets['1']));
        // Check length to ensure no extra/missing cards
        expect(actual.buckets['0'].length).toBe(expected.buckets['0'].length);
        expect(actual.buckets['1'].length).toBe(expected.buckets['1'].length);
    });

     it('should handle buckets with no cards (empty sets)', () => {
        const buckets: BucketMap = new Map();
        buckets.set(0, new Set()); // Empty bucket 0
        buckets.set(2, new Set([card1])); // Card 1 in bucket 2

        const expected: SerializedState = {
          buckets: {
            '0': [],
            '2': [{ front: 'Q1', back: 'A1', hint: 'H1', tags: ['tag1'] }],
          },
          history: [],
          day: 0,
        };
         const actual = serializeState(buckets, [], 0);
         expect(actual.buckets['0']).toEqual([]);
         expect(actual.buckets['2']).toEqual(expected.buckets['2']);
         expect(Object.keys(actual.buckets).sort()).toEqual(['0', '2']);
    });
  });

  describe('deserializeState', () => {
      it('should correctly deserialize valid serialized data into live state format', () => {
          const serializedCard1: SerializedFlashcard = { front: 'Q1', back: 'A1', hint: 'H1', tags: ['tag1'] };
          const serializedCard2: SerializedFlashcard = { front: 'Q2', back: 'A2', hint: undefined, tags: ['tag2', 'tag1'] };

          const inputData: SerializedState = {
              buckets: {
                  '0': [serializedCard2], // Bucket 0 has card 2
                  '2': [serializedCard1], // Bucket 2 has card 1
              },
              history: [historyRecord1],
              day: 3,
          };

          const { buckets, history, day } = deserializeState(inputData);

          expect(day).toBe(3);
          expect(history).toEqual([historyRecord1]);

          expect(buckets).toBeInstanceOf(Map);
          expect(buckets.size).toBe(2);

          // Check Bucket 0
          expect(buckets.has(0)).toBe(true);
          const bucket0 = buckets.get(0);
          expect(bucket0).toBeInstanceOf(Set);
          expect(bucket0?.size).toBe(1);
          const cardInBucket0 = Array.from(bucket0!)[0];
          expect(cardInBucket0).toBeInstanceOf(Flashcard);
          expect(cardInBucket0.front).toBe('Q2');
          expect(cardInBucket0.back).toBe('A2');
          expect(cardInBucket0.hint).toBe(''); // Ensure default empty string if undefined/missing in source
          expect(cardInBucket0.tags).toEqual(['tag2', 'tag1']);

          // Check Bucket 2
          expect(buckets.has(2)).toBe(true);
          const bucket2 = buckets.get(2);
          expect(bucket2).toBeInstanceOf(Set);
          expect(bucket2?.size).toBe(1);
          const cardInBucket2 = Array.from(bucket2!)[0];
          expect(cardInBucket2).toBeInstanceOf(Flashcard);
          expect(cardInBucket2.front).toBe('Q1');
          expect(cardInBucket2.back).toBe('A1');
          expect(cardInBucket2.hint).toBe('H1');
          expect(cardInBucket2.tags).toEqual(['tag1']);

          expect(buckets.has(1)).toBe(false); // Check non-existent bucket
      });

       it('should correctly deserialize an empty state', () => {
          const inputData: SerializedState = {
              buckets: {},
              history: [],
              day: 0,
          };
          const { buckets, history, day } = deserializeState(inputData);

          expect(day).toBe(0);
          expect(history).toEqual([]);
          expect(buckets).toBeInstanceOf(Map);
          expect(buckets.size).toBe(0);
      });

       it('should throw an error for invalid top-level structure', () => {
           const invalidData: any = null;
           expect(() => deserializeState(invalidData)).toThrow(/invalid serialized state format/i);
       });

       it('should throw an error for invalid bucket structure (not an object)', () => {
           const invalidData: any = {
               buckets: [], // Should be an object/Record
               history: [],
               day: 0,
           };
           expect(() => deserializeState(invalidData)).toThrow(/invalid serialized state format/i);
       });

       it('should throw an error for invalid bucket content (not an array)', () => {
           const invalidData: SerializedState = {
               buckets: {
                   '0': {} as any, // Should be an array
               },
               history: [],
               day: 0,
           };
           expect(() => deserializeState(invalidData)).toThrow(/invalid format for bucket key/i);
       });

       it('should throw an error if a card object is missing required fields (front/back)', () => {
           const invalidData: SerializedState = {
               buckets: {
                   '0': [{ back: 'A1', tags: [] } as any], // Missing 'front'
               },
               history: [],
               day: 0,
           };
           expect(() => deserializeState(invalidData)).toThrow(/invalid card data/i);
       });

       it('should throw an error if bucket key is not a valid number string', () => {
            const invalidData: SerializedState = {
               buckets: {
                   'bucketZero': [], // Invalid key
               },
               history: [],
               day: 0,
           };
           expect(() => deserializeState(invalidData)).toThrow(/invalid format for bucket key/i);
       });
  });
});


// --- Tests for File I/O ---
describe('File I/O for State', () => {

    let mockedWriteFile: jest.MockedFunction<typeof fs.writeFile>;
    let mockedReadFile: jest.MockedFunction<typeof fs.readFile>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
        mockedReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    });

    describe('saveStateToFile', () => {
        it('should call fs.writeFile with the correct path and stringified data', async () => {
            mockedWriteFile.mockResolvedValue(undefined);
            const expectedJsonString = JSON.stringify(mockSerializedState, null, 2);

            await saveStateToFile(mockFilePath, mockSerializedState);

            expect(mockedWriteFile).toHaveBeenCalledTimes(1);
            expect(mockedWriteFile).toHaveBeenCalledWith(
                mockFilePath,
                expectedJsonString,
                'utf-8'
            );
        });

        it('should propagate errors from fs.writeFile', async () => {
            const writeError = new Error('Disk full');
            mockedWriteFile.mockRejectedValue(writeError);

            await expect(saveStateToFile(mockFilePath, mockSerializedState))
                .rejects.toThrow('Disk full');

             expect(mockedWriteFile).toHaveBeenCalledTimes(1);
             expect(mockedWriteFile).toHaveBeenCalledWith(
                 mockFilePath,
                 expect.any(String),
                 'utf-8'
             );
        });
    });

    describe('loadStateFromFile', () => {
        it('should call fs.readFile with the correct path and return parsed JSON on success', async () => {
            const jsonString = JSON.stringify(mockSerializedState);
            mockedReadFile.mockResolvedValue(Buffer.from(jsonString, 'utf-8'));

            const result = await loadStateFromFile(mockFilePath);

            expect(mockedReadFile).toHaveBeenCalledTimes(1);
            expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
            expect(result).toEqual(mockSerializedState);
        });

        it('should return null if fs.readFile throws ENOENT (file not found)', async () => {
            const fileNotFoundError = new Error('File not found') as NodeJS.ErrnoException;
            fileNotFoundError.code = 'ENOENT';
            mockedReadFile.mockRejectedValue(fileNotFoundError);

            const result = await loadStateFromFile(mockFilePath);

            expect(mockedReadFile).toHaveBeenCalledTimes(1);
            expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
            expect(result).toBeNull();
        });

         it('should throw an error if fs.readFile throws an error other than ENOENT', async () => {
            const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
            permissionError.code = 'EACCES';
            mockedReadFile.mockRejectedValue(permissionError);

            await expect(loadStateFromFile(mockFilePath))
                .rejects.toThrow('Permission denied');

             expect(mockedReadFile).toHaveBeenCalledTimes(1);
             expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
        });

        it('should throw an error if the file content is corrupted JSON', async () => {
            const corruptedJson = '{ "buckets": { "0": [ }'; // Invalid JSON
            mockedReadFile.mockResolvedValue(Buffer.from(corruptedJson, 'utf-8'));

             await expect(loadStateFromFile(mockFilePath))
                 .rejects.toThrow(/Failed to parse state file.*Corrupted JSON/i);

             expect(mockedReadFile).toHaveBeenCalledTimes(1);
             expect(mockedReadFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
        });
    });
});