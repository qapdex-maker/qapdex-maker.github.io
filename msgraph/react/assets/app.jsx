const { useState, useEffect, useRef, useMemo } = React;

const RAW = 'https://raw.githubusercontent.com/qapdex-maker/metadata-msgraph/master/';
const SITE = { 'v1.0': 'openapi/v1.0/openapi.yaml', beta: 'openapi/beta/openapi.yaml' };

// ---------- Virtualized list (only renders visible rows) ----------
function VirtList({ items, rowHeight = 54, height = 480, renderRow }) {
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
    nl: 'Natürliche Sprache', nl_btn: 'NL → Graph', endpoint: 'Endpoint',
    perm: 'Permission Intelligence', perm_hint: 'Kuratiert (OpenAPI hier hat keine strukturierten scopes). Jede Permission mit least-privilege-Empfehlung.',
    perm_ph: 'Permission suchen…',
    radar: 'Breaking-Change Radar', radar_hint: 'Echte Deprecations aus den Metadaten (x-ms-deprecation).',
    dep: 'Deprecations',
    live: '● live', ignite: 'Ignite', en: 'EN',
    footer: 'qapdex-maker.github.io · React Prototyp · Daten: metadata-msgraph',
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
    nl: 'Natural Language', nl_btn: 'NL → Graph', endpoint: 'Endpoint',
    perm: 'Permission Intelligence', perm_hint: 'Curated (the OpenAPI here has no structured scopes). Least-privilege note per permission.',
    perm_ph: 'Search permission…',
    radar: 'Breaking-Change Radar', radar_hint: 'Real deprecations from the metadata (x-ms-deprecation).',
    dep: 'Deprecations',
    live: '● live', ignite: 'Ignite', en: 'EN',
    footer: 'qapdex-maker.github.io · React Prototype · Data: metadata-msgraph',
  }
};

