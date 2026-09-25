/* Notes-Verschlüsselung — AES-GCM über die Web Crypto API.
 * Klassisches Script (kein ES-Modul), wird vor app.js geladen.
 * exposing: window.NotesCrypto
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'notes_crypto_key';
  const PBKDF2_ITERATIONS = 150000;
  const SALT_BYTES = 16;
  const IV_BYTES = 12;

  const cryptoApi = global.crypto;
  if (!cryptoApi || !cryptoApi.subtle) {
    console.warn('NotesCrypto: Web Crypto nicht verfügbar');
    return;
  }

  function randomBytes(length) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    return bytes;
  }

  function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return global.btoa(binary);
  }

  function fromBase64(text) {
    const binary = global.atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function randomId() {
    return toBase64(randomBytes(9)).replace(/[+/=]/g, '').slice(0, 12);
  }

  /* Leitet den AES-Schlüssel aus dem Passwort ab.
   * Der Salt wird pro Vault erzeugt und in localStorage gehalten. */
  function deriveKey(password, salt) {
    const enc = new TextEncoder();
    return cryptoApi.subtle
      .importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (baseKey) {
        return cryptoApi.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        );
      });
  }

  function getSalt() {
    let hex = global.localStorage.getItem(STORAGE_KEY);
    if (!hex) {
      hex = toHex(randomBytes(SALT_BYTES));
      global.localStorage.setItem(STORAGE_KEY, hex);
    }
    return fromHex(hex);
  }

  function toHex(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
    return out;
  }

  function fromHex(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  /* Verschlüsselt einzelne Felder eines Notiz-Objekts.
   * Titel und Tags bleiben im Klartext, damit die Liste ohne Passwort
   * sortierbar bleibt; nur der Inhalt wird geschützt. */
  function encryptNote(note, key) {
    const iv = randomBytes(IV_BYTES);
    const enc = new TextEncoder();
    return cryptoApi.subtle
      .encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(note.content || ''))
      .then(function (cipher) {
        return {
          id: note.id,
          title: note.title,
          tags: note.tags,
          updated: note.updated,
          enc: toBase64(iv) + '.' + toBase64(cipher),
        };
      });
  }

  function decryptNote(entry, key) {
    if (!entry || !entry.enc) return Promise.resolve(entry);
    const parts = String(entry.enc).split('.');
    if (parts.length !== 2) return Promise.resolve(entry);
    const dec = new TextDecoder();
    return cryptoApi.subtle
      .decrypt({ name: 'AES-GCM', iv: fromBase64(parts[0]) }, key, fromBase64(parts[1]))
      .then(function (plain) {
        return {
          id: entry.id,
          title: entry.title,
          tags: entry.tags,
          updated: entry.updated,
          content: dec.decode(plain),
        };
      })
      .catch(function () {
        return null; // falsches Passwort
      });
  }

  function encryptAll(notes, password) {
    return deriveKey(password, getSalt()).then(function (key) {
      return Promise.all(
        notes.map(function (n) {
          return encryptNote(n, key);
        }),
      );
    });
  }

  function decryptAll(entries, password) {
    if (!entries.length) return Promise.resolve(entries);
    return deriveKey(password, getSalt()).then(function (key) {
      return Promise.all(
        entries.map(function (e) {
          return e.enc ? decryptNote(e, key) : Promise.resolve(e);
        }),
      );
    });
  }

  /* Erkennt alte btoa-"Verschlüsselung" aus der Vorgänger-Version. */
  function isLegacyEntry(entry) {
    return !!(entry && typeof entry.content === 'string' && !entry.enc);
  }

  function decodeLegacy(content) {
    try {
      return decodeURIComponent(escape(global.atob(content)));
    } catch (e) {
      return '';
    }
  }

  global.NotesCrypto = {
    encryptAll: encryptAll,
    decryptAll: decryptAll,
    isLegacyEntry: isLegacyEntry,
    decodeLegacy: decodeLegacy,
    newId: randomId,
    available: true,
  };
})(window);
