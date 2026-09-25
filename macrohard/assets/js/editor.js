/* Editor-Logik — reine Funktionen, kein DOM.
 * Klassisches Script, wird vor app.js geladen.
 * exposing: window.EditorCore
 */
(function (global) {
  'use strict';

  const MAX_UNDO = 50;

  function countStats(text) {
    const content = text || '';
    const lineCount = content.length === 0 ? 0 : content.split('\n').length;
    const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    return { lineCount: lineCount, words: words, chars: content.length };
  }

  function lineNumbers(text) {
    const lineCount = countStats(text).lineCount;
    const out = [];
    for (let i = 1; i <= lineCount; i++) out.push(String(i));
    return out;
  }

  /* Undo/Redo-Verlauf mitMAX_UNDO-Einträgen. */
  function createHistory(initial) {
    let stack = [initial === undefined ? '' : initial];
    let index = 0;
    return {
      push: function (value) {
        if (value === stack[index]) return false;
        stack = stack.slice(0, index + 1);
        stack.push(value);
        if (stack.length > MAX_UNDO) stack.shift();
        index = stack.length - 1;
        return true;
      },
      reset: function (value) {
        stack = [value === undefined ? '' : value];
        index = 0;
      },
      current: function () {
        return stack[index];
      },
      canUndo: function () {
        return index > 0;
      },
      canRedo: function () {
        return index < stack.length - 1;
      },
      undo: function () {
        if (!this.canUndo()) return null;
        const value = stack[index];
        index--;
        return stack[index];
      },
      redo: function () {
        if (!this.canRedo()) return null;
        index++;
        return stack[index];
      },
      size: function () {
        return stack.length;
      },
    };
  }

  /* Ersetzt alle Vorkommen und liefert die Anzahl Treffer zurück. */
  function replaceAll(text, search, replacement) {
    if (!search) return { text: text || '', count: 0 };
    const parts = String(text || '').split(search);
    if (parts.length < 2) return { text: text || '', count: 0 };
    return { text: parts.join(replacement === undefined ? '' : replacement), count: parts.length - 1 };
  }

  /* Suchtreffer als Offsets, damit die Auswahl gesetzt werden kann. */
  function findAll(text, search) {
    if (!search) return [];
    const hits = [];
    const haystack = String(text || '');
    let from = 0;
    for (;;) {
      const idx = haystack.indexOf(search, from);
      if (idx === -1) break;
      hits.push({ start: idx, end: idx + search.length });
      from = idx + Math.max(search.length, 1);
    }
    return hits;
  }

  /* Nächster Treffer ab einer Position, mit Wrap-around. */
  function findNext(text, search, from) {
    const hits = findAll(text, search);
    if (!hits.length) return null;
    for (const hit of hits) {
      if (hit.start >= from) return hit;
    }
    return hits[0];
  }

  /* Tab-Einrückung: rückt die Auswahl ein oder aus. */
  function applyIndent(text, start, end, outdent) {
    const pad = outdent ? '' : '  ';
    const selected = text.substring(start, end);
    if (!selected.includes('\n')) {
      return {
        value: text.substring(0, start) + pad + text.substring(end),
        start: start + pad.length,
        end: start + pad.length,
      };
    }
    const blockStart = text.lastIndexOf('\n', start - 1) + 1;
    const block = text.substring(blockStart, end);
    const shifted = block
      .split('\n')
      .map(function (line) {
        if (outdent) return line.replace(/^ {1,2}/, '');
        return pad + line;
      })
      .join('\n');
    return {
      value: text.substring(0, blockStart) + shifted + text.substring(end),
      start: start,
      end: blockStart + shifted.length,
    };
  }

  const EXTENSION_BY_LANG = {
    md: 'md',
    html: 'html',
    css: 'css',
    js: 'js',
    json: 'json',
    py: 'py',
    sh: 'sh',
    xml: 'xml',
    csv: 'csv',
  };

  function fileNameFor(lang, base) {
    const name = base || 'document';
    const ext = EXTENSION_BY_LANG[lang] || 'txt';
    return name.replace(/\.[^.]+$/, '') + '.' + ext;
  }

  global.EditorCore = {
    MAX_UNDO: MAX_UNDO,
    countStats: countStats,
    lineNumbers: lineNumbers,
    createHistory: createHistory,
    replaceAll: replaceAll,
    findAll: findAll,
    findNext: findNext,
    applyIndent: applyIndent,
    fileNameFor: fileNameFor,
  };
})(window);