// ---------- Hub ----------
function Hub({ t, m }) {
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
        {projects.map(p => (
          <div className="card" key={p.name}>
            <h3>{p.name}</h3>
            <div className="role">{p.role}</div>
            <a className="dl" href={'https://github.com/' + p.repo} target="_blank" rel="noopener">github.com/{p.repo} ↗</a>
          </div>
        ))}
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
  const [status, setStatus] = useState(t.ref_hint ? 'lädt…' : 'loading…');
  // Web Worker löst relatives fetch() gegen die Worker-Skript-URL auf
  // (/msgraph/react/assets/), nicht gegen die Seite (/msgraph/react/).
  // Deshalb hier ABSOLUTE URLs bauen und an den Worker durchreichen.
  const base = window.location.href.replace(/index\.html?$/, '');
  const fileMap = {
    'v1.0': base + 'data/index.v1.0.json',
    beta: base + 'data/index.beta.json'
  };
  const workerRef = useRef(null);
  const variantRef = useRef(variant);
  variantRef.current = variant; // immer aktueller Wert für onmessage-Stale-Guard

  useEffect(() => {
    const w = new Worker('assets/worker.js');
    workerRef.current = w;
    w.onmessage = (e) => {
      if (e.data.variant !== variantRef.current) return; // stale Antwort ignorieren
      if (e.data.ok) { setItems(e.data.items); setStatus(e.data.count + ' Endpoints'); }
      else setStatus('Fehler: ' + e.data.error);
    };
    return () => w.terminate();
  }, []);

  useEffect(() => {
    setStatus('lädt ' + variant + '…');
    setItems([]);
    workerRef.current?.postMessage({ variant, file: fileMap[variant] });
  }, [variant]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return items;
    return items.filter(f => f.path.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s));
  }, [items, q]);

  return (
    <div className="panel-inner">
      <h2 className="sect">{t.reference}</h2>
      <p className="hint">{t.ref_hint}</p>
      <div className="ref-tabs">
        <button className={'reftab' + (variant === 'v1.0' ? ' active' : '')} onClick={() => setVariant('v1.0')}>v1.0 (stabil)</button>
        <button className={'reftab' + (variant === 'beta' ? ' active' : '')} onClick={() => setVariant('beta')}>beta (Preview)</button>
      </div>
      <div className="ref-controls">
        <input className="epinput" placeholder={t.ref_ph} value={q} onChange={e => setQ(e.target.value)} />
        <a className="btn" target="_blank" rel="noopener" href={RAW + SITE[variant]}>{t.ref_open}</a>
      </div>
      <div className="badges"><span className="badge">{status}</span>{q && <span className="badge">Treffer: {filtered.length}</span>}</div>
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
  const [ep, setEp] = useState({ method: 'GET', path: '/me', meta: 'Aktueller Benutzer' });
  const [nl, setNl] = useState('');
  const [idx, setIdx] = useState(null);
  const [sug, setSug] = useState([]);

  useEffect(() => {
    fetch('data/index.v1.0.json').then(r => r.json()).then(d => {
      const flat = [];
      for (const [p, ops] of Object.entries(d.paths || {}))
        for (const o of ops) flat.push({ path: p, method: (o.method || 'get').toUpperCase(), summary: o.summary || '', opId: o.operationId });
      setIdx(flat);
    }).catch(() => setIdx([]));
  }, []);

  function nlMap(s) {
    const tt = s.toLowerCase();
    const has = (...k) => k.some(x => tt.includes(x));
    if (has('team')) return { method: 'GET', path: '/me/joinedTeams', perm: 'Team.ReadBasic.All', reason: 'Teams' };
    if (has('mail', 'email')) return { method: 'GET', path: '/me/messages', perm: 'Mail.Read', reason: 'Mails' };
    if (has('termin', 'event', 'calendar')) return { method: 'GET', path: '/me/events', perm: 'Calendars.Read', reason: 'Kalender' };
    if (has('drive', 'onedrive', 'datei', 'file')) return { method: 'GET', path: '/me/drive/root/children', perm: 'Files.Read', reason: 'OneDrive' };
    if (has('photo', 'bild', 'avatar')) return { method: 'GET', path: '/me/photo/$value', perm: 'User.Read', reason: 'Profilfoto' };
    return { method: 'GET', path: '/me', perm: 'User.Read', reason: 'Default' };
  }
  function cmd(path, method) {
    const curl = `curl -X ${method} "https://graph.microsoft.com/v1.0${path}" -H "Authorization: Bearer ***"`;
    const idun = `idun graph call ${method} ${path}`;
    return { curl, idun };
  }
  function runNl() {
    const r = nlMap(nl);
    setEp({ method: r.method, path: r.path, meta: 'NL: ' + (r.reason || '') + (r.perm ? ' · ' + r.perm : '') });
  }
  function showSuggest(val) {
    if (!idx || !val.trim()) { setSug([]); return; }
    const s = val.toLowerCase();
    setSug(idx.filter(f => f.path.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s)).slice(0, 12));
  }
  const c = cmd(ep.path, ep.method);
  return (
    <div className="panel-inner">
      <h2 className="sect">{t.console} <span className="newtag">Neuheit</span></h2>
      <p className="hint">{t.console_hint}</p>
      <div className="console-grid">
        <div>
          <label className="lbl">{t.nl}</label>
          <textarea id="nlInput" value={nl} onChange={e => setNl(e.target.value)} placeholder="z.B. alle Teams des Users" />
          <button className="primary" onClick={runNl}>{t.nl_btn}</button>
          <label className="lbl">{t.endpoint}</label>
          <input className="epinput" placeholder="/me" onInput={e => showSuggest(e.target.value)} onChange={e => showSuggest(e.target.value)} />
          <div className="suggest">
            {sug.map((s, i) => <div className="s" key={i} onClick={() => { setEp({ method: s.method, path: s.path, meta: s.summary }); setSug([]); }}>{s.method} {s.path}</div>)}
          </div>
        </div>
        <div>
          <div className="result-head"><span className="mth">{ep.method}</span><span className="pth">{ep.path}</span></div>
          <div className="meta-row" style={{ textAlign: 'left', marginLeft: 0, maxWidth: 'none' }}>{ep.meta}</div>
          <div className="block"><div className="block-title">curl</div><pre>{c.curl}</pre></div>
          <div className="block"><div className="block-title">idun</div><pre>{c.idun}</pre></div>
        </div>
      </div>
    </div>
  );
}

// ---------- Permissions (curated) ----------
const PERMS = [
  { p: 'User.Read', least: 'User.Read (statt User.ReadWrite.All)', cat: 'Identity' },
  { p: 'User.Read.All', least: 'nur wenn alle User nötig', cat: 'Identity' },
  { p: 'Group.Read.All', least: 'Group.Read.All (statt Directory.Read.All)', cat: 'Groups' },
  { p: 'Mail.Read', least: 'Mail.Read (statt Mail.ReadWrite)', cat: 'Outlook' },
  { p: 'Calendars.Read', least: 'Calendars.Read', cat: 'Outlook' },
  { p: 'Files.Read.All', least: 'Files.Read.All (statt full)', cat: 'OneDrive' },
  { p: 'Sites.Read.All', least: 'Sites.Read.All', cat: 'SharePoint' },
  { p: 'Team.ReadBasic.All', least: 'Team.ReadBasic.All (statt Team.ReadWrite.All)', cat: 'Teams' },
  { p: 'Directory.Read.All', least: 'nur für Verzeichnis-Abfragen', cat: 'Entra ID' },
  { p: 'DeviceManagementManagedDevices.Read.All', least: 'nur Intune-Devices', cat: 'Intune' }
];
function Permissions({ t }) {
  const [q, setQ] = useState('');
  const list = PERMS.filter(x => !q || x.p.toLowerCase().includes(q) || x.cat.toLowerCase().includes(q));
  return (
    <div className="panel-inner">
      <h2 className="sect">{t.perm} <span className="newtag">[2]</span></h2>
      <p className="hint">{t.perm_hint}</p>
      <input className="epinput" placeholder={t.perm_ph} value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 360 }} />
      <div className="cards">
        {list.map(x => <div className="card" key={x.p}><h3>{x.p}</h3><div className="role">{x.cat}</div><p>{x.least}</p></div>)}
      </div>
    </div>
  );
}

