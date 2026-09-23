// Safe Calculator Evaluator — Recursive Descent Parser
// Supports: +,-,*,/,(,), numbers, Math.PI/E/sin/cos/tan/sqrt/pow/log/abs, π, φ, unary minus
function safeEvalCalc(expr) {
  // Whitelist: Only allow known characters
  if (!/^[-+*/().,\s\d_a-zA-Zπφ]+$/.test(expr)) {
    throw new Error('Invalid expression');
  }

  let pos = 0;
  const str = expr;

  function peek() { return str[pos]; }
  function get() { return str[pos++]; }

  function skipWhitespace() {
    while (pos < str.length && /\s/.test(str[pos])) pos++;
  }

  function parseNumber() {
    skipWhitespace();
    let num = '';
    // Unary minus
    if (peek() === '-') { num += get(); }
    while (pos < str.length && (/[0-9]/.test(peek()) || peek() === '.')) {
      num += get();
    }
    const val = parseFloat(num);
    if (isNaN(val)) throw new Error('Invalid number: ' + num);
    return val;
  }

  function parseMathFn() {
    skipWhitespace();
    if (str.substr(pos, 5) === 'Math.') {
      pos += 5;
      const m = str.substr(pos).match(/^(PI|E|sin|cos|tan|sqrt|pow|log|abs)/);
      if (m) {
        pos += m[0].length;
        return m[1];
      }
    }
    return null;
  }

  function parsePrimary() {
    skipWhitespace();

    const ch = peek();

    // Math function or constant
    const fn = parseMathFn();
    if (fn) {
      if (fn === 'PI') return Math.PI;
      if (fn === 'E') return Math.E;
      // Function call
      skipWhitespace();
      if (get() !== '(') throw new Error('Expected (');
      const args = [];
      skipWhitespace();
      if (peek() !== ')') {
        args.push(parseExpr());
        while (peek() === ',') {
          get(); // skip comma
          args.push(parseExpr());
        }
      }
      skipWhitespace();
      if (get() !== ')') throw new Error('Expected )');
      switch (fn) {
        case 'sin': return Math.sin(args[0]);
        case 'cos': return Math.cos(args[0]);
        case 'tan': return Math.tan(args[0]);
        case 'sqrt': return Math.sqrt(args[0]);
        case 'pow': return Math.pow(args[0], args[1]);
        case 'log': return Math.log(args[0]);
        case 'abs': return Math.abs(args[0]);
      }
    }

    // Constants
    if (ch === 'π') { get(); return Math.PI; }
    if (ch === 'φ') { get(); return (1 + Math.sqrt(5)) / 2; }

    // Parenthesized expression
    if (ch === '(') {
      get(); // skip (
      const val = parseExpr();
      skipWhitespace();
      if (get() !== ')') throw new Error('Expected )');
      return val;
    }

    // Number
    if (/[0-9]/.test(ch) || ch === '.') {
      return parseNumber();
    }

    throw new Error('Unexpected: ' + ch);
  }

  function parseUnary() {
    skipWhitespace();
    if (peek() === '-') {
      get();
      return -parsePrimary();
    }
    if (peek() === '+') {
      get();
      return parsePrimary();
    }
    return parsePrimary();
  }

  function parseMulDiv() {
    let left = parseUnary();
    skipWhitespace();
    while (peek() === '*' || peek() === '/') {
      const op = get();
      const right = parseUnary();
      if (op === '*') left = left * right;
      else left = left / right;
      skipWhitespace();
    }
    return left;
  }

  function parseExpr() {
    let left = parseMulDiv();
    skipWhitespace();
    while (peek() === '+' || peek() === '-') {
      const op = get();
      const right = parseMulDiv();
      if (op === '+') left = left + right;
      else left = left - right;
      skipWhitespace();
    }
    return left;
  }

  const result = parseExpr();
  skipWhitespace();
  if (pos < str.length) {
    throw new Error('Unexpected: ' + str.substr(pos));
  }
  return result;
}

export { safeEvalCalc };
