import { describe, it, expect } from 'vitest';
import { generateVerificationCode } from './hash';

describe('generateVerificationCode', () => {
    it('normalizes valid ISO dates consistently', () => {
        const data1 = { issueDate: '2023-10-15T00:00:00.000Z' };
        const data2 = { issueDate: '2023-10-15' }; // Should normalize to same '2023-10-15' in UTC

        const code1 = generateVerificationCode(data1);
        const code2 = generateVerificationCode(data2);

        expect(code1).toBeTypeOf('string');
        expect(code1.length).toBe(16);
        expect(code1).toBe(code2);
    });

    it('gracefully handles invalid date strings and continues to trim', () => {
        // If it creates an invalid date (isNaN(d.getTime())), it should fall back
        // to keeping the original string and trimming it at the end.
        const unpaddedData = { issueDate: 'invalid-date' };
        const paddedData = { issueDate: '  invalid-date   ' };

        const code1 = generateVerificationCode(unpaddedData);
        const code2 = generateVerificationCode(paddedData);

        // Because the catch block/invalid check continues and the string is trimmed at the end,
        // these should result in the exact same normalized value and thus the same hash.
        expect(code1).toBeTypeOf('string');
        expect(code1.length).toBe(16);
        expect(code1).toBe(code2);

        // Also ensure it is deterministic
        expect(code1).not.toBe(generateVerificationCode({ issueDate: 'other-date' }));
    });

    it('handles undefined and null values as empty strings', () => {
        const nullData = { issueDate: null };
        const undefinedData = { issueDate: undefined };
        const emptyStringData = { issueDate: '' };

        const codeNull = generateVerificationCode(nullData);
        const codeUndefined = generateVerificationCode(undefinedData);
        const codeEmpty = generateVerificationCode(emptyStringData);

        expect(codeNull).toBe(codeEmpty);
        expect(codeUndefined).toBe(codeEmpty);
    });
});