// ---------- Radar (real deprecations) ----------
function Radar({ t }) {
  const [variant, setVariant] = useState('v1.0');
  const [data, setData] = useState(null);
  const fileMap = { 'v1.0': 'data/deprecations.v1.0.json', beta: 'data/deprecations.beta.json' };
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    fetch(fileMap[variant]).then(r => r.json()).then(setData).catch(() => setData({ items: [] }));
  }, [variant]);
  const items = (data?.items || []).filter(it => filter === 'all' || it.status === filter);
  return (
    <div className="panel-inner">
      <h2 className="sect">{t.radar} <span className="newtag">[3]</span></h2>
      <p className="hint">{t.radar_hint}</p>
      <div className="radar-controls">
        <button className={'reftab' + (variant === 'v1.0' ? ' active' : '')} onClick={() => setVariant('v1.0')}>v1.0</button>
        <button className={'reftab' + (variant === 'beta' ? ' active' : '')} onClick={() => setVariant('beta')}>beta</button>
        <button className="reftab" onClick={() => setFilter('all')}>alle</button>
        <button className="reftab" onClick={() => setFilter('soon')}>bald</button>
        <button className="reftab" onClick={() => setFilter('removed')}>entfernt</button>
      </div>
      <div className="badges"><span className="badge">{data?.count || 0} {t.dep} ({variant})</span></div>
      <div className="cards">
        {items.slice(0, 60).map((it, i) => (
          <div className={'card ' + (it.status === 'removed' ? 'removed' : it.status === 'soon' ? 'soon' : 'planned')} key={i}>
            <h3>{it.endpoint || it.path || '?'}</h3>
            <div className="role">{it.method || ''} · {it.status}</div>
            {it.removalDate && <p>Entfernung: {it.removalDate}</p>}
          </div>
        ))}
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
function App() {
  const [tab, setTab] = useState('hub');
  const [lang, setLang] = useState('de');
  const [ignite, setIgnite] = useState(false);
  const [m, setM] = useState(null);

  useEffect(() => {
    fetch('data/manifest.json').then(r => r.json()).then(setM).catch(() => setM({}));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('ignite', ignite);
  }, [ignite]);

  const t = I18N[lang];

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

  const Active = TABS.find(tt => tt[0] === tab)[2];
  return (
    <>
      <div className="trail" id="trail" style={{ display: 'none' }}></div>
      <div className="scanlines" id="scan"></div>

      <header className="topbar">
        <div className="wrap">
          <span className="brandname"><span className="mark"></span>qapdex-maker.github.io</span>
          <nav className="nav">
            {TABS.map(tt => <a key={tt[0]} href={'#' + tt[0]} className={tab === tt[0] ? 'active' : ''} onClick={(e) => { e.preventDefault(); setTab(tt[0]); }}>{tt[1]}</a>)}
          </nav>
          <div className="themeswitch">
            <span id="liveDot" className="livedot on">{t.live}</span>
            <button className="tbtn" data-set-theme="idun-retro" onClick={() => setTab('reference')}>React</button>
            <button className="btn-ignite" id="igniteBtn" aria-pressed={ignite} onClick={() => setIgnite(v => !v)}><span className="toggle-dot"></span>{t.ignite}</button>
            <button className="tbtn" id="langBtn" aria-pressed={lang === 'en'} onClick={() => setLang(l => l === 'de' ? 'en' : 'de')}>{t.en}</button>
          </div>
        </div>
      </header>

      <main>
        {tab === 'hub' && <Hub t={t} m={m} />}
        {tab === 'reference' && <Reference t={t} />}
        {tab === 'console' && <ConsolePanel t={t} />}
        {tab === 'permissions' && <Permissions t={t} />}
        {tab === 'radar' && <Radar t={t} />}
      </main>

      <footer className="foot">{t.footer}</footer>
    </>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
