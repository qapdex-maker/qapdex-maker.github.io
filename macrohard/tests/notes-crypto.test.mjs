import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

// The notes crypto module is a classic script that attaches to window.
// Load it in a vm context that mimics the browser globals it uses.
function loadModule() {
  const source = fs.readFileSync(
    path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'js', 'notes-crypto.js'),
    'utf8',
  );
  const store = new Map();
  const scope = {
    console,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
  };
  scope.window = scope;
  vm.createContext(scope);
  vm.runInContext(source, scope);
  return scope.NotesCrypto;
}

const crypto = loadModule();

test('module exposes the vault API', () => {
  assert.equal(crypto.available, true);
  for (const fn of ['encryptAll', 'decryptAll', 'isLegacyEntry', 'decodeLegacy', 'newId']) {
    assert.equal(typeof crypto[fn], 'function', `${fn} must be a function`);
  }
});

test('roundtrip restores content and metadata', async () => {
  const notes = [
    { id: 'a', title: 'Titel', tags: ['x'], updated: 1, content: 'Hallo Welt' },
    { id: 'b', title: 'Andere', tags: [], updated: 2, content: '' },
  ];
  const sealed = await crypto.encryptAll(notes, 'passwort123');
  assert.equal(sealed.length, 2);
  assert.ok(sealed[0].enc, 'encrypted payload must be present');
  assert.ok(!('content' in sealed[0]), 'plaintext content must not be stored');
  assert.equal(sealed[0].title, 'Titel', 'title stays readable for list sorting');
  const opened = await crypto.decryptAll(sealed, 'passwort123');
  assert.equal(opened[0].content, 'Hallo Welt');
  assert.equal(opened[1].content, '');
});

test('ciphertext does not contain the plaintext', async () => {
  const notes = [{ id: 'a', title: 'T', tags: [], updated: 1, content: 'GEHEIMTEXT12345' }];
  const sealed = await crypto.encryptAll(notes, 'pw');
  assert.ok(!sealed[0].enc.includes('GEHEIM'), 'plaintext must not survive in the ciphertext');
});

test('wrong password fails without throwing', async () => {
  const notes = [{ id: 'a', title: 'T', tags: [], updated: 1, content: 'Daten' }];
  const sealed = await crypto.encryptAll(notes, 'richtig');
  const opened = await crypto.decryptAll(sealed, 'falsch');
  assert.equal(opened[0], null, 'decrypt must signal failure via null');
});

test('two encryptions of the same note differ (random IV)', async () => {
  const notes = [{ id: 'a', title: 'T', tags: [], updated: 1, content: 'gleich' }];
  const a = await crypto.encryptAll(notes, 'pw');
  const b = await crypto.encryptAll(notes, 'pw');
  assert.notEqual(a[0].enc, b[0].enc, 'IV must be random per encryption');
});

test('unicode content survives the roundtrip', async () => {
  const text = 'Ünïcödé — 日本語 — 🔒 emoji';
  const notes = [{ id: 'a', title: 'T', tags: [], updated: 1, content: text }];
  const opened = await crypto.decryptAll(await crypto.encryptAll(notes, 'pw'), 'pw');
  assert.equal(opened[0].content, text);
});

test('large content does not break (btoa limit)', async () => {
  const text = 'x'.repeat(200000);
  const notes = [{ id: 'a', title: 'T', tags: [], updated: 1, content: text }];
  const opened = await crypto.decryptAll(await crypto.encryptAll(notes, 'pw'), 'pw');
  assert.equal(opened[0].content.length, 200000);
});

test('legacy btoa entries are detected and decoded', () => {
  const legacy = btoa(unescape(encodeURIComponent('Alter Inhalt')));
  const entry = { id: 'a', title: 'T', content: legacy };
  assert.equal(crypto.isLegacyEntry(entry), true);
  assert.equal(crypto.decodeLegacy(legacy), 'Alter Inhalt');
  assert.equal(crypto.isLegacyEntry({ id: 'a', enc: 'iv.cipher' }), false);
});

test('short passwords are rejected by the app layer, not here', () => {
  // The module does not enforce a minimum; the UI does. This documents the contract.
  const notes = [{ id: 'a', title: 'T', tags: [], updated: 1, content: 'x' }];
  return crypto.encryptAll(notes, 'a').then((sealed) => {
    assert.ok(sealed[0].enc, 'any non-empty password derives a key');
  });
});
