import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appPath = path.join(__dirname, '..', 'assets', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8');

// Shared storage
const sharedStorage = { _ls: {}, _ss: {} };

// Extract a function by name (handles nested braces)
function extractFunction(source, funcName) {
  const funcRegex = new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{`);
  const match = funcRegex.exec(source);
  if (!match) return null;
  let depth = 0, started = false, result = '';
  for (let i = match.index; i < source.length; i++) {
    const ch = source[i];
    result += ch;
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return result; }
  }
  return null;
}

// Create VM context with storage
function createContext() {
  return vm.createContext({
    localStorage: {
      getItem(k) { return sharedStorage._ls[k] || null; },
      setItem(k, v) { sharedStorage._ls[k] = String(v); },
      removeItem(k) { delete sharedStorage._ls[k]; },
    },
    sessionStorage: {
      getItem(k) { return sharedStorage._ss[k] || null; },
      setItem(k, v) { sharedStorage._ss[k] = String(v); },
      removeItem(k) { delete sharedStorage._ss[k]; },
    },
    console, Math, JSON, parseFloat, isNaN, String,
  });
}

// Extract utility functions (no DOM needed)
const utilityFunctions = ['storeSet', 'storeGet', 'storeDel', 'safeEvalCalc', 'shuffleArray'];
const extracted = {};
for (const name of utilityFunctions) {
  const funcStr = extractFunction(appSource, name);
  if (funcStr) {
    try {
      const ctx = createContext();
      extracted[name] = vm.runInContext(`(${funcStr})`, ctx);
    } catch (e) { /* skip */ }
  }
}

export function getApp() {
  return extracted;
}

export function getSharedStorage() { return sharedStorage; }
