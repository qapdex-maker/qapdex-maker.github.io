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
    <div style={{ height, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}
         onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: total * rowHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${start * rowHeight}px)` }}>
          {visible.map((it, i) => (
            <div key={start + i} style={{ height: rowHeight, borderBottom: '1px solid var(--border)', padding: '8px 10px' }}>
              {renderRow(it)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Hub ----------
function Hub() {
  const [m, setM] = useState(null);
  useEffect(() => {
    fetch('data/manifest.json').then(r => r.json()).then(setM).catch(() => setM({}));
  }, []);
  const projects = m?.projects || [];
  const dls = [
    ['OpenAPI v1.0', SITE['v1.0']],
    ['OpenAPI beta', SITE.beta],
    ['Type-Mappings v1.0', 'schemas/type-mappings/v1.0-entity-types.json']
  ];
  return (
    <div className="panel-inner">
      <h1 className="hero-h1">Graph Metadata Hub</h1>
      <p className="lead">Schaufenster für metadata-msgraph — Microsoft Graph als OpenAPI, CSDL & Typ-Mappings. Plus die Semantics Console.</p>
      <div className="badges">
        <span className="badge">schema {m?.schemaVersion || '?'}</span>
        <span className="badge">sync {m?.syncDate || '?'}</span>
      </div>
      <h2 className="sect">Projekte</h2>
      <div className="cards">
        {projects.map(p => (
          <div className="card" key={p.name}>
            <h3>{p.name}</h3>
            <div className="role">{p.role}</div>
            <a className="dl" href={'https://github.com/' + p.repo} target="_blank" rel="noopener">github.com/{p.repo} ↗</a>
          </div>
        ))}
      </div>
      <h2 className="sect">Download-Hub (roh)</h2>
      <div className="cards">
        {dls.map(([n, path]) => (
          <div className="card" key={n}>
            <h3>{n}</h3>
            <a className="dl" href={RAW + path} target="_blank" rel="noopener">raw herunterladen ↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Reference (worker-backed, virtualized) ----------
function Reference() {
  const [variant, setVariant] = useState('v1.0');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('lädt…');
  const fileMap = { 'v1.0': 'data/index.v1.0.json', beta: 'data/index.beta.json' };
  const workerRef = useRef(null);

  useEffect(() => {
    const w = new Worker('assets/worker.js');
    workerRef.current = w;
    w.onmessage = (e) => {
      if (e.data.variant === variant) {
        if (e.data.ok) { setItems(e.data.items); setStatus(e.data.count + ' Endpoints'); }
        else setStatus('Fehler: ' + e.data.error);
      }
    };
    return () => w.terminate();
  }, []);

  useEffect(() => {
    setStatus('lädt ' + variant + '…');
    setItems([]);
    workerRef.current?.postMessage({ variant, file: fileMap[variant] });
  }, [variant]);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    if (!t) return items;
    return items.filter(f => f.path.toLowerCase().includes(t) || f.summary.toLowerCase().includes(t));
  }, [items, q]);

  return (
    <div className="panel-inner">
      <h2 className="sect">API Reference</h2>
      <p className="hint">Durchsuchbare Endpoint-Liste aus den echten Metadaten (im Web Worker geladen → kein Freeze).</p>
      <div className="ref-tabs">
        <button className={'reftab' + (variant === 'v1.0' ? ' active' : '')} onClick={() => setVariant('v1.0')}>v1.0 (stabil)</button>
        <button className={'reftab' + (variant === 'beta' ? ' active' : '')} onClick={() => setBeta()}>beta (Preview)</button>
      </div>
      <div className="ref-controls">
        <input className="epinput" placeholder="Endpoint suchen (z.B. /me, team)…" value={q} onChange={e => setQ(e.target.value)} />
        <a className="btn" target="_blank" rel="noopener" href={RAW + SITE[variant]}>↗ rohe Spec öffnen</a>
      </div>
      <div className="badges"><span className="badge">{status}</span>{q && <span className="badge">Treffer: {filtered.length}</span>}</div>
      {filtered.length > 0 ? (
        <VirtList items={filtered} renderRow={f => (
          <div>
            <span className="mth">{f.method}</span> <span className="pth">{f.path}</span>
            {f.summary && <div className="meta-row">{f.summary}</div>}
          </div>
        )} />
      ) : <div className="hint" style={{marginTop:'1rem'}}>{status}</div>}
    </div>
  );
  function setBeta() { setVariant('beta'); }
}

// ---------- Console ----------
function ConsolePanel() {
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

  function nlMap(t) {
    t = t.toLowerCase();
    const has = (...k) => k.some(x => t.includes(x));
    if (has('team')) return { method: 'GET', path: '/me/joinedTeams', perm: 'Team.ReadBasic.All', reason: 'Teams' };
    if (has('mail', 'email')) return { method: 'GET', path: '/me/messages', perm: 'Mail.Read', reason: 'Mails' };
    if (has('termin', 'event', 'calendar')) return { method: 'GET', path: '/me/events', perm: 'Calendars.Read', reason: 'Kalender' };
    return { method: 'GET', path: '/me', perm: 'User.Read', reason: 'Default' };
  }
  function cmd(path, method) {
    const curl = `curl -X ${method} "https://graph.microsoft.com/v1.0${path}" -H "Authorization: Bearer $GRAPH_TOKEN"`;
    const idun = `idun graph call ${method} ${path}`;
    return { curl, idun };
  }
  function runNl() {
    const r = nlMap(nl);
    setEp({ method: r.method, path: r.path, meta: 'NL: ' + (r.reason || '') + (r.perm ? ' · ' + r.perm : '') });
  }
  function showSuggest(q) {
    if (!idx || !q.trim()) { setSug([]); return; }
    const t = q.toLowerCase();
    setSug(idx.filter(f => f.path.toLowerCase().includes(t) || f.summary.toLowerCase().includes(t)).slice(0, 12));
  }
  const c = cmd(ep.path, ep.method);
  return (
    <div className="panel-inner">
      <h2 className="sect">Semantics Console <span className="newtag">Neuheit</span></h2>
      <p className="hint">Gib natürliche Sprache oder einen Endpoint ein → curl + idun-Befehl.</p>
      <div className="console-grid">
        <div>
          <label className="lbl">Natürliche Sprache</label>
          <textarea id="nlInput" value={nl} onChange={e => setNl(e.target.value)} placeholder="z.B. alle Teams des Users" />
          <button className="primary" onClick={runNl}>NL → Graph</button>
          <label className="lbl">Endpoint</label>
          <input className="epinput" placeholder="/me" onInput={e => showSuggest(e.target.value)} onChange={e => showSuggest(e.target.value)} />
          <div className="suggest">
            {sug.map((s, i) => <div className="s" key={i} onClick={() => { setEp({ method: s.method, path: s.path, meta: s.summary }); setSug([]); }}>{s.method} {s.path}</div>)}
          </div>
        </div>
        <div>
          <div className="result-head"><span className="mth">{ep.method}</span><span className="pth">{ep.path}</span></div>
          <div className="meta-row">{ep.meta}</div>
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
function Permissions() {
  const [q, setQ] = useState('');
  const list = PERMS.filter(x => !q || x.p.toLowerCase().includes(q) || x.cat.toLowerCase().includes(q));
  return (
    <div className="panel-inner">
      <h2 className="sect">Permission Intelligence <span className="newtag">[2]</span></h2>
      <p className="hint">Kuratiert (OpenAPI hier hat keine strukturierten scopes). Jede Permission mit least-privilege-Empfehlung.</p>
      <input className="epinput" placeholder="Permission suchen…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="cards">
        {list.map(x => <div className="card" key={x.p}><h3>{x.p}</h3><div className="role">{x.cat}</div><p>{x.least}</p></div>)}
      </div>
    </div>
  );
}

// ---------- Radar (real deprecations) ----------
function Radar() {
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
      <h2 className="sect">Breaking-Change Radar <span className="newtag">[3]</span></h2>
      <p className="hint">Echte Deprecations aus den Metadaten (x-ms-deprecation).</p>
      <div className="radar-controls">
        <button className="reftab" onClick={() => setVariant('v1.0')}>v1.0</button>
        <button className="reftab" onClick={() => setVariant('beta')}>beta</button>
        <button className="reftab" onClick={() => setFilter('all')}>alle</button>
        <button className="reftab" onClick={() => setFilter('soon')}>bald</button>
        <button className="reftab" onClick={() => setFilter('removed')}>entfernt</button>
      </div>
      <div className="badges"><span className="badge">{data?.count || 0} Deprecations ({variant})</span></div>
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
  const [theme, setTheme] = useState('idun-retro');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('active', b.dataset.setTheme === theme));
  }, [theme]);
  useEffect(() => {
    const t = localStorage.getItem('theme');
    if (t) setTheme(t);
  }, []);
  const Active = TABS.find(t => t[0] === tab)[2];
  return (
    <>
      <div className="topbar">
        <span className="logo">◇</span>
        <span className="brandname">qapdex Graph Hub</span>
        <nav className="nav">
          {TABS.map(t => <a key={t[0]} href={'#' + t[0]} className={tab === t[0] ? 'active' : ''} onClick={() => setTab(t[0])}>{t[1]}</a>)}
        </nav>
        <div className="themeswitch">
          <span id="liveDot" className="livedot on">● live</span>
          {['idun-retro', 'papers-ms', 'selfhost-os'].map(th => (
            <button key={th} className="tbtn" data-set-theme={th} onClick={() => setTheme(th)}>{th.split('-')[0]}</button>
          ))}
        </div>
      </div>
      <main><Active /></main>
      <footer className="foot">qapdex-maker.github.io · Prototyp (React, leichtgewichtig) · Daten: metadata-msgraph</footer>
    </>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
