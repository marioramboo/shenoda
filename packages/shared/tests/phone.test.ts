import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  normalizeArabicDigits,
  cleanPhoneNumber,
  getPhoneVariants,
  canonicalizeEgyptianPhone,
} from '../src';

describe('Phone Number Utilities (Egypt & Arabic Numerals)', () => {
  test('normalizeArabicDigits converts Arabic-Indic and Eastern Arabic digits', () => {
    assert.strictEqual(normalizeArabicDigits('٠١٠١٢٣٤٥٦٧٨'), '01012345678');
    assert.strictEqual(normalizeArabicDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
    assert.strictEqual(normalizeArabicDigits('+20 10 1234 5678'), '+20 10 1234 5678');
  });

  test('cleanPhoneNumber strips spaces, dashes and non-digit characters', () => {
    assert.strictEqual(cleanPhoneNumber(' +20 10-1234-5678 '), '+201012345678');
    assert.strictEqual(cleanPhoneNumber('٠١٠-١٢٣٤-٥٦٧٨'), '01012345678');
  });

  test('getPhoneVariants produces all Egyptian search variants', () => {
    // 1. With +20
    const v1 = getPhoneVariants('+201012345678');
    assert.ok(v1.includes('+201012345678'));
    assert.ok(v1.includes('01012345678'));
    assert.ok(v1.includes('1012345678'));
    assert.ok(v1.includes('201012345678'));

    // 2. With Arabic numerals
    const v2 = getPhoneVariants('٠١٠١٢٣٤٥٦٧٨');
    assert.ok(v2.includes('+201012345678'));
    assert.ok(v2.includes('01012345678'));

    // 3. Local format with leading 0
    const v3 = getPhoneVariants('01012345678');
    assert.ok(v3.includes('+201012345678'));
    assert.ok(v3.includes('01012345678'));
  });

  test('canonicalizeEgyptianPhone formats numbers to canonical +20 format', () => {
    assert.strictEqual(canonicalizeEgyptianPhone('01012345678'), '+201012345678');
    assert.strictEqual(canonicalizeEgyptianPhone('٠١٠١٢٣٤٥٦٧٨'), '+201012345678');
    assert.strictEqual(canonicalizeEgyptianPhone('+201012345678'), '+201012345678');
    assert.strictEqual(canonicalizeEgyptianPhone('201012345678'), '+201012345678');
  });
});
