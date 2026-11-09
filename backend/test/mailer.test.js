import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import { formatKarachiTime } from '../src/services/mailer.js';

// Inquiries read back from Firestore carry Timestamps, not Dates: this used to throw "Invalid time value".
test('formatKarachiTime accepts Firestore Timestamps, Dates and ISO strings', () => {
  const iso = '2026-11-09T13:28:34.000Z';
  const expected = formatKarachiTime(new Date(iso));
  assert.match(expected, /9 November 2026 at 18:28 \(PKT\)$/);
  assert.equal(formatKarachiTime(Timestamp.fromDate(new Date(iso))), expected);
  assert.equal(formatKarachiTime(iso), expected);
  assert.doesNotThrow(() => formatKarachiTime(undefined));
});
