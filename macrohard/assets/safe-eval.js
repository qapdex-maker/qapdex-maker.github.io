/* Safe Calculator Evaluator — ersetzt eval() */
/* Unterstützt: +,-,*,/,(), Math.sin/cos/tan/sqrt/pow/log/abs, Math.PI, Math.E, 1.618... */
function safeEvalCalc(expr) {
  // Whitelist: Nur diese Zeichen erlauben
  if (!/^[\d+\-*/().,\s_a-zA-Zπφ]+$/.test(expr)) {
    throw new Error('Invalid characters');
  }

  // Tokenizer
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch) || ch === '.') {
      let num = '';
      while (i < expr.length && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i++];
      }
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === 'M' && expr.substr(i, 4) === 'Math') {
      // Math.X
      const rest = expr.substr(i);
      const m = rest.match(/^Math\.(PI|E|sin|cos|tan|sqrt|pow|log|abs)/);
      if (m) {
        tokens.push({ type: 'math', value: m[1] });
        i += m[0].length;
        continue;
      }
    }
    if (ch === 'π') {
      tokens.push({ type: 'num', value: Math.PI });
      i++;
      continue;
    }
    if (ch === 'φ') {
      tokens.push({ type: 'num', value: (1 + Math.sqrt(5)) / 2 });
      i++;
      continue;
    }
    throw new Error('Unknown token: ' + ch);
  }

  // Shunting-Yard → RPN
  const output = [];
  const ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };

  for (const tok of tokens) {
    if (tok.type === 'num') {
      output.push(tok);
    } else if (tok.type === 'math') {
      ops.push(tok);
    } else if (tok.type === 'op') {
      while (ops.length > 0 && ops[ops.length - 1].type === 'op' && prec[ops[ops.length - 1].value] >= prec[tok.value]) {
        output.push(ops.pop());
      }
      ops.push(tok);
    } else if (tok.value === '(') {
      ops.push(tok);
    } else if (tok.value === ')') {
      while (ops.length > 0 && ops[ops.length - 1].value !== '(') {
        output.push(ops.pop());
      }
      ops.pop(); // remove '('
      if (ops.length > 0 && ops[ops.length - 1].type === 'math') {
        output.push(ops.pop());
      }
    }
  }
  while (ops.length > 0) output.push(ops.pop());

  // Evaluate RPN
  const stack = [];
  for (const tok of output) {
    if (tok.type === 'num') {
      stack.push(tok.value);
    } else if (tok.type === 'op') {
      const b = stack.pop(), a = stack.pop();
      if (tok.value === '+') stack.push(a + b);
      else if (tok.value === '-') stack.push(a - b);
      else if (tok.value === '*') stack.push(a * b);
      else if (tok.value === '/') stack.push(a / b);
    } else if (tok.type === 'math') {
      const fn = tok.value;
      if (fn === 'PI') stack.push(Math.PI);
      else if (fn === 'E') stack.push(Math.E);
      else if (fn === 'sin') stack.push(Math.sin(stack.pop()));
      else if (fn === 'cos') stack.push(Math.cos(stack.pop()));
      else if (fn === 'tan') stack.push(Math.tan(stack.pop()));
      else if (fn === 'sqrt') stack.push(Math.sqrt(stack.pop()));
      else if (fn === 'pow') { const e = stack.pop(), b = stack.pop(); stack.push(Math.pow(b, e)); }
      else if (fn === 'log') stack.push(Math.log(stack.pop()));
      else if (fn === 'abs') stack.push(Math.abs(stack.pop()));
    }
  }
  return stack[0];
}
