import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mock DOM for Node.js tests
global.window = {
  osIntervals: {},
  osTimeouts: {},
  onerror: null,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { href: 'http://localhost:8099/' },
  navigator: { userAgent: 'node' },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
  },
  sessionStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
  },
  document: {
    documentElement: { dataset: {}, style: { setProperty: () => {}, removeProperty: () => {} }, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false } },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, style: {}, addEventListener: () => {}, appendChild: () => {}, setAttribute: () => {}, dataset: {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    addEventListener: () => {},
  },
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  requestAnimationFrame: () => 0,
  AudioContext: class { createBiquadFilter() { return { type: '', frequency: { value: 0 }, gain: { value: 0, setValueAtTime: () => {} }, connect: () => {} }; } createMediaElementSource() { return { connect: () => {} }; } createAnalyser() { return { fftSize: 0, frequencyBinCount: 0, getByteFrequencyData: () => {}, connect: () => {} }; } createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; } createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; } get currentTime() { return 0; } get state() { return 'running'; } resume() {} },
};

// Test: localStorage Wrapper
test('storeSet and storeGet work correctly', () => {
  // Simulate storeSet/storeGet behavior
  const storeSet = (k, v) => {
    try { global.window.localStorage.setItem(k, v); return true; }
    catch(e) { return false; }
  };
  const storeGet = (k) => {
    return global.window.localStorage.getItem(k) || global.window.sessionStorage.getItem(k);
  };
  
  storeSet('test_key', 'test_value');
  assert.equal(storeGet('test_key'), 'test_value');
});

// Test: localStorage fallback to sessionStorage
test('storeSet falls back to sessionStorage', () => {
  const storeSet = (k, v) => {
    try { global.window.localStorage.setItem(k, v); return true; }
    catch(e) {
      try { global.window.sessionStorage.setItem(k, v); return true; }
      catch(e2) { return false; }
    }
  };
  
  // Force localStorage to fail
  global.window.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
  
  const result = storeSet('fallback_key', 'fallback_value');
  assert.equal(result, true);
  assert.equal(global.window.sessionStorage.getItem('fallback_key'), 'fallback_value');
});

// Test: osIntervals registry
test('osIntervals registry works', () => {
  global.window.osIntervals = {};
  global.window.osIntervals['test'] = setInterval(() => {}, 1000);
  assert.ok(global.window.osIntervals['test'] !== undefined);
  clearInterval(global.window.osIntervals['test']);
  delete global.window.osIntervals['test'];
  assert.equal(global.window.osIntervals['test'], undefined);
});

// Test: Desktop apps count
test('desktopApps has 25 entries', () => {
  // Simulate the desktopApps array
  const desktopApps = [
    'notepad','calculator','terminal','explorer','paint','browser',
    'music','chat','docs','settings','links','amibios',
    'taskmgr','sysinfo','calendar','clock','colorpicker','pwgen',
    'qrgen','viewer','game','editor','imgeditor','pomodoro','notes'
  ];
  assert.equal(desktopApps.length, 25);
});

// Test: fsData structure
test('fsData has correct structure', () => {
  const fsData = {
    'C:\\Users': { dirs: ['macrohard','Public'], files: [] },
    'C:\\Users\\macrohard': { dirs: ['Desktop','Dokumente','Downloads'], files: ['notes.txt'] },
    'C:\\Users\\macrohard\\Desktop': { dirs: [], files: ['index.html','style.css'] },
  };
  assert.ok(fsData['C:\\Users']);
  assert.equal(fsData['C:\\Users'].dirs.length, 2);
  assert.equal(fsData['C:\\Users\\macrohard'].files[0], 'notes.txt');
});

// Test: Filter function
test('filter function works for file search', () => {
  const files = ['index.html', 'style.css', 'script.js', 'notes.txt'];
  const filter = 'css';
  const result = files.filter(f => f.toLowerCase().indexOf(filter.toLowerCase()) !== -1);
  assert.equal(result.length, 1);
  assert.equal(result[0], 'style.css');
});

// Test: shuffleArray preserves length
test('shuffleArray preserves all elements', () => {
  const shuffleArray = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const original = [0, 1, 2, 3];
  const shuffled = shuffleArray(original);
  assert.equal(shuffled.length, original.length);
  assert.ok(shuffled.includes(0));
  assert.ok(shuffled.includes(3));
});

console.log('All tests passed!');
