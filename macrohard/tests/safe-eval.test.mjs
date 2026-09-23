import { safeEvalCalc } from './safe-eval.js';

const tests = [
  // Basic arithmetic
  ['1+1', 2],
  ['2*3', 6],
  ['10/2', 5],
  ['2+3*4', 14],
  ['(2+3)*4', 20],
  ['10-3', 7],
  ['100/4', 25],
  ['(1+2)*(3+4)', 21],
  ['1.5+2.5', 4],

  // Math constants
  ['Math.PI', Math.PI],
  ['Math.E', Math.E],
  ['π', Math.PI],
  ['φ', (1+Math.sqrt(5))/2],
  ['Math.PI*2', Math.PI*2],

  // Math functions
  ['Math.sqrt(16)', 4],
  ['Math.sin(0)', 0],
  ['Math.cos(0)', 1],
  ['Math.pow(2,3)', 8],
  ['Math.log(1)', 0],
  ['Math.abs(-5)', 5],

  // Unary minus
  ['-5+3', -2],
  ['-(3+2)', -5],

  // Complex
  ['Math.sin(Math.PI/2)', 1],
  ['Math.sqrt(9)+Math.sqrt(16)', 7],
];

let pass = 0;
let total = tests.length;

console.log('Expression tests:');
for (const [expr, expected] of tests) {
  try {
    const result = safeEvalCalc(expr);
    if (Math.abs(result - expected) < 1e-10) {
      pass++;
      console.log('  ✓', expr, '=', result);
    } else {
      console.log('  ✗', expr, '→', result, '(expected', expected + ')');
    }
  } catch (e) {
    console.log('  ✗', expr, 'ERROR:', e.message);
  }
}

console.log('');
console.log('Security tests:');

// XSS / injection
const attacks = [
  'alert(1)',
  'console.log(1)',
  'eval(1)',
  'Function("return 1")()',
  'window.location',
  'document.cookie',
  '(1).constructor',
  '__proto__',
  'Math.constructor',
  'Math.__proto__',
  'Math.__lookupGetter__',
  'Math.toString',
  'Math+1',
  '""+Math',
];

total += attacks.length;
for (const a of attacks) {
  try {
    safeEvalCalc(a);
    console.log('  ✗ SECURITY FAIL:', a, 'was allowed!');
  } catch (e) {
    pass++;
    console.log('  ✓ blocked:', a);
  }
}

console.log('');
console.log('Result:', pass, '/', total, 'passed');
if (pass === total) {
  console.log('✓ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('✗ SOME TESTS FAILED');
  process.exit(1);
}
