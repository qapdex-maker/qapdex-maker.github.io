const { useState, useEffect, useRef, useMemo } = React;

const RAW = 'https://raw.githubusercontent.com/qapdex-maker/metadata-msgraph/master/';

/* Absolute URL for a data file next to the page.
 *
 * window.location.href may carry a query string or a hash, and both break the
 * naive `href.replace(/index\.html?$/, '')`:
 *   /?v=1  ->  http://host/?v=1data/index.beta.json  ->  404 HTML -> res.json() throws
 * That failure is invisible: the worker reports it, the caller swallows it, and
 * the feature silently does nothing. Normal use has no query string, so it only
 * shows up when someone adds one for cache-busting — which is exactly when it
 * matters. */
const dataUrl = (rel) => window.location.href.split(/[?#]/)[0].replace(/index\.html?$/, '') + rel;
const SITE = { 'v1.0': 'openapi/v1.0/openapi.yaml', beta: 'openapi/beta/openapi.yaml' };

// ---------- Virtualized list (only renders visible rows) ----------
function VirtList({ items, rowHeight = 58, height = 480, renderRow }) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = items.length;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 4);
  const end = Math.min(total, Math.ceil((scrollTop + height) / rowHeight) + 4);
  const visible = items.slice(start, end);
  return (
    <div className="virtlist" style={{ height, overflowY: 'auto', border: '1px solid var(--line)' }}
         onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: total * rowHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${start * rowHeight}px)` }}>
          {visible.map((it, i) => (
            <div key={start + i} style={{ height: rowHeight, display: 'flex', alignItems: 'center' }}>
              {renderRow(it)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- i18n ----------
const I18N = {
  de: {
    hero_h1: <>Graph Metadata <span className="hl">Hub</span></>,
    hero_lead: 'Schaufenster für metadata-msgraph — Microsoft Graph als OpenAPI, CSDL & Typ-Mappings. Plus die Semantics Console.',
    schema: 'schema', sync: 'sync',
    projekte: 'Projekte', downloads: 'Download-Hub (roh)',
    raw: 'raw herunterladen ↗',
    reference: 'API Reference', ref_hint: 'Durchsuchbare Endpoint-Liste aus den echten Metadaten (im Web Worker geladen → kein Freeze).',
    ref_ph: 'Endpoint suchen (z.B. /me, team)…', ref_open: '↗ rohe Spec öffnen',
    console: 'Semantics Console', console_hint: 'Gib natürliche Sprache oder einen Endpoint ein → curl + idun-Befehl.',
    nl: 'Natürliche Sprache', nl_btn: 'NL → Graph', endpoint: 'Endpoint', nl_ph: 'z.B. alle Teams des Users',
    llm: 'LLM-Modus (OpenRouter)', llm_key_ph: 'OpenRouter API-Key (bleibt lokal, nie an unseren Server)', llm_btn: 'NL → Graph (LLM)', llm_busy: 'LLM wird gefragt…', llm_err: 'LLM fehlgeschlagen — Heuristik genutzt', llm_hint: 'Optional: eigener OpenRouter-Key für NL→Graph via LLM. Key bleibt im Browser (sessionStorage), nie committet oder an uns gesendet. Ohne Key Fallback auf die Stichwort-Heuristik.',
    perm: 'Permission Intelligence', perm_hint: 'Kuratiert (OpenAPI hier hat keine strukturierten scopes). Jede Permission mit least-privilege-Empfehlung.',
    perm_ph: 'Permission suchen…',
    radar: 'Breaking-Change Radar', radar_hint: 'Echte Deprecations aus den Metadaten (x-ms-deprecation).',
    dep: 'Deprecations',
    proj: {
      'qapdex-maker/metadata-msgraph': { de: 'Datenquelle (CSDL/OpenAPI/Typ-Mappings)', en: 'Data source (CSDL/OpenAPI/Type-Mappings)' },
      'qapdex-maker/idun-sdk': { de: 'Azure AI Foundry Client', en: 'Azure AI Foundry client' },
      'qapdex-maker/idun-playground': { de: 'Multi-LLM-Console (17 Provider)', en: 'Multi-LLM console (17 providers)' },
    },
    status: { de: { removed: 'entfernt', soon: 'bald', planned: 'geplant' }, en: { removed: 'removed', soon: 'soon', planned: 'planned' } },
    live: '● sync {d}', live_loading: '○ lade Metadaten…', live_err: '○ Sync-Stand unbekannt', ignite: 'Ignite', en: 'EN', de: 'DE',
    footer: 'qapdex-maker.github.io · React Prototyp · Daten: metadata-msgraph',
    cur_user: 'Aktueller Benutzer',
    loading: 'lädt…', loading_var: 'lädt {v}…', count_n: '{n} Endpoints', err: 'Fehler:',
    tab_v10: 'v1.0 (stabil)', tab_beta: 'beta (Preview)', hits: 'Treffer:',
    filter_all: 'alle', filter_soon: 'bald', filter_removed: 'entfernt', removal: 'Entfernung:',
    // Added 2026-09-27: the radar now counts the FILTERED list and shows an
    // empty state. Both keys were missing — a new t.* key without a DE entry
    // leaks the raw key into the UI, which is exactly how the F3 'llm' reason
    // bug happened before.
    filter_shown: 'gefiltert', radar_empty: 'Keine Einträge für diesen Filter.',
    // Sketch panel (2026-09-27). Replaces the mislabelled "React" button,
    // which was a themeswitch left over from the pre-React site.
    sketch: 'Skizzen', sketch_h: 'Cloud-Skizzen',
    sketch_hint: 'CSDL-Dokumente je Ring. Klick lädt genau eine Datei in den Worker und zählt die Typen — 17 Dateien wären zusammen ~90 MB.',
    sketch_entity: 'EntityTypes', sketch_complex: 'ComplexTypes', sketch_enum: 'EnumTypes',
    sketch_total: 'Typen gesamt', sketch_load: 'zählen', sketch_counting: 'zählt…',
    sketch_missing: 'fehlt', sketch_raw: 'roh', sketch_err: 'Fehler beim Laden',
    sketch_v10: 'v1.0', sketch_beta: 'beta',
    // Type -> endpoint join (2026-09-27) — see the DE table.
    sketch_join: '{a} of {b} types with endpoints',
    sketch_join_none: 'none',
    sketch_ep: 'endpoints',
    sketch_noep: 'no direct endpoints',
    sketch_navonly: 'navigation only',
    sketch_types: 'linked types',
    sketch_more: '+ {n} more', sketch_less: 'show less',
    // Type -> endpoint join (2026-09-27). Measured on beta-Mooncake: 54 types
    // have an EntitySet, 53 of them reach endpoints. `message` has none — it is
    // only a NavigationProperty of `user`, so saying so is the honest text.
    sketch_join: '{a} von {b} Typen mit Endpoints',
    sketch_join_none: 'keine',
    sketch_ep: 'Endpoints',
    sketch_noep: 'ohne direkte Endpoints',
    sketch_navonly: 'nur über Navigation',
    sketch_types: 'Typen mit Verknüpfung',
    sketch_more: '+ {n} weitere', sketch_less: 'weniger anzeigen',
    nl_reasons: { teams: 'Teams', mails: 'Mails', calendar: 'Kalender', onedrive: 'OneDrive', photo: 'Profilfoto', default: 'Standard', llm: 'LLM-Zuordnung' },
  },
  en: {
    hero_h1: <>Graph Metadata <span className="hl">Hub</span></>,
    hero_lead: 'Showcase for metadata-msgraph — Microsoft Graph as OpenAPI, CSDL & Type Mappings. Plus the Semantics Console.',
    schema: 'schema', sync: 'sync',
    projekte: 'Projects', downloads: 'Download-Hub (raw)',
    raw: 'download raw ↗',
    reference: 'API Reference', ref_hint: 'Searchable endpoint list from the real metadata (loaded in a Web Worker → no freeze).',
    ref_ph: 'Search endpoint (e.g. /me, team)…', ref_open: '↗ open raw spec',
    console: 'Semantics Console', console_hint: 'Enter natural language or an endpoint → curl + idun command.',
    nl: 'Natural Language', nl_btn: 'NL → Graph', endpoint: 'Endpoint', nl_ph: 'e.g. all teams of the user',
    llm: 'LLM mode (OpenRouter)', llm_key_ph: 'OpenRouter API key (stay local, never sent to our server)', llm_btn: 'NL → Graph (LLM)', llm_busy: 'asking LLM…', llm_err: 'LLM failed — used heuristic', llm_hint: 'Optional: paste your own OpenRouter key to map NL via an LLM. Key stays in your browser (sessionStorage), never committed or sent to us. Falls back to the keyword heuristic without a key.',
    perm: 'Permission Intelligence', perm_hint: 'Curated (the OpenAPI here has no structured scopes). Least-privilege note per permission.',
    perm_ph: 'Search permission…',
    radar: 'Breaking-Change Radar', radar_hint: 'Real deprecations from the metadata (x-ms-deprecation).',
    dep: 'Deprecations',
    proj: {
      'qapdex-maker/metadata-msgraph': { de: 'Datenquelle (CSDL/OpenAPI/Typ-Mappings)', en: 'Data source (CSDL/OpenAPI/Type-Mappings)' },
      'qapdex-maker/idun-sdk': { de: 'Azure AI Foundry Client', en: 'Azure AI Foundry client' },
      'qapdex-maker/idun-playground': { de: 'Multi-LLM-Console (17 Provider)', en: 'Multi-LLM console (17 providers)' },
    },
    status: { de: { removed: 'entfernt', soon: 'bald', planned: 'geplant' }, en: { removed: 'removed', soon: 'soon', planned: 'planned' } },
    live: '● sync {d}', live_loading: '○ loading metadata…', live_err: '○ sync date unknown', ignite: 'Ignite', en: 'EN', de: 'DE',
    footer: 'qapdex-maker.github.io · React Prototype · Data: metadata-msgraph',
    cur_user: 'Current user',
    loading: 'loading…', loading_var: 'loading {v}…', count_n: '{n} endpoints', err: 'Error:',
    tab_v10: 'v1.0 (stable)', tab_beta: 'beta (Preview)', hits: 'Hits:',
    filter_all: 'all', filter_soon: 'soon', filter_removed: 'removed', removal: 'Removal:',
    filter_shown: 'filtered', radar_empty: 'No entries for this filter.',
    // Sketch panel (2026-09-27) — see the DE table above.
    sketch: 'Sketches', sketch_h: 'Cloud sketches',
    sketch_hint: 'CSDL documents per ring. Clicking loads exactly one file into the worker and counts the types — all 17 would be ~90 MB.',
    sketch_entity: 'Entity types', sketch_complex: 'Complex types', sketch_enum: 'Enum types',
    sketch_total: 'types total', sketch_load: 'count', sketch_counting: 'counting…',
    sketch_missing: 'missing', sketch_raw: 'raw', sketch_err: 'load failed',
    sketch_v10: 'v1.0', sketch_beta: 'beta',
    nl_reasons: { teams: 'Teams', mails: 'Mails', calendar: 'Calendar', onedrive: 'OneDrive', photo: 'Profile photo', default: 'Default', llm: 'LLM mapping' },
  }
};

// ---------- Hub ----------
function Hub({ t, m, lang }) {
  const projects = m?.projects || [];
  const dls = [
    ['OpenAPI v1.0', SITE['v1.0']],
    ['OpenAPI beta', SITE.beta],
    ['Type-Mappings v1.0', 'schemas/type-mappings/v1.0-entity-types.json']
  ];
  return (
    <div className="panel-inner">
      <h1 className="hero-h1">{t.hero_h1}</h1>
      <p className="lead">{t.hero_lead}</p>
      <div className="badges">
        <span className="badge">{t.schema} {m?.schemaVersion || '?'}</span>
        <span className="badge">{t.sync} {m?.syncDate || '?'}</span>
      </div>
      <h2 className="sect">{t.projekte}</h2>
      <div className="cards">
        {projects.map(p => {
          const role = (t.proj && t.proj[p.repo] && t.proj[p.repo][lang]) || p.role;
          return (
            <div className="card" key={p.name}>
              <h3>{p.name}</h3>
              <div className="role">{role}</div>
              <a className="dl" href={'https://github.com/' + p.repo} target="_blank" rel="noopener">github.com/{p.repo} ↗</a>
            </div>
          );
        })}
      </div>
      <h2 className="sect">{t.downloads}</h2>
      <div className="cards">
        {dls.map(([n, path]) => (
          <div className="card" key={n}>
            <h3>{n}</h3>
            <a className="dl" href={RAW + path} target="_blank" rel="noopener">{t.raw}</a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Reference (worker-backed, virtualized) ----------
function Reference({ t }) {
  const [variant, setVariant] = useState('v1.0');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [st, setSt] = useState({ kind: 'loading' });
  // Web Worker löst relatives fetch() gegen die Worker-Skript-URL auf
  // (/msgraph/react/assets/), nicht gegen die Seite (/msgraph/react/).
  // Deshalb hier ABSOLUTE URLs bauen und an den Worker durchreichen.
  const fileMap = {
    'v1.0': dataUrl('data/index.v1.0.json'),
    beta: dataUrl('data/index.beta.json')
  };
  const workerRef = useRef(null);
  const variantRef = useRef(variant);
  variantRef.current = variant; // immer aktueller Wert für onmessage-Stale-Guard

  useEffect(() => {
    const w = new Worker('assets/worker.js');
    workerRef.current = w;
    w.onmessage = (e) => {
      if (e.data.variant !== variantRef.current) return; // stale Antwort ignorieren
      if (e.data.ok) { setItems(e.data.items); setSt({ kind: 'ok', n: e.data.count }); }
      else setSt({ kind: 'err', msg: String(e.data.error) });
    };
    return () => w.terminate();
  }, []);

  useEffect(() => {
    setSt({ kind: 'variant', v: variant });
    setItems([]);
    workerRef.current?.postMessage({ variant, file: fileMap[variant] });
  }, [variant]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return items;
    return items.filter(f => f.path.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s));
  }, [items, q]);

  const status = st.kind === 'err' ? t.err + ' ' + st.msg
    : st.kind === 'variant' ? t.loading_var.replace('{v}', st.v)
    : st.kind === 'ok' ? t.count_n.replace('{n}', st.n)
    : t.loading;

  return (
    <div className="panel-inner">
      <h2 className="sect">{t.reference}</h2>
      <p className="hint">{t.ref_hint}</p>
      <div className="ref-tabs">
        <button className={'reftab' + (variant === 'v1.0' ? ' active' : '')} onClick={() => setVariant('v1.0')}>{t.tab_v10}</button>
        <button className={'reftab' + (variant === 'beta' ? ' active' : '')} onClick={() => setVariant('beta')}>{t.tab_beta}</button>
      </div>
      <div className="ref-controls">
        <input className="epinput" placeholder={t.ref_ph} value={q} onChange={e => setQ(e.target.value)} />
        <a className="btn" target="_blank" rel="noopener" href={RAW + SITE[variant]}>{t.ref_open}</a>
      </div>
      <div className="badges"><span className="badge">{status}</span>{q && <span className="badge">{t.hits} {filtered.length}</span>}</div>
      {filtered.length > 0 ? (
        <VirtList items={filtered} renderRow={f => (
          <div className="refrow" style={{ width: '100%' }}>
            <span className="mth">{f.method}</span> <span className="pth">{f.path}</span>
            {f.summary && <div className="meta-row">{f.summary}</div>}
          </div>
        )} />
      ) : <div className="hint" style={{ marginTop: '1rem' }}>{status}</div>}
    </div>
  );
}

// ---------- Console ----------
function ConsolePanel({ t }) {
  const [ep, setEp] = useState({ method: 'GET', path: '/me', kind: 'cur' });
  const [nl, setNl] = useState('');
  const [epq, setEpq] = useState('');
  const [idx, setIdx] = useState(null);
  const [sug, setSug] = useState([]);
  const [llmKey, setLlmKey] = useState(() => sessionStorage.getItem('or_key') || '');
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmErr, setLlmErr] = useState(false);

  // Off-thread load (same strategy as Reference): reach the index JSON via an
  // absolute URL through the worker so the 2.5 MB parse never hits the UI thread.
  const base = window.location.href.replace(/index\.html?$/, '');
  useEffect(() => {
    const w = new Worker('assets/worker.js');
    w.onmessage = (e) => {
      if (e.data.ok) setIdx(e.data.items);
      else setIdx([]); // graceful fallback if the worker fails
    };
    w.postMessage({ type: 'console', file: base + 'data/index.v1.0.json' });
    return () => w.terminate();
  }, []);

  function nlMap(s) {
    const tt = s.toLowerCase();
    const has = (...k) => k.some(x => tt.includes(x));
    if (has('termin', 'event', 'calendar', 'kalender')) return { method: 'GET', path: '/me/events', perm: 'Calendars.Read', reason: 'calendar' };
    if (has('team')) return { method: 'GET', path: '/me/joinedTeams', perm: 'Team.ReadBasic.All', reason: 'teams' };
    if (has('mail', 'email', 'e-mail')) return { method: 'GET', path: '/me/messages', perm: 'Mail.Read', reason: 'mails' };
    if (has('drive', 'onedrive', 'datei', 'file', 'dateien')) return { method: 'GET', path: '/me/drive/root/children', perm: 'Files.Read', reason: 'onedrive' };
    if (has('photo', 'bild', 'avatar', 'foto', 'profil')) return { method: 'GET', path: '/me/photo/$value', perm: 'User.Read', reason: 'photo' };
    return { method: 'GET', path: '/me', perm: 'User.Read', reason: 'default' };
  }
  function cmd(path, method) {
    const curl = `curl -X ${method} "https://graph.microsoft.com/v1.0${path}" -H "Authorization: Bearer ***"`;
    const idun = `idun graph call ${method} ${path}`;
    return { curl, idun };
  }
  async function callOpenRouter(query, key) {
    // Direct browser call (OpenRouter allows CORS for browser clients). The key
    // never leaves the user's browser sessionStorage; it is NOT sent to our
    // static Pages host. Falls back to the heuristic on any failure.
    const SYSTEM = 'You map a natural-language request to a Microsoft Graph v1.0 call. ' +
      'Respond with ONLY strict JSON: {"method":"GET|POST|...","path":"/me/...","perm":"Scope.Read","reason":"short"} ' +
      'Pick the closest real v1.0 endpoint. If unsure, use /me.';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: query }],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content || '';
    const j = JSON.parse(txt);
    if (!j.path) throw new Error('no path');
    return { method: (j.method || 'GET').toUpperCase(), path: j.path, perm: j.perm || '', reason: 'llm' };
  }

  function runNl() {
    setLlmErr(false);
    if (llmKey && nl.trim()) {
      setLlmBusy(true);
      callOpenRouter(nl, llmKey)
        .then(r => { setEp({ method: r.method, path: r.path, kind: 'nl', reason: 'llm', perm: r.perm }); })
        .catch(() => { setLlmErr(true); const r = nlMap(nl); setEp({ method: r.method, path: r.path, kind: 'nl', reason: r.reason, perm: r.perm }); })
        .finally(() => setLlmBusy(false));
      return;
    }
    const r = nlMap(nl);
    setEp({ method: r.method, path: r.path, kind: 'nl', reason: r.reason, perm: r.perm });
  }
  function onEpInput(val) {
    setEpq(val);
    if (!idx || !val.trim()) { setSug([]); return; }
    const s = val.toLowerCase();
    setSug(idx.filter(f => f.path.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s)).slice(0, 12));
  }
  function selectEndpoint(s) {
    setEp({ method: s.method, path: s.path, kind: 'data', data: s.summary });
    setEpq(s.path);
    setSug([]);
  }
  function epMeta(e) {
    if (e.kind === 'cur') return t.cur_user;
    if (e.kind === 'nl') return 'NL: ' + (t.nl_reasons[e.reason] || e.reason) + (e.perm ? ' · ' + e.perm : '');
    return e.data || '';
  }
  const c = cmd(ep.path, ep.method);
  return (
    <div className="panel-inner">
      <h2 className="sect">{t.console} <span className="newtag">Neuheit</span></h2>
      <p className="hint">{t.console_hint}</p>
      <div className="console-grid">
        <div>
          <label className="lbl">{t.nl}</label>
          <textarea id="nlInput" value={nl} onChange={e => setNl(e.target.value)} placeholder={t.nl_ph} />
          <button className="primary" onClick={runNl} disabled={llmBusy}>{llmBusy ? t.llm_busy : t.nl_btn}</button>
          <div className="llm-row">
            <input type="password" className="epinput" placeholder={t.llm_key_ph} value={llmKey}
              onChange={e => { setLlmKey(e.target.value); sessionStorage.setItem('or_key', e.target.value); }} />
            <button className="ghost" onClick={runNl} disabled={llmBusy || !llmKey}>{t.llm_btn}</button>
          </div>
          {llmErr && <p className="hint err">{t.llm_err}</p>}
          <p className="hint">{t.llm_hint}</p>
          <label className="lbl">{t.endpoint}</label>
          <input className="epinput" placeholder="/me" value={epq} onChange={e => onEpInput(e.target.value)} />
          <div className="suggest">
            {sug.map((s, i) => <div className="s" key={i} onClick={() => selectEndpoint(s)}>{s.method} {s.path}</div>)}
          </div>
        </div>
        <div>
          <div className="result-head"><span className="mth">{ep.method}</span><span className="pth">{ep.path}</span></div>
          <div className="meta-row" style={{ textAlign: 'left', marginLeft: 0, maxWidth: 'none' }}>{epMeta(ep)}</div>
          <div className="block"><div className="block-title">curl</div><pre>{c.curl}</pre></div>
          <div className="block"><div className="block-title">idun</div><pre>{c.idun}</pre></div>
        </div>
      </div>
    </div>
  );
}

// ---------- Permissions (curated, localized) ----------
const PERM_I18N = {
  'User.Read': { de: { cat: 'Identity', least: 'User.Read (statt User.ReadWrite.All)' }, en: { cat: 'Identity', least: 'User.Read (instead of User.ReadWrite.All)' } },
  'User.Read.All': { de: { cat: 'Identity', least: 'nur wenn alle User nötig' }, en: { cat: 'Identity', least: 'only if all users needed' } },
  'Group.Read.All': { de: { cat: 'Groups', least: 'Group.Read.All (statt Directory.Read.All)' }, en: { cat: 'Groups', least: 'Group.Read.All (instead of Directory.Read.All)' } },
  'Mail.Read': { de: { cat: 'Outlook', least: 'Mail.Read (statt Mail.ReadWrite)' }, en: { cat: 'Outlook', least: 'Mail.Read (instead of Mail.ReadWrite)' } },
  'Calendars.Read': { de: { cat: 'Outlook', least: 'Calendars.Read' }, en: { cat: 'Outlook', least: 'Calendars.Read' } },
  'Files.Read.All': { de: { cat: 'OneDrive', least: 'Files.Read.All (statt full)' }, en: { cat: 'OneDrive', least: 'Files.Read.All (instead of full)' } },
  'Sites.Read.All': { de: { cat: 'SharePoint', least: 'Sites.Read.All' }, en: { cat: 'SharePoint', least: 'Sites.Read.All' } },
  'Team.ReadBasic.All': { de: { cat: 'Teams', least: 'Team.ReadBasic.All (statt Team.ReadWrite.All)' }, en: { cat: 'Teams', least: 'Team.ReadBasic.All (instead of Team.ReadWrite.All)' } },
  'Directory.Read.All': { de: { cat: 'Entra ID', least: 'nur für Verzeichnis-Abfragen' }, en: { cat: 'Entra ID', least: 'only for directory queries' } },
  'DeviceManagementManagedDevices.Read.All': { de: { cat: 'Intune', least: 'nur Intune-Devices' }, en: { cat: 'Intune', least: 'Intune devices only' } },
};
const PERMS = Object.keys(PERM_I18N);
function Permissions({ t, lang }) {
  const [q, setQ] = useState('');
  const list = PERMS.filter(x => !q || x.toLowerCase().includes(q) || PERM_I18N[x][lang].cat.toLowerCase().includes(q));
  return (
    <div className="panel-inner">
      <h2 className="sect">{t.perm} <span className="newtag">[2]</span></h2>
      <p className="hint">{t.perm_hint}</p>
      <input className="epinput" placeholder={t.perm_ph} value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 360 }} />
      <div className="cards">
        {list.map(x => {
          const info = PERM_I18N[x][lang];
          return <div className="card" key={x}><h3>{x}</h3><div className="role">{info.cat}</div><p>{info.least}</p></div>;
        })}
      </div>
    </div>
  );
}

// ---------- Radar (real deprecations) ----------
function Radar({ t, lang }) {
  const [variant, setVariant] = useState('v1.0');
  const [data, setData] = useState(null);
  const fileMap = { 'v1.0': 'data/deprecations.v1.0.json', beta: 'data/deprecations.beta.json' };
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    fetch(fileMap[variant]).then(r => r.json()).then(setData).catch(() => setData({ items: [] }));
  }, [variant]);
  // "Bald / Soon" is a LABELLING choice, not a status. The two data files
  // disagree about what a soon-to-be removal is called:
  //     v1.0  {removed: 47, planned: 38}          <-- no "soon" at all
  //     beta  {removed: 1617, soon: 137, planned: 38}
  // The filter used to compare it.status === 'soon' literally, so on the v1.0
  // tab it matched nothing and the card count stayed at 85 — the button did
  // nothing at all. Measured in Chromium before the fix:
  //     ALLE 85 -> BALD 85 -> ENTFERNT 47
  // "Soon" now means "not removed yet", which is the intent of the label and
  // gives a useful result on both tabs: 38 on v1.0, 175 on beta.
  const soonSet = new Set(['soon', 'planned']);
  const items = (data?.items || []).filter(it =>
    filter === 'all' ? true : filter === 'soon' ? soonSet.has(it.status) : it.status === filter,
  );
  return (
    <div className="panel-inner">
      <h2 className="sect">{t.radar} <span className="newtag">[3]</span></h2>
      <p className="hint">{t.radar_hint}</p>
      <div className="radar-controls">
        <button className={'reftab' + (variant === 'v1.0' ? ' active' : '')} onClick={() => setVariant('v1.0')}>v1.0</button>
        <button className={'reftab' + (variant === 'beta' ? ' active' : '')} onClick={() => setVariant('beta')}>beta</button>
        <button className="reftab" onClick={() => setFilter('all')}>{t.filter_all}</button>
        <button className="reftab" onClick={() => setFilter('soon')}>{t.filter_soon}</button>
        <button className="reftab" onClick={() => setFilter('removed')}>{t.filter_removed}</button>
      </div>
      {/* The count must describe what is on screen. data.count is the total for
        * the variant, so after clicking a filter it disagreed with the cards:
        * 47 cards next to a badge reading "85 Deprecations (v1.0)".
        * items is already the filtered array — count that. */}
      <div className="badges">
        <span className="badge">{items.length} {t.dep} ({variant})</span>
        {filter !== 'all' && <span className="badge">{t.filter_shown}</span>}
      </div>
      <div className="cards radar-scroll">
        {items.map((it, i) => (
          <div className={'card ' + (it.status === 'removed' ? 'removed' : it.status === 'soon' ? 'soon' : 'planned')} key={i}>
            <h3>{it.endpoint || it.path || '?'}</h3>
            <div className="role">{it.method || ''} · {t.status[lang][it.status]}</div>
            {it.removalDate && <p>{t.removal} {it.removalDate}</p>}
          </div>
        ))}
        {/* An empty filter used to render nothing at all, which is
          * indistinguishable from a hang. */}
        {items.length === 0 && <div className="radar-empty">{t.radar_empty}</div>}
      </div>
    </div>
  );
}

/* The cloud sketches, measured from the metadata-msgraph repo on 2026-09-27.
 * These are CSDL documents, 5-8 MB each, 17 of them. The panel lists names and
 * sizes and loads exactly ONE per click, in the worker — loading them all on
 * tab open would be ~90 MB and the same freeze the worker exists to prevent.
 *
 * v1.0-Review.csdl does not exist upstream (checked against the git index, not
 * just the directory). The panel marks the gap instead of hiding it, so the
 * count does not look like a bug in the panel. 8 v1.0 + 9 beta.
 */
const SKETCHES = [
  { name: 'beta-Bleu.csdl', sketch: 'Bleu', variant: 'beta', kb: 5494 },
  { name: 'beta-Delos.csdl', sketch: 'Delos', variant: 'beta', kb: 5300 },
  { name: 'beta-Fairfax.csdl', sketch: 'Fairfax', variant: 'beta', kb: 6462 },
  { name: 'beta-GovSG.csdl', sketch: 'GovSG', variant: 'beta', kb: 187 },
  { name: 'beta-Mooncake.csdl', sketch: 'Mooncake', variant: 'beta', kb: 5529 },
  { name: 'beta-Prod.csdl', sketch: 'Prod', variant: 'beta', kb: 8263 },
  { name: 'beta-Review.csdl', sketch: 'Review', variant: 'beta', kb: 64 },
  { name: 'beta-USNat.csdl', sketch: 'USNat', variant: 'beta', kb: 1411 },
  { name: 'beta-USSec.csdl', sketch: 'USSec', variant: 'beta', kb: 1433 },
  { name: 'v1.0-Bleu.csdl', sketch: 'Bleu', variant: 'v1.0', kb: 1979 },
  { name: 'v1.0-Delos.csdl', sketch: 'Delos', variant: 'v1.0', kb: 1804 },
  { name: 'v1.0-Fairfax.csdl', sketch: 'Fairfax', variant: 'v1.0', kb: 2578 },
  { name: 'v1.0-GovSG.csdl', sketch: 'GovSG', variant: 'v1.0', kb: 144 },
  { name: 'v1.0-Mooncake.csdl', sketch: 'Mooncake', variant: 'v1.0', kb: 1974 },
  { name: 'v1.0-Prod.csdl', sketch: 'Prod', variant: 'v1.0', kb: 3356 },
  { name: 'v1.0-USNat.csdl', sketch: 'USNat', variant: 'v1.0', kb: 1040 },
  { name: 'v1.0-USSec.csdl', sketch: 'USSec', variant: 'v1.0', kb: 1028 },
];

function Sketch({ t }) {
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(null);
  const [errs, setErrs] = useState({});
  const [filter, setFilter] = useState('all');
  // The endpoint path segments, for the type -> endpoint join. The sketch
  // panel and the reference list are separate React trees, so Reference's
  // parsed items are not reachable from here. The worker is asked once.
  const [segments, setSegments] = useState(null);
  const [segsBusy, setSegsBusy] = useState(true);
  const wref = useRef(null);
  // Which cards have their type list expanded. A counted card is 2510 px tall
  // with all 53 types shown, and a phone viewport is ~640 px, so the next card
  // lands far outside the view. Collapsed by default, per card.
  const [open, setOpen] = useState({});
  const TOP = 5;

  useEffect(() => {
    const w = new Worker('assets/worker.js');
    w.onmessage = (e) => {
      const { type, file, ok, counts: c, error } = e.data;
      if (type === 'segments') {
        setSegsBusy(false);
        // A plain object, NOT a Set: the value per segment is the PATH COUNT.
        // Wrapping it in a Set here was left over from the first version and
        // silently turned the counts into a list of segments, so every type
        // read as "no endpoint" and the panel showed "nur über Navigation" for
        // all 25 types — the worker was right, the state was not.
        if (ok) setSegments(e.data.segments);
        return;
      }
      if (type !== 'csdl') return;
      setBusy(null);
      // KEY ON THE FILE NAME, NOT THE URL.
      //
      // The worker echoes the `file` it was given, which is the full raw
      // URL, while the render looks up counts[s.name] — the bare file name.
      // Storing under the URL meant every lookup missed, so the card stayed
      // on "count" forever while the worker had long since answered with the
      // right numbers. Measured: the response body carried
      // {ok: true, counts: {36, 85, 45, 166}} and the card never changed.
      const key = String(file).split('/').pop();
      if (ok) setCounts((prev) => ({ ...prev, [key]: c }));
      else setErrs((prev) => ({ ...prev, [key]: error }));
    };
    wref.current = w;
    // Beta, because a ring file is a beta document and the reference list
    // defaults to the same variant.
    //
    // The base URL must drop the query string AND the hash, not just a
    // trailing index.html. With /?v=1 the old expression produced
    // "http://host/?v=1data/index.beta.json", the server answered with the
    // 404 HTML page, and res.json() threw
    //   SyntaxError: Unexpected token '<' ... is not valid JSON
    // The panel then showed no join at all, with no error anywhere — the
    // worker reported the failure, the panel dropped it silently.
    //
    // The Reference panel has the same expression and the same latent bug; it
    // only never fired because nothing in normal use appends a query string.
    // Fixed here, and the test pins it.
    w.postMessage({ type: 'segments', file: dataUrl('data/index.beta.json') });
    return () => w.terminate();
  }, []);

  // One file per click. Naming exactly one sketch is the point: a loop over the
  // whole list would defeat the panel and be the freeze we removed.
  function count(s) {
    if (busy) return;
    setBusy(s.name);
    setErrs((prev) => { const n = { ...prev }; delete n[s.name]; return n; });
    wref.current.postMessage({ type: 'csdl', file: RAW + 'schemas/' + s.name });
  }

  const shown = SKETCHES.filter((s) => filter === 'all' || s.variant === filter);
  // The v1.0/beta gap: Review exists only in beta. Say so instead of quietly
  // showing 8 where the beta tab shows 9.
  const missing = [...new Set(SKETCHES.map((s) => s.sketch))].filter(
    (n) => !SKETCHES.some((o) => o.sketch === n && o.variant === 'v1.0'),
  );
  const totalKb = SKETCHES.reduce((a, s) => a + s.kb, 0);
  const mb = (kb) => (kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB');
  // The join, recomputed from the counts already in state. `entitySets` maps a
  // type to its set names; a set name matches an endpoint when it is the last
  // path segment. Types with a set but no matching segment are kept and
  // marked — dropping them would make the panel look more complete than the
  // data is.
  // Only the types that actually reach endpoints. Kept separate from join()
  // so the header can say "N of M" and the list can show every type, including
  // the dead ones — hiding them would overstate the coverage.
  const linked = (c) => join(c).filter((r) => r.n > 0);
  const join = (c) => {
    if (!c || !c.entitySets) return [];
    return Object.keys(c.entitySets)
      .map((type) => {
        // Sum the PATH COUNT per set, not the number of sets that exist. One
        // EntitySet can carry many endpoints — accessReview is a single set
        // and 58 endpoints — so counting sets reported 1 for every type and
        // made the column meaningless. Measured: administrativeUnit showed 1
        // while the index holds 2 paths ending in /administrativeUnits.
        const n = c.entitySets[type].reduce(
          (acc, set) => acc + (segments && segments[set] ? segments[set] : 0),
          0,
        );
        return { type, n };
      })
      .sort((a, b) => b.n - a.n || a.type.localeCompare(b.type));
  };

  return (
    <div className="panel-inner">
      <h2 className="sect">{t.sketch_h}</h2>
      <p className="hint">{t.sketch_hint}</p>
      <div className="radar-controls">
        <button className={'reftab' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>{t.filter_all}</button>
        <button className={'reftab' + (filter === 'v1.0' ? ' active' : '')} onClick={() => setFilter('v1.0')}>{t.sketch_v10}</button>
        <button className={'reftab' + (filter === 'beta' ? ' active' : '')} onClick={() => setFilter('beta')}>{t.sketch_beta}</button>
      </div>
      <div className="badges">
        <span className="badge">{SKETCHES.length} CSDL · {mb(totalKb)}</span>
        {filter !== 'all' && <span className="badge">{t.filter_shown}</span>}
        {missing.length > 0 && (
          <span className="badge">{missing.join(', ')}: {t.sketch_v10} {t.sketch_missing}</span>
        )}
      </div>
      <div className="cards radar-scroll">
        {shown.map((s) => {
          const c = counts[s.name];
          const e = errs[s.name];
          const isBusy = busy === s.name;
          return (
            <div className={'card sketch' + (c ? ' done' : '')} key={s.name}>
              <h3>{s.sketch}</h3>
              <div className="role">{s.variant} · {mb(s.kb)}</div>
              {c ? (
                <>
                  <div className="sketch-counts">
                    <div><b>{c.entityTypes}</b> {t.sketch_entity}</div>
                    <div><b>{c.complexTypes}</b> {t.sketch_complex}</div>
                    <div><b>{c.enumTypes}</b> {t.sketch_enum}</div>
                    <div className="sketch-total"><b>{c.totalTypes}</b> {t.sketch_total}</div>
                  </div>
                  {linked(c).length > 0 && (
                    <div className="sketch-join">
                      {/* Both numbers, because they are not the same: the
                          first is the number of linked types, the second the
                          number the join can speak about at all. Showing only
                          the linked ones made a file with a dead type look
                          complete. */}
                      <div className="sketch-join-head">
                        {t.sketch_join
                          .replace('{a}', String(linked(c).length))
                          .replace('{b}', String(c.entitySetCount))}
                      </div>
                      {(() => {
                        // Top 5 by endpoint count, then the rest. The
                        // no-endpoint types sort last (n === 0), so they are
                        // only visible after expanding — which is fine,
                        // because the header already states the coverage and
                        // the "rest" line counts them.
                        const all = join(c);
                        const shown = open[s.name] ? all : all.slice(0, TOP);
                        const rest = all.slice(TOP);
                        return (
                          <>
                            {shown.map((r) => (
                              <div className={'sketch-type' + (r.n ? ' has-ep' : ' no-ep')} key={r.type}>
                                <span className="sk-type-name">{r.type}</span>
                                {r.n > 0
                                  ? <span className="sk-ep">{r.n} {t.sketch_ep}</span>
                                  : <span className="sk-noep">{t.sketch_navonly}</span>}
                              </div>
                            ))}
                            {rest.length > 0 && (
                              <button
                                className="sk-more"
                                onClick={() => setOpen((prev) => ({ ...prev, [s.name]: !prev[s.name] }))}
                                aria-expanded={!!open[s.name]}
                              >
                                {open[s.name]
                                  ? t.sketch_less
                                  : t.sketch_more.replace('{n}', String(rest.length))}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : e ? (
                <p className="err">{t.sketch_err}: {e}</p>
              ) : (
                <div className="sketch-actions">
                  <button className="primary" onClick={() => count(s)} disabled={isBusy || busy}>
                    {isBusy ? t.sketch_counting : t.sketch_load}
                  </button>
                  <a className="dl" href={RAW + 'schemas/' + s.name} target="_blank" rel="noopener">{t.sketch_raw} ↗</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- App shell ----------
const TABS = [
  ['hub', 'Hub', Hub],
  ['reference', 'Reference', Reference],
  ['console', 'Console', ConsolePanel],
  ['permissions', 'Permissions', Permissions],
  ['radar', 'Breaking Radar', Radar]
];
// The sketch panel is reachable from the header button, NOT from the tab bar.
// Two entry points for one panel would mean the tab bar shows six entries the
// user cannot predict, and the ARIA tablist would contain a tab with no label.
// It is therefore not in TABS; the render switch below handles it separately.
const EXTRA_PANELS = { sketch: Sketch };
function App() {
  const [tab, setTab] = useState('hub');
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('msgraph_lang') || 'de'; } catch { return 'de'; } });
  const [ignite, setIgnite] = useState(false);
  const [m, setM] = useState(null);

  useEffect(() => {
    fetch('data/manifest.json').then(r => r.json()).then(setM).catch(() => setM({}));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('ignite', ignite);
  }, [ignite]);

  const t = I18N[lang];
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem('msgraph_lang', lang); } catch {} }, [lang]);

  // micro-interactions: cursor trail + scanlines
  useEffect(() => {
    const trail = document.getElementById('trail');
    const scan = document.getElementById('scan');
    const move = (e) => {
      if (trail) { trail.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`; }
    };
    window.addEventListener('mousemove', move);
    if (trail) trail.style.display = 'block';
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <>
      <div className="trail" id="trail" style={{ display: 'none' }}></div>
      <div className="scanlines" id="scan"></div>

      <header className="topbar">
        <div className="wrap">
          <span className="brandname"><span className="mark"></span>qapdex-maker.github.io</span>
          <nav className="nav" role="tablist" aria-label="Hauptbereiche">
            {TABS.map((tt, ti) => <a key={tt[0]} id={'tab-'+tt[0]} role="tab" href={'#'+tt[0]}
              aria-selected={tab === tt[0]} aria-controls={'panel-'+tt[0]}
              className={tab === tt[0] ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); setTab(tt[0]); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const dir = e.key === 'ArrowRight' ? 1 : -1;
                  const next = (ti + dir + TABS.length) % TABS.length;
                  setTab(TABS[next][0]);
                  const el = document.getElementById('tab-'+TABS[next][0]);
                  if (el) el.focus();
                } else if (e.key === 'Home') { e.preventDefault(); setTab(TABS[0][0]); document.getElementById('tab-'+TABS[0][0])?.focus(); }
                else if (e.key === 'End') { e.preventDefault(); setTab(TABS[TABS.length-1][0]); document.getElementById('tab-'+TABS[TABS.length-1][0])?.focus(); }
              }}>{tt[1]}</a>)}
          </nav>
          <div className="themeswitch">
            <span id="liveDot" className={'livedot ' + (m?.syncDate ? 'on' : '')}>{m?.syncDate ? t.live.replace('{d}', m.syncDate) : (m === null ? t.live_loading : t.live_err)}</span>
            <button className="tbtn" id="sketchBtn" onClick={() => setTab('sketch')}>{t.sketch}</button>
            <button className="btn-ignite" id="igniteBtn" aria-pressed={ignite} onClick={() => setIgnite(v => !v)}><span className="toggle-dot"></span>{t.ignite}</button>
            <button className="tbtn" id="langBtn" aria-pressed={lang === 'en'} onClick={() => setLang(l => l === 'de' ? 'en' : 'de')}>{lang === 'en' ? t.de : t.en}</button>
          </div>
        </div>
      </header>

      <main id={'panel-'+tab} role="tabpanel" aria-labelledby={'tab-'+tab}>
        {tab === 'hub' && <Hub t={t} m={m} lang={lang} />}
        {tab === 'reference' && <Reference t={t} />}
        {tab === 'console' && <ConsolePanel t={t} />}
        {tab === 'permissions' && <Permissions t={t} lang={lang} />}
        {tab === 'radar' && <Radar t={t} lang={lang} />}
        {tab === 'sketch' && <Sketch t={t} />}
      </main>

      <footer className="foot">{t.footer}{m && m.siteVersion ? ' · v' + m.siteVersion : ''}</footer>
    </>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
