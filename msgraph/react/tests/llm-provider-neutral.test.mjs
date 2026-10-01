import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * NL→Graph, provider-neutral.
 *
 * Before 2026-10-01 four values were hard-wired to OpenRouter: the endpoint,
 * the model, the key's sessionStorage name ('or_key'), and the parse of the
 * response. Changing any of them meant editing app.jsx, so the one provider
 * that costs nothing could not be used at all.
 *
 * These tests exercise the provider table and the response parser against what
 * the real providers actually answer, recorded here as fixtures. The live
 * counterpart is ~/idun/llm_provider_test.py, which calls Nous for real and
 * needs a key — the split is deliberate, so `node --test` stays offline and
 * fast while the claims about live behaviour stay checkable.
 *
 * RECORDED FROM THE LIVE APIs 2026-10-01, poolside/laguna-s-2.1:free:
 *
 *   'alle Teams des Users'
 *     {"method":"GET","path":"/me/joinedTeams","perm":"Team.ReadBasic.All",...}   cost 0
 *   'zeig mir meine Mails'
 *     {"method":"GET","path":"/me/messages","perm":"Mail.Read",...}                cost 0
 *   'meine Termine diese Woche'
 *     {"method":"GET","path":"/me/calendarview?start=2025-01-13T00:00:00Z&end=..."} cost 0
 *
 *   openai/gpt-4o-mini -> 404
 *     {"status":404,"message":"Model 'openai/gpt-4o-mini' requires available credits.
 *      Your account balance is too low to use paid models ... pick a free model.",
 *      "code":"insufficient_credits_for_paid_model"}
 *   -> 404, NOT 402. A health check on 401/403 would pass a broken key.
 *
 *   poolside/laguna-s-2.1:free at upstream capacity -> 429
 *     "The requested model is temporarily at capacity upstream. This is not
 *      your API key's rate limit — please retry shortly."
 *     retry-after: 30, x-ratelimit-remaining-requests: 47
 *   -> the key's own budget is untouched. Measured three calls in a row: 429,
 *      429, 200. So "it failed" is the wrong message for a 429 — retrying
 *      works, changing provider would not, and only the headers tell them
 *      apart.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const src = fs.readFileSync(path.join(ROOT, 'assets', 'app.jsx'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');

const code = src.split('\n').filter((l) => !/^\s*(\/\*|\*|\*\/|\/\/)/.test(l)).join('\n');
const appCode = app.split('\n').filter((l) => !/^\s*(\/\*|\*|\*\/|\/\/)/.test(l)).join('\n');

// Pull the real implementations out of app.jsx rather than restating them.
// A test that copies the code under test copies its bug with it.
function extract(name) {
  // `async function` must match too — probeLLM and loadCatalog are both async,
  // and an extractor that only knows `function name(` reports them as missing,
  // which reads as "the code is gone" rather than "the matcher is too narrow".
  const re = new RegExp(`^(?:async\\s+)?function ${name}\\([\\s\\S]*?\\n\\}`, 'm');
  const m = src.match(re);
  assert.ok(m, `${name} not found in app.jsx`);
  return m[0];
}
function extractConst(name) {
  const m = src.match(new RegExp(`^const ${name} = (\\{[\\s\\S]*?\\n\\};)`, 'm'));
  assert.ok(m, `${name} not found in app.jsx`);
  return m[0];
}

/* Load the extracted code once, tolerantly.
 *
 * Against the pre-refactor app.jsx nothing here exists, so a strict extractor
 * threw at module load and node reported a single
 * "test failed" for the whole FILE. That is technically a red test and
 * practically useless: it says nothing about WHICH guarantee broke, so a
 * failure gives no lead.
 *
 * So the extraction is lazy and per-name. A test that needs llmParse fails
 * with "llmParse not found in app.jsx", which names the missing thing, and
 * the tests that do not need it still run. Same reason the i18n suite reports
 * five named failures against the old code instead of one. */
function load(need) {
  const parts = [];
  if (need.providers) parts.push(extractConst('LLM_PROVIDERS'));
  if (need.llmText) parts.push(extract('llmText'));
  if (need.llmParse) parts.push(extract('llmParse'));
  // The return list must mirror `parts` EXACTLY, under the NAMES the caller
  // destructures. Returning all three unconditionally is a ReferenceError for
  // anything not extracted — which is what happened on the first attempt:
  // the llmParse tests asked for {llmParse: true} and still died on
  // "llmText is not defined". And the flag names are not always the symbol
  // names ({providers: true} returns LLM_PROVIDERS), so they are mapped
  // rather than reused.
  const SYMBOL = { providers: 'LLM_PROVIDERS', llmText: 'llmText', llmParse: 'llmParse' };
  const names = Object.keys(need).filter((k) => need[k]).map((k) => SYMBOL[k]);
  return new Function(`${parts.join('\n')}\nreturn { ${names.join(', ')} };`)();
}

/* A test body that needs no extracted code at all (it only greps the source)
 * can call this instead — it must not throw when the code is missing. */
function sourceOnly() {
  return { code, appCode };
}

test('both providers speak the OpenAI chat-completions shape', () => {
  const { LLM_PROVIDERS } = load({ providers: true });
  const ids = Object.keys(LLM_PROVIDERS);
  assert.ok(ids.includes('openrouter'), 'OpenRouter must stay available');
  assert.ok(ids.includes('nous'), 'the free provider must be available');
  for (const id of ids) {
    const p = LLM_PROVIDERS[id];
    assert.match(p.base, /^https:\/\//, `${id} base must be https`);
    assert.ok(p.model && !/\s/.test(p.model), `${id} needs a model without spaces`);
    assert.ok(p.keyName, `${id} needs its own sessionStorage key name`);
    // Two providers sharing one storage key means pasting one key silently
    // overwrites the other.
    assert.ok(!/^https?:\/\//.test(p.keyName), `${id} keyName must be a storage name, not a URL`);
  }
  const keys = ids.map((i) => LLM_PROVIDERS[i].keyName);
  assert.equal(new Set(keys).size, keys.length,
    `providers share a key storage slot: ${keys.join(', ')}`);
});

test('the free model is the one that answered, and it is marked as such', () => {
  const { LLM_PROVIDERS } = load({ providers: true });
  assert.equal(LLM_PROVIDERS.nous.model, 'poolside/laguna-s-2.1:free');
  // It has to look like a free model: the `:free` suffix is the only signal
  // that survives a catalogue change, and it is what the UI hint tells users.
  assert.match(LLM_PROVIDERS.nous.model, /:free$/,
    'the default Nous model must be a :free one, or the hint lies');
});

test('llmParse reads what the real providers answered', () => {
  const api = load({ llmText: true, llmParse: true });
  const real = [
    ['alle Teams des Users',
      '{"method":"GET","path":"/me/joinedTeams","perm":"Team.ReadBasic.All","reason":"List all Teams"}'],
    ['zeig mir meine Mails',
      '{"method":"GET","path":"/me/messages","perm":"Mail.Read","reason":"List emails"}'],
    ['meine Termine diese Woche',
      '{"method":"GET","path":"/me/calendarview?start=2025-01-13T00:00:00Z&end=2025-01-19T23:59:59Z","perm":"Calendars.Read"}'],
  ];
  for (const [q, raw] of real) {
    const g = api.llmParse(raw);
    assert.match(g.path, /^\/me\//, `${q}: ${g.path} is not a /me path`);
    assert.match(g.method, /^[A-Z]+$/);
    assert.equal(g.reason, 'llm');
  }
});

test('llmParse survives prose and code fences around the JSON', () => {
  const api = load({ llmText: true, llmParse: true });
  assert.equal(api.llmParse('```json\n{"method":"GET","path":"/me/events"}\n```').path, '/me/events');
  assert.equal(
    api.llmParse('Sure! Here you go: {"method":"GET","path":"/me/joinedTeams"} hope that helps').path,
    '/me/joinedTeams');
  assert.equal(api.llmParse('{"path":"/me/drive/root/children"}').method, 'GET',
    'a missing method must default to GET');
  assert.equal(api.llmParse('{"method":"get","path":"/me"}').method, 'GET',
    'a lowercase method must be upper-cased');
});

test('llmParse refuses an answer it cannot turn into a Graph call', () => {
  const api = load({ llmText: true, llmParse: true });
  const bad = [
    ['I cannot help with that.', 'no JSON at all'],
    ['{"method":"GET","path":"me/messages"}', 'no leading slash'],
    ['{"method":"GE T","path":"/me"}', 'method with a space'],
    ['{"method":"GET"}', 'no path'],
  ];
  for (const [raw, why] of bad) {
    assert.throws(() => api.llmParse(raw), new RegExp('.*'),
      `llmParse accepted ${why}: ${raw}`);
  }
});

test('a query string in the path survives (calendarview needs it)', () => {
  // The live answer for "meine Termine" carried
  //   /me/calendarview?start=...&end=...
  // A validation rule of "no ? in the path" would reject the one real answer
  // that needs a date range, so the rule stays "starts with /".
  const g = load({ llmText: true, llmParse: true }).llmParse('{"method":"GET","path":"/me/calendarview?start=2026-01-13T00:00:00Z"}');
  assert.equal(g.path, '/me/calendarview?start=2026-01-13T00:00:00Z');
});

test('the UI no longer hard-wires OpenRouter', () => {
  // The four things that were baked in.
  assert.ok(!/sessionStorage\.setItem\('or_key'/.test(code),
    "the key is still written to the hard-coded 'or_key' slot");
  assert.ok(!/fetch\('https:\/\/openrouter\.ai/.test(code),
    'a fetch still targets a hard-coded OpenRouter URL');
  assert.ok(!/callOpenRouter/.test(code), 'the old OpenRouter-only helper is still called');
  // And the knobs exist.
  assert.match(code, /LLM_PROVIDER_IDS\.map/);
  assert.match(code, /setProv\(/);
  assert.match(code, /setModel\(/);
  assert.match(code, /sessionStorage\.setItem\('llm_prov'/);
});

test('the probe distinguishes "no credits" from "model busy"', () => {
  // 404 + insufficient_credits means: change model or pay.
  // 429 + retry-after means: the budget is fine, wait.
  // Collapsing both into "failed" was the original defect.
  const fn = extract('probeLLM');
  assert.match(fn, /retry-after/, 'the probe must read retry-after');
  assert.match(fn, /x-ratelimit-remaining-requests/,
    'the probe must read the remaining budget to tell 429 from a real limit');
  assert.match(fn, /insufficient_credits|b\.code/, 'the probe must surface the error code');
  assert.match(code, /probe\.status === 429/,
    'the UI must branch on 429 separately');
});

test('the catalogue filter uses pricing, because there is no is_free field', () => {
  // Measured 2026-10-01 against /models: 427 entries, no is_free anywhere,
  // six with pricing.prompt === "0". Filtering on is_free finds nothing.
  const fn = extract('loadCatalog');
  assert.match(fn, /pricing/);
  assert.match(fn, /prompt/);
  assert.ok(!/is_free/.test(fn), 'there is no is_free field to filter on');
  assert.match(fn, /'0'/, 'the free marker is the string "0", not the number 0');
});

test('app.js is the current compile of app.jsx', () => {
  assert.match(appCode, /LLM_PROVIDERS/);
  assert.match(appCode, /llmParse/);
  assert.ok(!/callOpenRouter/.test(appCode),
    'the compiled bundle still carries the removed helper');
});