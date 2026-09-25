import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

function functionBody(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start !== -1, `${name} must exist`);
  let depth = 0;
  let began = false;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') {
      depth++;
      began = true;
    } else if (source[i] === '}') {
      depth--;
      if (began && depth === 0) return source.slice(start, i + 1);
    }
  }
  return source.slice(start, start + 800);
}

test('showSnapHint no longer reads an undefined identifier', () => {
  const body = functionBody('showSnapHint');
  assert.doesNotMatch(body, /(?<![.\w])w\.offsetWidth/, 'bare w is not in scope');
  assert.match(body, /dragged/, 'the window is passed in as a parameter');
});

test('showSnapHint takes three parameters', () => {
  const sig = source.match(/function showSnapHint\(([^)]*)\)/)[1].split(',').map((p) => p.trim());
  assert.deepEqual(sig, ['x', 'y', 'dragged']);
});

test('the real call site passes the dragged window', () => {
  const call = source.match(/showSnapHint\(nx, ny, ([A-Za-z_$][\w$]*)\)/);
  assert.ok(call, 'the drag handler must pass the dragged window');
  const arg = call[1];
  assert.equal(
    source.includes(`const ${arg} = `) || source.includes(`let ${arg} = `),
    true,
    `${arg} must be a declared element in the drag handler`,
  );
});

test('chat cleanup timer is reachable from the shared cleanup entry point', () => {
  const body = functionBody('cleanupChat');
  assert.match(body, /chatReplyTimer/, 'cleanupChat must clear the pending reply timer');
  assert.ok(
    source.includes("window.osTimeouts['chat_cleanup'] = cleanupChat"),
    'the global close handler reaches cleanupChat through osTimeouts',
  );
});
