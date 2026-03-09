import test from 'node:test';
import assert from 'node:assert';
import { generateVerificationCode } from './hash';

test('generateVerificationCode output validation', (t) => {
    const data = { name: 'John Doe', course: 'Math 101' };
    const code = generateVerificationCode(data);

    // Should return a 16-character string
    assert.strictEqual(code.length, 16);

    // Should be uppercase hex
    assert.match(code, /^[0-9A-F]{16}$/);
});

test('generateVerificationCode determinism with unordered keys', (t) => {
    const data1 = { name: 'John Doe', course: 'Math 101', grade: 'A' };
    const data2 = { grade: 'A', course: 'Math 101', name: 'John Doe' };

    const code1 = generateVerificationCode(data1);
    const code2 = generateVerificationCode(data2);

    assert.strictEqual(code1, code2);
});

test('generateVerificationCode whitespace trimming', (t) => {
    const data1 = { name: 'John Doe', course: 'Math 101' };
    const data2 = { name: '  John Doe  ', course: '\tMath 101\n' };

    const code1 = generateVerificationCode(data1);
    const code2 = generateVerificationCode(data2);

    assert.strictEqual(code1, code2);
});

test('generateVerificationCode date normalization', (t) => {
    // issueDate normalization
    const data1 = { issueDate: '2023-10-15T14:30:00Z' };
    const data2 = { issueDate: new Date('2023-10-15T14:30:00Z') };
    const data3 = { issueDate: '2023-10-15' }; // Should normalize to 2023-10-15

    // Using string matching to verify it standardizes properly
    // generateVerificationCode converts the value to YYYY-MM-DD

    const code1 = generateVerificationCode(data1);
    const code2 = generateVerificationCode(data2);
    const code3 = generateVerificationCode(data3);

    assert.strictEqual(code1, code2);
    // data3 without time might be parsed as 00:00 UTC which is same day
    assert.strictEqual(code1, code3);

    // key containing 'date'
    const data4 = { defenseDate: '2023-10-15T14:30:00Z' };
    const data5 = { defenseDate: '2023-10-15' };

    const code4 = generateVerificationCode(data4);
    const code5 = generateVerificationCode(data5);

    assert.strictEqual(code4, code5);
});

test('generateVerificationCode invalid date fallback', (t) => {
    const data1 = { issueDate: 'Not a real date' };

    // Should not throw, should just trim and use the invalid string as-is
    const code = generateVerificationCode(data1);

    // Let's verify it falls back to string value
    const data2 = { issueDate: 'Not a real date' };
    const code2 = generateVerificationCode(data2);
    assert.strictEqual(code, code2);
});

test('generateVerificationCode null/undefined handling', (t) => {
    const data1 = { name: 'John', age: null, title: undefined };
    const code1 = generateVerificationCode(data1);

    // The implementation converts null/undefined to empty strings
    const data2 = { name: 'John', age: '', title: '' };
    const code2 = generateVerificationCode(data2);

    assert.strictEqual(code1, code2);
});
