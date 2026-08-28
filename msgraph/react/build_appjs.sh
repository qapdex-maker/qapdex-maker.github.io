#!/bin/sh
# Regenerate assets/app.js from assets/app.jsx (precompile, no in-browser Babel).
# Usage: sh build_appjs.sh   (run from the msgraph/react dir)
set -e
cd "$(dirname "$0")"
BABEL_JS="${HOME}/.cache_babel_standalone.js"
if [ ! -f "$BABEL_JS" ]; then
  echo "downloading @babel/standalone ..."
  curl -sL https://unpkg.com/@babel/standalone@7/babel.min.js -o "$BABEL_JS"
fi
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const babelPath = process.env.HOME + '/.cache_babel_standalone.js';
const code = fs.readFileSync(babelPath, 'utf8');
const mod = { exports: {} };
new Function('module','exports', code)(mod, mod.exports);
const Babel = mod.exports;
const jsx = fs.readFileSync('assets/app.jsx', 'utf8');
const out = Babel.transform(jsx, { presets: ['react'] });
const header = '/* AUTO-GENERATED from assets/app.jsx -- do not edit by hand.\n' +
  '   Regenerate: sh build_appjs.sh */\n';
fs.writeFileSync('assets/app.js', header + out.code);
console.log('app.js written, bytes:', fs.statSync('assets/app.js').size);
NODE
node --check assets/app.js && echo "SYNTAX OK" || { echo "SYNTAX FAIL"; exit 1; }
echo "React.createElement calls: $(grep -c 'React.createElement' assets/app.js)"
echo "build done."
