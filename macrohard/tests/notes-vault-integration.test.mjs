import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

test('notes crypto module is loaded before app.js', () => {
  const crypto = index.indexOf('assets/js/notes-crypto.js');
  const app = index.indexOf('assets/app.js');
  assert.ok(crypto !== -1, 'notes-crypto.js must be referenced');
  assert.ok(app !== -1, 'app.js must be referenced');
  assert.ok(crypto < app, 'notes-crypto.js must load before app.js');
});

test('app.js no longer uses base64 as a substitute for encryption', () => {
  const notesStart = source.indexOf('function buildNotes(');
  assert.ok(notesStart !== -1);
  const body = source.slice(notesStart, notesStart + 6000);
  assert.doesNotMatch(
    body,
    /content:\s*btoa\(/,
    'note content must not be stored with btoa',
  );
});

test('the vault stores ciphertext under an enc field', () => {
  assert.match(source, /notesVault === 'aes-gcm'/);
  assert.match(source, /window\.NotesCrypto\.encryptAll\(/);
  assert.match(source, /window\.NotesCrypto\.decryptAll\(/);
});

test('legacy btoa notes are migrated once, not silently dropped', () => {
  assert.match(source, /NotesCrypto\.isLegacyEntry/);
  assert.match(source, /NotesCrypto\.decodeLegacy/);
  assert.match(source, /Verschlüsselte Inhalte ausgeblendet/, 'locked-without-password must be explicit');
});
