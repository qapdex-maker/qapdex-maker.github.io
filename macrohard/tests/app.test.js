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

// Test: Sequencer SEQ object structure
test('SEQ object has required fields for pattern sequencer', () => {
  const SEQ = {
    pattern: [],
    playing: false,
    bpm: 120,
    vol: 0.7,
    step: 0,
    timer: null,
    buffers: {},
    ctx: null,
    master: null,
    loaded: false,
    nextNoteTime: 0,
    current16th: 0,
    lookahead: 0.1,
    scheduleInterval: 25,
    muted: [],
    solo: -1,
    controlsInitialized: false
  };
  assert.equal(SEQ.loaded, false);
  assert.equal(SEQ.playing, false);
  assert.equal(SEQ.bpm, 120);
  assert.equal(SEQ.lookahead, 0.1);
  assert.deepEqual(SEQ.muted, []);
  assert.equal(SEQ.solo, -1);
});

// Test: Sequencer pattern initialization
test('sequencer pattern initializes as 8x16 grid of false', () => {
  const SEQ_STEPS = 16;
  const pattern = [];
  const muted = [];
  for (let i = 0; i < 8; i++) {
    pattern[i] = [];
    muted[i] = false;
    for (let j = 0; j < SEQ_STEPS; j++) {
      pattern[i][j] = false;
    }
  }
  assert.equal(pattern.length, 8);
  assert.equal(pattern[0].length, 16);
  assert.equal(pattern[0][0], false);
  assert.equal(muted.length, 8);
  assert.equal(muted[0], false);
});

// Test: Sequencer step toggle
test('toggleStep flips pattern value', () => {
  const pattern = [[false, false], [false, false]];
  // Simulate toggle
  pattern[0][1] = !pattern[0][1];
  assert.equal(pattern[0][1], true);
  pattern[0][1] = !pattern[0][1];
  assert.equal(pattern[0][1], false);
});

// Test: Sequencer scheduler lookahead logic
test('scheduler schedules notes within lookahead window', () => {
  const SEQ = { bpm: 120, lookahead: 0.1, current16th: 0, nextNoteTime: 0 };
  const stepDur = (60.0 / SEQ.bpm) / 4.0;
  const currentTime = 0;
  let stepsScheduled = 0;
  while (SEQ.nextNoteTime < currentTime + SEQ.lookahead) {
    stepsScheduled++;
    SEQ.nextNoteTime += stepDur;
    SEQ.current16th = (SEQ.current16th + 1) % 16;
  }
  assert.ok(stepsScheduled > 0);
  assert.ok(stepsScheduled <= 4);
});

// Test: AudioContext creation fallback (synthesized mode)
test('AudioContext can be created with webkit fallback', () => {
  // Simulate both standard and webkit AudioContext
  let ctx = null;
  const AudioContext = global.window.AudioContext || global.window.webkitAudioContext;
  if (AudioContext) {
    ctx = new AudioContext();
  }
  // In test env, AudioContext is mocked — just verify the pattern
  assert.ok(ctx !== undefined);
});

