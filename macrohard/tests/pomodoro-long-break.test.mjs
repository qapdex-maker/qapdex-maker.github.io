import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pomodoro: the long break every 4 sessions never worked.
 *
 * buildPomodoro() had two timer functions:
 *
 *   tick()   — the one setInterval() actually calls. Switched work/break
 *              using breakMinInput. No long break anywhere.
 *   tick2()  — identical, except it counted sessions and handed out a 15
 *              minute long break every 4th round. Never called.
 *
 * The comment above it spelled out the intent and the failure:
 *   "Replace tick with tick2 / Note: tick is already defined, we just
 *    override its behavior / Actually we can't easily replace, so we add
 *    long break logic to existing tick"
 * The last step was never taken. The documented feature was unreachable.
 *
 * Fix: the long break lives in tick(), tick2() is gone. recordSession() is
 * called for finished work rounds only, so the session counter stays honest.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const lines = source.split('\n');

function body(name) {
  // Anchor on `name(` followed by `)` so that looking for `tick` does not match
  // `tick2` — the prefix would otherwise make an already-deleted tick2 look
  // present, which is exactly the mistake that made this test lie.
  const needle = new RegExp(`function\\s+${name}\\s*\\(\\s*\\)`);
  const m = needle.exec(source);
  if (!m) return null;
  const start = m.index;
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

test('precondition: the pomodoro has exactly one timer function', () => {
  assert.ok(body('tick'), 'tick() must exist');
  assert.equal(
    body('tick2'),
    null,
    'tick2() must be gone — the long break now lives in tick()',
  );
});

test('tick() hands out a long break every 4 sessions', () => {
  const t = body('tick');
  // The modulo that decides a long break.
  assert.match(
    t,
    /sessions\s*%\s*4\s*===\s*0/,
    'tick() must detect every 4th completed session',
  );
  // And it must use a long duration, not the short break.
  assert.match(
    t,
    /15\s*\*\s*60|totalSeconds\s*=\s*15\s*\*\s*60/,
    'the long break must be 15 minutes',
  );
  assert.match(t, /showNotif\([^)]*Long Break/i, 'the long break must announce itself');
});

test('a short break is still used for sessions 1..3', () => {
  const t = body('tick');
  assert.match(
    t,
    /breakMinInput/,
    'the normal break must still come from the user-configurable input',
  );
  assert.match(
    t,
    /else\s*\{[\s\S]{0,400}?breakMinInput/,
    'the non-long-break branch must use the short break',
  );
});

test('a long break does not count as a completed work session', () => {
  const t = body('tick');
  // recordSession() is about statistics. Counting the 15 minute long break as
  // a finished work session would inflate the CSV export and the ring counter.
  const longIdx = t.indexOf('Long Break');
  assert.ok(longIdx > 0, 'the long break branch must exist');
  const branch = t.slice(longIdx, longIdx + 400);
  assert.doesNotMatch(
    branch,
    /recordSession\(\)/,
    'the long break branch must not record a work session',
  );
  // The short break branch must.
  assert.match(t, /recordSession\(\)/, 'finishing a work round must still be recorded');
});

test('the dead comment about replacing tick is gone', () => {
  assert.doesNotMatch(
    source,
    /Replace tick with tick2/,
    'the note describing the abandoned approach must not linger',
  );
});

test('tick() is still what the interval calls', () => {
  // Guard against a half-done refactor: the long break must live in the
  // function that actually runs, not in a new unused one.
  assert.match(
    source,
    /setInterval\(\s*tick\s*,/,
    'the pomodoro interval must call tick() directly',
  );
  assert.doesNotMatch(source, /setInterval\(\s*tick2/, 'tick2 must not be wired to anything');
});
