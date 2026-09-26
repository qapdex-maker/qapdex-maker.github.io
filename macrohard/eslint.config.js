const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  navigator: 'readonly',
  AudioContext: 'readonly',
  webkitAudioContext: 'readonly',
  requestAnimationFrame: 'readonly',
  FileReader: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  alert: 'readonly',
  prompt: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  JSON: 'readonly',
  Math: 'readonly',
  Date: 'readonly',
  Object: 'readonly',
  Array: 'readonly',
  parseInt: 'readonly',
  parseFloat: 'readonly',
  isNaN: 'readonly',
  encodeURI: 'readonly',
  decodeURI: 'readonly',
  location: 'readonly',
  history: 'readonly',
  screen: 'readonly',
  Image: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  Response: 'readonly',
  Promise: 'readonly',
  Symbol: 'readonly',
  Map: 'readonly',
  Set: 'readonly',
  WeakMap: 'readonly',
  WeakSet: 'readonly',
  Proxy: 'readonly',
  Reflect: 'readonly',
  Intl: 'readonly',
  fetch: 'readonly',
  XMLHttpRequest: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
  Audio: 'readonly',
  performance: 'readonly',
  cancelAnimationFrame: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
  Event: 'readonly',
  KeyboardEvent: 'readonly',
  MouseEvent: 'readonly',
  WheelEvent: 'readonly',
  HTMLElement: 'readonly',
  Node: 'readonly',
  DOMParser: 'readonly',
  crypto: 'readonly',

  /* Globals that app.js and its siblings provide at runtime, but that ESLint
   * cannot see as declarations:
   *   storeSet/storeGet/storeDel/storeHas — assigned in assets/js/storage.js
   *     via `global.storeSet = storeSet` on the window object.
   *   startOS — assigned in app.js as window.startOS = function(){}.
   *   openApp/toast — assigned on window at the end of app.js's IIFE, and read
   *     by the apps that live outside that IIFE. See the comment there: without
   *     the exports they threw "ReferenceError: toast is not defined".
   * These are real window properties in the browser, so declaring them removes
   * the false positive without hiding a genuine bug. */
  storeSet: 'readonly',
  storeGet: 'readonly',
  storeDel: 'readonly',
  storeHas: 'readonly',
  startOS: 'readonly',
  openApp: 'readonly',
  toast: 'readonly',
};

export default [
  {
    // Unvollständige bzw. nicht geladene ES-Module (siehe ROADMAP).
    ignores: [
      'assets/js/main.js',
      'assets/js/i18n.js',
      'assets/js/window-manager.js',
      'assets/js/radio-stations.js',
      'assets/safe-eval.js',
    ],
  },
  {
    files: [
      'assets/**/*.js',
      '!assets/js/main.js',
      '!assets/js/i18n.js',
      '!assets/js/window-manager.js',
      '!assets/js/radio-stations.js',
      '!assets/safe-eval.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      // IIFE-local cross-function references (pCtx, SEQ, toast, openApp, ...) and
      // deliberate `typeof fn === 'function'` probes are resolved at runtime, not
      // in the global scope. Verified in the browser, so this stays a warning.
      'no-undef': 'warn',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'no-console': 'off',
      semi: ['warn', 'always'],
      quotes: ['warn', 'single'],
      indent: ['warn', 2],
      'no-mixed-spaces-and-tabs': 'error',
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
      'comma-dangle': ['warn', 'always-multiline'],
      // `catch (e) {}` is intentional here: localStorage/QuotaExceededError and
      // optional browser APIs are guarded with an empty block on purpose.
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-extra-semi': 'warn',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
];