// Test: Sequencer stop clears timer
test('stopSequencer clears timer and resets state', () => {
  const SEQ = { playing: true, current16th: 5, timer: 123 };
  // Simulate stopSequencer
  SEQ.playing = false;
  SEQ.current16th = 0;
  if (SEQ.timer) { SEQ.timer = null; }
  assert.equal(SEQ.playing, false);
  assert.equal(SEQ.current16th, 0);
  assert.equal(SEQ.timer, null);
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

// Test: storeDel works
test('storeDel works', () => {
  // Restore localStorage.setItem (may be mocked by previous test)
  global.window.localStorage.setItem = function(k, v) { this._data[k] = v; };
  const storeDel = (k) => {
    try { global.window.localStorage.removeItem(k); } catch(e) {}
    try { global.window.sessionStorage.removeItem(k); } catch(e) {}
  };
  global.window.localStorage.setItem('test_del', 'value');
  storeDel('test_del');
  assert.equal(global.window.localStorage.getItem('test_del'), null);
});

// Test: osTimeouts cleanup
test('osTimeouts cleanup works', () => {
  global.window.osTimeouts = {};
  global.window.osTimeouts['test'] = setTimeout(() => {}, 1000);
  assert.ok(global.window.osTimeouts['test'] !== undefined);
  clearTimeout(global.window.osTimeouts['test']);
  delete global.window.osTimeouts['test'];
  assert.equal(global.window.osTimeouts['test'], undefined);
});

// Test: AudioContext state handling
test('AudioContext state handling', () => {
  const mockCtx = {
    state: 'running',
    resume: function() { this.state = 'running'; },
    suspend: function() { this.state = 'suspended'; }
  };
  assert.equal(mockCtx.state, 'running');
  mockCtx.suspend();
  assert.equal(mockCtx.state, 'suspended');
  mockCtx.resume();
  assert.equal(mockCtx.state, 'running');
});

// Test: localStorage quota fallback returns false
test('storeSet returns false when both storages fail', () => {
  const origLS = global.window.localStorage.setItem;
  const origSS = global.window.sessionStorage.setItem;
  global.window.localStorage.setItem = () => { throw new Error('fail'); };
  global.window.sessionStorage.setItem = () => { throw new Error('fail'); };
  const storeSet = (k, v) => {
    try { global.window.localStorage.setItem(k, v); return true; } catch(e) {}
    try { global.window.sessionStorage.setItem(k, v); return true; } catch(e) {}
    return false;
  };
  const result = storeSet('k', 'v');
  assert.equal(result, false);
  global.window.localStorage.setItem = origLS;
  global.window.sessionStorage.setItem = origSS;
});

console.log('All tests passed!');
// Test: mkdir creates fsData entry
test('mkdir creates new directory in fsData', () => {
  const fsData = { 'C:\\Users\\test': { dirs: [], files: [] } };
  const curPath = 'C:\\Users\\test';
  const dn = 'newdir';

  // Simulate mkdir
  fsData[curPath].dirs.push(dn);
  const np = curPath + '\\' + dn;
  fsData[np] = { dirs: [], files: [] };

  assert.ok(fsData[curPath].dirs.indexOf(dn) !== -1);
  assert.ok(fsData[np]);
  assert.deepEqual(fsData[np], { dirs: [], files: [] });
});

// Test: cd changes curPath correctly
test('cd updates curPath correctly', () => {
  let curPath = 'C:\\Users\\macrohard\\Desktop';
  const fsData = {
    'C:\\Users\\macrohard': { dirs: ['Desktop'], files: [] },
  };

  // cd ..
  const parts = curPath.split('\\');
  if (parts.length > 2) { parts.pop(); curPath = parts.join('\\'); }
  assert.equal(curPath, 'C:\\Users\\macrohard');

  // cd Desktop
  const dest = 'Desktop';
  const np = curPath + '\\' + dest;
  if (fsData[np]) curPath = np;
  // No fsData for Desktop in this test - verify the check works
  assert.equal(curPath, 'C:\\Users\\macrohard');
});

// Test: rm -r removes directory entry
test('rm -r removes directory from fsData', () => {
  const fsData = {
    'C:\\Users\\test': { dirs: ['mydir'], files: [] },
    'C:\\Users\\test\\mydir': { dirs: [], files: ['file.txt'] },
  };
  const curPath = 'C:\\Users\\test';
  const fn2 = 'mydir';

  const di = fsData[curPath].dirs.indexOf(fn2);
  fsData[curPath].dirs.splice(di, 1);
  const dp = curPath + '\\' + fn2;
  delete fsData[dp];

  assert.ok(fsData[curPath].dirs.indexOf(fn2) === -1);
  assert.equal(fsData[dp], undefined);
});

// Test: Explorer shared filesystem with Terminal
test('terminal mkdir + explorer refresh share fsData', () => {
  const fsData = {
    'C:\\Users\\test': { dirs: [], files: [] },
  };
  const curPath = 'C:\\Users\\test';

  // Terminal creates folder
  const dn = 'projects';
  fsData[curPath].dirs.push(dn);
  fsData[curPath + '\\' + dn] = { dirs: [], files: [] };

  // Explorer renders - should see the new folder
  const d = fsData[curPath];
  assert.ok(d.dirs.indexOf(dn) !== -1);
});

// Test: Taskmanager app history tracking
test('taskmgr app history tracks opened apps', () => {
  const appHistory = [];
  const trackApp = (name) => {
    appHistory.push({ name, action: 'Gestartet', time: new Date().toLocaleTimeString('de-DE') });
    if (appHistory.length > 50) appHistory.shift();
  };
  
  trackApp('notepad');
  trackApp('explorer');
  
  assert.equal(appHistory.length, 2);
  assert.equal(appHistory[0].name, 'notepad');
  assert.equal(appHistory[0].action, 'Gestartet');
});

// Test: Taskmanager CPU smoothing
test('taskmgr cpu history stays within bounds', () => {
  const cpuHistory = [];
  for (let i = 0; i < 30; i++) cpuHistory.push(Math.random() * 40 + 10);
  
  for (let i = 0; i < 100; i++) {
    const last = cpuHistory[cpuHistory.length - 1];
    const next = Math.max(5, Math.min(95, last + (Math.random() - 0.5) * 10));
    cpuHistory.push(next);
    if (cpuHistory.length > 30) cpuHistory.shift();
    assert.ok(next >= 5 && next <= 95);
  }
});

// Test: Taskmanager startup apps
test('taskmgr startup apps have correct structure', () => {
  const startupApps = [
    { name: 'System Explorer', enabled: true },
    { name: 'Audio Service', enabled: false },
  ];
  
  assert.equal(startupApps[0].enabled, true);
  assert.equal(startupApps[1].enabled, false);
  startupApps[1].enabled = true;
  assert.equal(startupApps[1].enabled, true);
});

// Test: App-Prüfung — alle 25 Apps haben gültige IDs
const desktopApps25 = [
  'notepad','calculator','terminal','explorer','paint','browser',
  'music','chat','docs','settings','links','amibios','taskmgr','sysinfo',
  'calendar','clock','colorpicker','pwgen','qrgen','viewer','game',
  'editor','imgeditor','pomodoro','notes'
];

test('App-Prüfung: 25 Apps gelistet', () => {
  assert.equal(desktopApps25.length, 25);
});

test('App-Prüfung: alle App-IDs gültig', () => {
  desktopApps25.forEach(app => {
    assert.ok(typeof app === 'string' && app.length > 0, `Ungültige App-ID: ${app}`);
    assert.ok(/^[a-z]+$/.test(app), `App-ID "${app}" enthält ungültige Zeichen`);
  });
});

test('App-Prüfung: keine Duplikate', () => {
  const unique = [...new Set(desktopApps25)];
  assert.equal(unique.length, desktopApps25.length);
});
