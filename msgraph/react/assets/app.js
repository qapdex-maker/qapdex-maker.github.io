/* AUTO-GENERATED from assets/app.jsx -- do not edit by hand.
   Regenerate: sh build_appjs.sh */
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
const RAW = 'https://raw.githubusercontent.com/qapdex-maker/metadata-msgraph/master/';

/* The two OpenAPI specs come from the RELEASE, not from raw.githubusercontent.
 *
 * Measured 2026-10-01 in Chromium 149 headless, 412x915 @2.625, CPU x4:
 *   raw .../openapi/v1.0/openapi.yaml (42.3 MB)
 *     -> readyState "loading" after 212 s, never finished
 *     -> a single Runtime.evaluate took 27.3 s (slow4g) / 49.3 s (fast4g)
 *     -> document.body.innerText sat at 14.8 - 17.0 MB
 *   the same file as a release asset
 *     -> content-disposition: attachment, application/octet-stream
 *
 * The difference is one response header. raw.githubusercontent serves
 * text/plain, so the browser RENDERS a 42 MB body instead of downloading it.
 * A release asset carries `attachment`, so the browser downloads and never
 * builds a document out of it. There is no other lever: GitHub sets no
 * content-disposition on raw, GitHub Pages sets no headers at all, and the
 * CSDL files are served from the worker, which measured fine (5.6 MB loads in
 * 40 s, evaluate 153 ms) -- so RAW stays for those.
 *
 * The tag moves with the content, so one edit here re-points every spec link
 * after a metadata sync. It is stale once the fork syncs again; rebuild with
 * the command in the release notes. */
const RELEASE = 'https://github.com/qapdex-maker/metadata-msgraph/releases/download/spec-2026-10-01/';
const SPEC = {
  'v1.0': 'openapi-v1.0.yaml',
  beta: 'openapi-beta.yaml'
};
/* Type mappings are 335 KB -- an order of magnitude below the threshold, and
 * the JSON is nicer to read in the browser than a 42 MB download dialog. It
 * stays on raw. */
const TYPEMAP = 'schemas/type-mappings/v1.0-entity-types.json';

/* Absolute URL for a data file next to the page.
 *
 * window.location.href may carry a query string or a hash, and both break the
 * naive `href.replace(/index\.html?$/, '')`:
 *   /?v=1  ->  http://host/?v=1data/index.beta.json  ->  404 HTML -> res.json() throws
 * That failure is invisible: the worker reports it, the caller swallows it, and
 * the feature silently does nothing. Normal use has no query string, so it only
 * shows up when someone adds one for cache-busting — which is exactly when it
 * matters. */
const dataUrl = rel => window.location.href.split(/[?#]/)[0].replace(/index\.html?$/, '') + rel;

// ---------- Virtualized list (only renders visible rows) ----------
function VirtList({
  items,
  rowHeight = 58,
  height = 480,
  renderRow
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = items.length;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 4);
  const end = Math.min(total, Math.ceil((scrollTop + height) / rowHeight) + 4);
  const visible = items.slice(start, end);
  return /*#__PURE__*/React.createElement("div", {
    className: "virtlist",
    style: {
      height,
      overflowY: 'auto',
      border: '1px solid var(--line)'
    },
    onScroll: e => setScrollTop(e.currentTarget.scrollTop)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: total * rowHeight,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `translateY(${start * rowHeight}px)`
    }
  }, visible.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: start + i,
    style: {
      height: rowHeight,
      display: 'flex',
      alignItems: 'center'
    }
  }, renderRow(it))))));
}

// ---------- i18n ----------
const I18N = {
  de: {
    hero_h1: /*#__PURE__*/React.createElement(React.Fragment, null, "Graph Metadata ", /*#__PURE__*/React.createElement("span", {
      className: "hl"
    }, "Hub")),
    hero_lead: 'Schaufenster für metadata-msgraph — Microsoft Graph als OpenAPI, CSDL & Typ-Mappings. Plus die Semantics Console.',
    schema: 'schema',
    sync: 'sync',
    projekte: 'Projekte',
    downloads: 'Download-Hub (roh)',
    raw: 'raw herunterladen ↗',
    reference: 'API Reference',
    ref_hint: 'Durchsuchbare Endpoint-Liste aus den echten Metadaten (im Web Worker geladen → kein Freeze).',
    ref_ph: 'Endpoint suchen (z.B. /me, team)…',
    ref_open: '↗ rohe Spec öffnen',
    console: 'Semantics Console',
    console_hint: 'Gib natürliche Sprache oder einen Endpoint ein → curl + idun-Befehl.',
    nl: 'Natürliche Sprache',
    nl_btn: 'NL → Graph',
    endpoint: 'Endpoint',
    nl_ph: 'z.B. alle Teams des Users',
    llm_key_ph: 'Key einfügen',
    llm_btn: 'NL → Graph (LLM)',
    llm_busy: 'LLM wird gefragt…',
    llm_err: 'LLM fehlgeschlagen — Heuristik genutzt',
    llm_hint: 'Optional: eigener API-Key des gewählten Anbieters für NL→Graph. Key bleibt im Browser (sessionStorage), nie committet oder an uns gesendet. Ohne Key Fallback auf die Stichwort-Heuristik.',
    // Provider-neutral NL→Graph (2026-10-01). Four values were hard-wired to
    // OpenRouter; now they are chosen. Every key here needs an EN twin, or
    // the raw key leaks into the UI — the F3 'llm' bug again.
    llm_prov: 'Anbieter',
    llm_model: 'Modell',
    llm_model_ph: 'z.B. poolside/laguna-s-2.1:free',
    // Eigener Key statt `t.llm`, denn das war noch der alte, fest verdrahtete
    // Text "LLM-Modus (OpenRouter)" — als Key-Label ergab das
    // "NOUS PORTAL LLM-MODUS (OPENROUTER)": zwei Provider in einem Label.
    llm_key: 'API-Key',
    llm_key_set: 'Key setzen',
    llm_key_ok: 'Key gespeichert (nur diese Sitzung)',
    llm_probe: 'Verbindung testen',
    llm_probe_ok: 'Antwort erhalten',
    llm_probe_busy: 'teste…',
    llm_free_hint: 'Nous Portal: 6 Modelle sind kostenlos, eines antwortet zuverlässig (Stand 2026-10-01).',
    llm_listed: 'Katalog',
    llm_listed_n: 'Modelle',
    llm_free: 'kostenlos',
    llm_list_busy: 'lade Katalog…',
    llm_busy_full: 'Modell gerade ausgelastet (nicht dein Limit) — kurz warten',
    llm_probe_left: 'Rest',
    perm: 'Permission Intelligence',
    perm_hint: 'Kuratiert (OpenAPI hier hat keine strukturierten scopes). Jede Permission mit least-privilege-Empfehlung.',
    perm_ph: 'Permission suchen…',
    radar: 'Breaking-Change Radar',
    radar_hint: 'Echte Deprecations aus den Metadaten (x-ms-deprecation).',
    dep: 'Deprecations',
    proj: {
      'qapdex-maker/metadata-msgraph': {
        de: 'Datenquelle (CSDL/OpenAPI/Typ-Mappings)',
        en: 'Data source (CSDL/OpenAPI/Type-Mappings)'
      },
      'qapdex-maker/idun-sdk': {
        de: 'Azure AI Foundry Client',
        en: 'Azure AI Foundry client'
      },
      'qapdex-maker/idun-playground': {
        de: 'Multi-LLM-Console (17 Provider)',
        en: 'Multi-LLM console (17 providers)'
      }
    },
    status: {
      de: {
        removed: 'entfernt',
        soon: 'bald',
        planned: 'geplant'
      },
      en: {
        removed: 'removed',
        soon: 'soon',
        planned: 'planned'
      }
    },
    live: '● sync {d}',
    live_loading: '○ lade Metadaten…',
    live_err: '○ Sync-Stand unbekannt',
    ignite: 'Ignite',
    en: 'EN',
    de: 'DE',
    footer: 'qapdex-maker.github.io · React Prototyp · Daten: metadata-msgraph',
    cur_user: 'Aktueller Benutzer',
    loading: 'lädt…',
    loading_var: 'lädt {v}…',
    count_n: '{n} Endpoints',
    err: 'Fehler:',
    tab_v10: 'v1.0 (stabil)',
    tab_beta: 'beta (Preview)',
    hits: 'Treffer:',
    filter_all: 'alle',
    filter_soon: 'bald',
    filter_removed: 'entfernt',
    removal: 'Entfernung:',
    // Added 2026-09-27: the radar now counts the FILTERED list and shows an
    // empty state. Both keys were missing — a new t.* key without a DE entry
    // leaks the raw key into the UI, which is exactly how the F3 'llm' reason
    // bug happened before.
    filter_shown: 'gefiltert',
    radar_empty: 'Keine Einträge für diesen Filter.',
    // Sketch panel (2026-09-27). Replaces the mislabelled "React" button,
    // which was a themeswitch left over from the pre-React site.
    sketch: 'Skizzen',
    sketch_h: 'Cloud-Skizzen',
    sketch_hint: 'CSDL-Dokumente je Ring. Klick lädt genau eine Datei in den Worker und zählt die Typen — 17 Dateien wären zusammen ~90 MB.',
    sketch_entity: 'EntityTypes',
    sketch_complex: 'ComplexTypes',
    sketch_enum: 'EnumTypes',
    sketch_total: 'Typen gesamt',
    sketch_load: 'zählen',
    sketch_counting: 'zählt…',
    sketch_missing: 'fehlt',
    sketch_raw: 'roh',
    sketch_err: 'Fehler beim Laden',
    sketch_v10: 'v1.0',
    sketch_beta: 'beta',
    // Type -> endpoint join (2026-09-27). Measured on beta-Mooncake: 54 types
    // have an EntitySet, 53 of them reach endpoints. `message` has none — it is
    // only a NavigationProperty of `user`, so saying so is the honest text.
    sketch_join: '{a} von {b} Typen mit Endpoints',
    sketch_join_none: 'keine',
    sketch_ep: 'Endpoints',
    sketch_noep: 'ohne direkte Endpoints',
    sketch_navonly: 'nur über Navigation',
    sketch_types: 'Typen mit Verknüpfung',
    sketch_more: '+ {n} weitere',
    sketch_less: 'weniger anzeigen',
    nl_reasons: {
      teams: 'Teams',
      mails: 'Mails',
      calendar: 'Kalender',
      onedrive: 'OneDrive',
      photo: 'Profilfoto',
      default: 'Standard',
      llm: 'LLM-Zuordnung'
    }
  },
  en: {
    hero_h1: /*#__PURE__*/React.createElement(React.Fragment, null, "Graph Metadata ", /*#__PURE__*/React.createElement("span", {
      className: "hl"
    }, "Hub")),
    hero_lead: 'Showcase for metadata-msgraph — Microsoft Graph as OpenAPI, CSDL & Type Mappings. Plus the Semantics Console.',
    schema: 'schema',
    sync: 'sync',
    projekte: 'Projects',
    downloads: 'Download-Hub (raw)',
    raw: 'download raw ↗',
    reference: 'API Reference',
    ref_hint: 'Searchable endpoint list from the real metadata (loaded in a Web Worker → no freeze).',
    ref_ph: 'Search endpoint (e.g. /me, team)…',
    ref_open: '↗ open raw spec',
    console: 'Semantics Console',
    console_hint: 'Enter natural language or an endpoint → curl + idun command.',
    nl: 'Natural Language',
    nl_btn: 'NL → Graph',
    endpoint: 'Endpoint',
    nl_ph: 'e.g. all teams of the user',
    llm_key_ph: 'paste key',
    llm_btn: 'NL → Graph (LLM)',
    llm_busy: 'asking LLM…',
    llm_err: 'LLM failed — used heuristic',
    llm_hint: 'Optional: paste your own key for the selected provider to map NL via an LLM. Key stays in your browser (sessionStorage), never committed or sent to us. Falls back to the keyword heuristic without a key.',
    llm_prov: 'Provider',
    llm_model: 'Model',
    llm_model_ph: 'e.g. poolside/laguna-s-2.1:free',
    llm_key: 'API key',
    llm_key_set: 'Set key',
    llm_key_ok: 'Key stored (this session only)',
    llm_probe: 'Test connection',
    llm_probe_ok: 'got a reply',
    llm_probe_busy: 'testing…',
    llm_free_hint: 'Nous Portal: six models are free, one answers reliably (as of 2026-10-01).',
    llm_listed: 'Catalogue',
    llm_listed_n: 'models',
    llm_free: 'free',
    llm_list_busy: 'loading catalogue…',
    llm_busy_full: 'model at capacity right now (not your limit) — wait a moment',
    llm_probe_left: 'left',
    perm: 'Permission Intelligence',
    perm_hint: 'Curated (the OpenAPI here has no structured scopes). Least-privilege note per permission.',
    perm_ph: 'Search permission…',
    radar: 'Breaking-Change Radar',
    radar_hint: 'Real deprecations from the metadata (x-ms-deprecation).',
    dep: 'Deprecations',
    proj: {
      'qapdex-maker/metadata-msgraph': {
        de: 'Datenquelle (CSDL/OpenAPI/Typ-Mappings)',
        en: 'Data source (CSDL/OpenAPI/Type-Mappings)'
      },
      'qapdex-maker/idun-sdk': {
        de: 'Azure AI Foundry Client',
        en: 'Azure AI Foundry client'
      },
      'qapdex-maker/idun-playground': {
        de: 'Multi-LLM-Console (17 Provider)',
        en: 'Multi-LLM console (17 providers)'
      }
    },
    status: {
      de: {
        removed: 'entfernt',
        soon: 'bald',
        planned: 'geplant'
      },
      en: {
        removed: 'removed',
        soon: 'soon',
        planned: 'planned'
      }
    },
    live: '● sync {d}',
    live_loading: '○ loading metadata…',
    live_err: '○ sync date unknown',
    ignite: 'Ignite',
    en: 'EN',
    de: 'DE',
    footer: 'qapdex-maker.github.io · React Prototype · Data: metadata-msgraph',
    cur_user: 'Current user',
    loading: 'loading…',
    loading_var: 'loading {v}…',
    count_n: '{n} endpoints',
    err: 'Error:',
    tab_v10: 'v1.0 (stable)',
    tab_beta: 'beta (Preview)',
    hits: 'Hits:',
    filter_all: 'all',
    filter_soon: 'soon',
    filter_removed: 'removed',
    removal: 'Removal:',
    filter_shown: 'filtered',
    radar_empty: 'No entries for this filter.',
    // Sketch panel (2026-09-27) — see the DE table above.
    sketch: 'Sketches',
    sketch_h: 'Cloud sketches',
    sketch_hint: 'CSDL documents per ring. Clicking loads exactly one file into the worker and counts the types — all 17 would be ~90 MB.',
    sketch_entity: 'Entity types',
    sketch_complex: 'Complex types',
    sketch_enum: 'Enum types',
    sketch_total: 'types total',
    sketch_load: 'count',
    sketch_counting: 'counting…',
    sketch_missing: 'missing',
    sketch_raw: 'raw',
    sketch_err: 'load failed',
    sketch_v10: 'v1.0',
    sketch_beta: 'beta',
    // Type -> endpoint join. These seven were DE-ONLY until 2026-10-01, so the
    // sketch panel showed the raw keys in EN mode — the same leak as the F3
    // 'llm' reason, four years of habit older and nobody had clicked through
    // the panel in English. Found by tests/i18n_check.py.
    sketch_join: '{a} of {b} types with endpoints',
    sketch_join_none: 'none',
    sketch_ep: 'endpoints',
    sketch_noep: 'no direct endpoints',
    sketch_navonly: 'navigation only',
    sketch_types: 'linked types',
    sketch_more: '+ {n} more',
    sketch_less: 'show less',
    nl_reasons: {
      teams: 'Teams',
      mails: 'Mails',
      calendar: 'Calendar',
      onedrive: 'OneDrive',
      photo: 'Profile photo',
      default: 'Default',
      llm: 'LLM mapping'
    }
  }
};

// ---------- Hub ----------
function Hub({
  t,
  m,
  lang
}) {
  const projects = m?.projects || [];
  const dls = [['OpenAPI v1.0', RELEASE + SPEC['v1.0']], ['OpenAPI beta', RELEASE + SPEC.beta], ['Type-Mappings v1.0', RAW + TYPEMAP]];
  return /*#__PURE__*/React.createElement("div", {
    className: "panel-inner"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "hero-h1"
  }, t.hero_h1), /*#__PURE__*/React.createElement("p", {
    className: "lead"
  }, t.hero_lead), /*#__PURE__*/React.createElement("div", {
    className: "badges"
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, t.schema, " ", m?.schemaVersion || '?'), /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, t.sync, " ", m?.syncDate || '?')), /*#__PURE__*/React.createElement("h2", {
    className: "sect"
  }, t.projekte), /*#__PURE__*/React.createElement("div", {
    className: "cards"
  }, projects.map(p => {
    const role = t.proj && t.proj[p.repo] && t.proj[p.repo][lang] || p.role;
    return /*#__PURE__*/React.createElement("div", {
      className: "card",
      key: p.name
    }, /*#__PURE__*/React.createElement("h3", null, p.name), /*#__PURE__*/React.createElement("div", {
      className: "role"
    }, role), /*#__PURE__*/React.createElement("a", {
      className: "dl",
      href: 'https://github.com/' + p.repo,
      target: "_blank",
      rel: "noopener"
    }, "github.com/", p.repo, " \u2197"));
  })), /*#__PURE__*/React.createElement("h2", {
    className: "sect"
  }, t.downloads), /*#__PURE__*/React.createElement("div", {
    className: "cards"
  }, dls.map(([n, href]) => /*#__PURE__*/React.createElement("div", {
    className: "card",
    key: n
  }, /*#__PURE__*/React.createElement("h3", null, n), /*#__PURE__*/React.createElement("a", {
    className: "dl",
    href: href,
    target: "_blank",
    rel: "noopener"
  }, t.raw)))));
}

// ---------- Reference (worker-backed, virtualized) ----------
function Reference({
  t
}) {
  const [variant, setVariant] = useState('v1.0');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [st, setSt] = useState({
    kind: 'loading'
  });
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
    w.onmessage = e => {
      if (e.data.variant !== variantRef.current) return; // stale Antwort ignorieren
      if (e.data.ok) {
        setItems(e.data.items);
        setSt({
          kind: 'ok',
          n: e.data.count
        });
      } else setSt({
        kind: 'err',
        msg: String(e.data.error)
      });
    };
    return () => w.terminate();
  }, []);
  useEffect(() => {
    setSt({
      kind: 'variant',
      v: variant
    });
    setItems([]);
    workerRef.current?.postMessage({
      variant,
      file: fileMap[variant]
    });
  }, [variant]);
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return items;
    return items.filter(f => f.path.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s));
  }, [items, q]);
  const status = st.kind === 'err' ? t.err + ' ' + st.msg : st.kind === 'variant' ? t.loading_var.replace('{v}', st.v) : st.kind === 'ok' ? t.count_n.replace('{n}', st.n) : t.loading;
  return /*#__PURE__*/React.createElement("div", {
    className: "panel-inner"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sect"
  }, t.reference), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, t.ref_hint), /*#__PURE__*/React.createElement("div", {
    className: "ref-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'reftab' + (variant === 'v1.0' ? ' active' : ''),
    onClick: () => setVariant('v1.0')
  }, t.tab_v10), /*#__PURE__*/React.createElement("button", {
    className: 'reftab' + (variant === 'beta' ? ' active' : ''),
    onClick: () => setVariant('beta')
  }, t.tab_beta)), /*#__PURE__*/React.createElement("div", {
    className: "ref-controls"
  }, /*#__PURE__*/React.createElement("input", {
    className: "epinput",
    placeholder: t.ref_ph,
    value: q,
    onChange: e => setQ(e.target.value)
  }), /*#__PURE__*/React.createElement("a", {
    className: "btn",
    target: "_blank",
    rel: "noopener",
    href: RELEASE + SPEC[variant]
  }, t.ref_open)), /*#__PURE__*/React.createElement("div", {
    className: "badges"
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, status), q && /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, t.hits, " ", filtered.length)), filtered.length > 0 ? /*#__PURE__*/React.createElement(VirtList, {
    items: filtered,
    renderRow: f => /*#__PURE__*/React.createElement("div", {
      className: "refrow",
      style: {
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mth"
    }, f.method), " ", /*#__PURE__*/React.createElement("span", {
      className: "pth"
    }, f.path), f.summary && /*#__PURE__*/React.createElement("div", {
      className: "meta-row"
    }, f.summary))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "hint",
    style: {
      marginTop: '1rem'
    }
  }, status));
}

// ---------- Console ----------
function ConsolePanel({
  t
}) {
  const [ep, setEp] = useState({
    method: 'GET',
    path: '/me',
    kind: 'cur'
  });
  const [nl, setNl] = useState('');
  const [epq, setEpq] = useState('');
  const [idx, setIdx] = useState(null);
  const [sug, setSug] = useState([]);
  // One key per provider, each under its own sessionStorage name. A single
  // shared 'or_key' would have been wrong the moment a second provider
  // existed: pasting a Nous key over an OpenRouter key silently swapped
  // credentials, and both are sent to a third-party host.
  const [llmProv, setLlmProv] = useState(() => sessionStorage.getItem('llm_prov') || 'openrouter');
  const [llmModel, setLlmModel] = useState(() => sessionStorage.getItem('llm_model') || LLM_PROVIDERS[sessionStorage.getItem('llm_prov') || 'openrouter']?.model || '');
  const [llmKeys, setLlmKeys] = useState(() => {
    const o = {};
    for (const id of LLM_PROVIDER_IDS) o[id] = sessionStorage.getItem(LLM_PROVIDERS[id].keyName) || '';
    return o;
  });
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmErr, setLlmErr] = useState(null);
  const [probe, setProbe] = useState(null);
  const [cat, setCat] = useState(null);
  // '' = nothing said yet, 'ok' = a key is stored for the current provider.
  // Reset on provider switch, because the answer would otherwise describe the
  // provider the user just left.
  const [keyOk, setKeyOk] = useState('');
  const prov = LLM_PROVIDERS[llmProv] || LLM_PROVIDERS.openrouter;
  const llmKey = llmKeys[llmProv] || '';
  function setProv(id) {
    setLlmProv(id);
    sessionStorage.setItem('llm_prov', id);
    // The key confirmation describes the provider we are leaving, so clear it.
    setKeyOk('');
    // The model belongs to the provider. Carrying OpenRouter's model name to
    // Nous would produce a 404 on the first call, so reset to that
    // provider's default unless the user overrode it for this provider.
    const p = LLM_PROVIDERS[id];
    if (p) {
      setLlmModel(p.model);
      sessionStorage.setItem('llm_model', p.model);
    }
    setProbe(null);
    setCat(null);
  }
  function setModel(m) {
    setLlmModel(m);
    sessionStorage.setItem('llm_model', m);
  }
  function setKey(id, v) {
    setLlmKeys(prev => ({
      ...prev,
      [id]: v
    }));
    if (v) sessionStorage.setItem(LLM_PROVIDERS[id].keyName, v);else sessionStorage.removeItem(LLM_PROVIDERS[id].keyName);
    setProbe(null);
    // Say what happened. The German string for llm_key_ok has been in the
    // table since the provider block was built and was never shown, so a user
    // who pasted a key could not tell whether it was stored or ignored.
    setKeyOk(v ? 'ok' : '');
  }

  // Off-thread load (same strategy as Reference): reach the index JSON via an
  // absolute URL through the worker so the 2.5 MB parse never hits the UI thread.
  const base = window.location.href.replace(/index\.html?$/, '');
  useEffect(() => {
    const w = new Worker('assets/worker.js');
    w.onmessage = e => {
      if (e.data.ok) setIdx(e.data.items);else setIdx([]); // graceful fallback if the worker fails
    };
    w.postMessage({
      type: 'console',
      file: base + 'data/index.v1.0.json'
    });
    return () => w.terminate();
  }, []);
  function nlMap(s) {
    const tt = s.toLowerCase();
    const has = (...k) => k.some(x => tt.includes(x));
    if (has('termin', 'event', 'calendar', 'kalender')) return {
      method: 'GET',
      path: '/me/events',
      perm: 'Calendars.Read',
      reason: 'calendar'
    };
    if (has('team')) return {
      method: 'GET',
      path: '/me/joinedTeams',
      perm: 'Team.ReadBasic.All',
      reason: 'teams'
    };
    if (has('mail', 'email', 'e-mail')) return {
      method: 'GET',
      path: '/me/messages',
      perm: 'Mail.Read',
      reason: 'mails'
    };
    if (has('drive', 'onedrive', 'datei', 'file', 'dateien')) return {
      method: 'GET',
      path: '/me/drive/root/children',
      perm: 'Files.Read',
      reason: 'onedrive'
    };
    if (has('photo', 'bild', 'avatar', 'foto', 'profil')) return {
      method: 'GET',
      path: '/me/photo/$value',
      perm: 'User.Read',
      reason: 'photo'
    };
    return {
      method: 'GET',
      path: '/me',
      perm: 'User.Read',
      reason: 'default'
    };
  }
  function cmd(path, method) {
    const curl = `curl -X ${method} "https://graph.microsoft.com/v1.0${path}" -H "Authorization: Bearer ***"`;
    const idun = `idun graph call ${method} ${path}`;
    return {
      curl,
      idun
    };
  }
  /* Test the connection with the CURRENT provider, model and key.
  *
  * A bare "it failed" is not a diagnosis. Measured 2026-10-01 against Nous:
  * a PAID model answers 404 + insufficient_credits_for_paid_model while the
  * key is perfectly valid, and a FREE model at upstream capacity answers
  *
  *   429 "The requested model is temporarily at capacity upstream.
  *        This is not your API key's rate limit — please retry shortly."
  *   retry-after: 30
  *   x-ratelimit-remaining-requests: 47   <- budget untouched
  *
  * Those two look identical in the UI ("it failed") and need opposite
  * responses: the first means "pick another model", the second means "wait 30
  * seconds". So the probe reports the status, the code AND the retry-after,
  * rather than collapsing both into one "error". */
  async function probeLLM(providerId, model, key) {
    if (!key) return {
      ok: false,
      msg: 'kein Key'
    };
    const p = LLM_PROVIDERS[providerId];
    const t0 = performance.now();
    try {
      const res = await fetch(p.base + p.chat, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: 'Antworte mit genau dem Wort: OK'
          }],
          max_tokens: 8
        })
      });
      const ms = Math.round(performance.now() - t0);
      const hdr = {};
      res.headers.forEach((v, k) => {
        hdr[k.toLowerCase()] = v;
      });
      if (!res.ok) {
        let code = '',
          msg = '';
        try {
          const b = await res.json();
          code = b.code || b.error?.message || '';
          msg = b.message || b.error?.message || '';
        } catch {/* not JSON */}
        return {
          ok: false,
          status: res.status,
          ms,
          code: String(code).slice(0, 90),
          msg: String(msg).slice(0, 160),
          retryAfter: hdr['retry-after'] || null,
          // Distinguish "your key is limited" from "the model is busy". Only the
          // remaining-budget headers tell them apart, and the difference decides
          // whether retrying is worth anything.
          remaining: hdr['x-ratelimit-remaining-requests'] || null
        };
      }
      const j = await res.json();
      return {
        ok: true,
        ms,
        txt: (j?.choices?.[0]?.message?.content || '').slice(0, 40),
        cost: j?.usage?.cost,
        rpm: hdr['x-ratelimit-limit-requests'],
        rph: hdr['x-ratelimit-limit-requests-1h'],
        tph: hdr['x-ratelimit-limit-tokens-1h'],
        free: hdr['x-nous-credits-paid-access'] === 'false'
      };
    } catch (e) {
      return {
        ok: false,
        msg: String(e).slice(0, 90),
        ms: Math.round(performance.now() - t0)
      };
    }
  }

  /* The provider's own catalogue, so the model field is not a guess.
   *
   * Only Nous needs this: /models costs nothing, returns pricing per model, and
   * `pricing.prompt == "0"` is the ONLY reliable free marker — there is no
   * is_free field (measured 2026-10-01, 427 models, 6 with pricing 0). */
  async function loadCatalog(providerId, key) {
    const p = LLM_PROVIDERS[providerId];
    const res = await fetch(p.base + '/models', {
      headers: {
        'Authorization': 'Bearer ' + key
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const data = j.data || j.models || [];
    const free = data.filter(m => {
      const pr = m.pricing || {};
      return String(pr.prompt) === '0' && String(pr.completion) === '0';
    });
    return {
      total: data.length,
      free: free.map(m => m.id).sort(),
      // Only free ones are useful without credits, so the picker offers those
      // plus whatever the user typed. 421 paid names would be noise.
      paidSample: data.filter(m => {
        const pr = m.pricing || {};
        return String(pr.prompt) !== '0';
      }).slice(0, 6).map(m => m.id)
    };
  }
  function runNl() {
    setLlmErr(null);
    if (llmKey && nl.trim()) {
      setLlmBusy(true);
      callLLM(llmProv, nl, llmKey).then(r => {
        setEp({
          method: r.method,
          path: r.path,
          kind: 'nl',
          reason: 'llm',
          perm: r.perm
        });
      }).catch(e => {
        // Keep the reason. "LLM failed" without the cause is what made the
        // old OpenRouter-only path impossible to debug from the UI.
        setLlmErr(String(e.message || e).slice(0, 120));
        const r = nlMap(nl);
        setEp({
          method: r.method,
          path: r.path,
          kind: 'nl',
          reason: r.reason,
          perm: r.perm
        });
      }).finally(() => setLlmBusy(false));
      return;
    }
    const r = nlMap(nl);
    setEp({
      method: r.method,
      path: r.path,
      kind: 'nl',
      reason: r.reason,
      perm: r.perm
    });
  }
  function onEpInput(val) {
    setEpq(val);
    if (!idx || !val.trim()) {
      setSug([]);
      return;
    }
    const s = val.toLowerCase();
    setSug(idx.filter(f => f.path.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s)).slice(0, 12));
  }
  function selectEndpoint(s) {
    setEp({
      method: s.method,
      path: s.path,
      kind: 'data',
      data: s.summary
    });
    setEpq(s.path);
    setSug([]);
  }
  function epMeta(e) {
    if (e.kind === 'cur') return t.cur_user;
    if (e.kind === 'nl') return 'NL: ' + (t.nl_reasons[e.reason] || e.reason) + (e.perm ? ' · ' + e.perm : '');
    return e.data || '';
  }
  const c = cmd(ep.path, ep.method);
  return /*#__PURE__*/React.createElement("div", {
    className: "panel-inner"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sect"
  }, t.console, " ", /*#__PURE__*/React.createElement("span", {
    className: "newtag"
  }, "Neuheit")), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, t.console_hint), /*#__PURE__*/React.createElement("div", {
    className: "console-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, t.nl), /*#__PURE__*/React.createElement("textarea", {
    id: "nlInput",
    value: nl,
    onChange: e => setNl(e.target.value),
    placeholder: t.nl_ph
  }), /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: runNl,
    disabled: llmBusy
  }, llmBusy ? t.llm_busy : t.nl_btn), /*#__PURE__*/React.createElement("div", {
    className: "llm-row"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, t.llm_prov), /*#__PURE__*/React.createElement("div", {
    className: "radar-controls"
  }, LLM_PROVIDER_IDS.map(id => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: 'reftab' + (llmProv === id ? ' active' : ''),
    onClick: () => setProv(id),
    "aria-pressed": llmProv === id
  }, LLM_PROVIDERS[id].label))), /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, t.llm_model), /*#__PURE__*/React.createElement("input", {
    className: "epinput",
    value: llmModel,
    placeholder: t.llm_model_ph,
    onChange: e => setModel(e.target.value)
  }), cat && /*#__PURE__*/React.createElement("div", {
    className: "suggest"
  }, cat.free.map(m => /*#__PURE__*/React.createElement("div", {
    className: "s",
    key: m,
    onClick: () => setModel(m)
  }, m, " ", /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, t.llm_free)))), llmProv === 'nous' && /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, t.llm_free_hint), /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, prov.label, " ", t.llm_key), /*#__PURE__*/React.createElement("input", {
    type: "password",
    className: "epinput",
    value: llmKey,
    placeholder: t.llm_key_ph,
    onChange: e => setKey(llmProv, e.target.value)
  }), keyOk === 'ok' && /*#__PURE__*/React.createElement("p", {
    className: "hint ok"
  }, t.llm_key_set, ": ", t.llm_key_ok), /*#__PURE__*/React.createElement("div", {
    className: "llm-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost",
    onClick: runNl,
    disabled: llmBusy || !llmKey
  }, t.llm_btn), /*#__PURE__*/React.createElement("button", {
    className: "ghost",
    disabled: llmBusy || !llmKey,
    onClick: () => {
      setProbe({
        busy: true
      });
      probeLLM(llmProv, llmModel, llmKey).then(setProbe);
    }
  }, probe && probe.busy ? t.llm_probe_busy : t.llm_probe), /*#__PURE__*/React.createElement("button", {
    className: "ghost",
    disabled: !llmKey || cat && cat.busy,
    onClick: () => {
      setCat({
        busy: true
      });
      loadCatalog(llmProv, llmKey).then(setCat).catch(e => setCat({
        err: String(e.message || e)
      }));
    }
  }, cat && cat.busy ? t.llm_list_busy : t.llm_listed))), llmErr && /*#__PURE__*/React.createElement("p", {
    className: "hint err"
  }, t.llm_err, ": ", llmErr), probe && !probe.busy && (probe.ok ? /*#__PURE__*/React.createElement("p", {
    className: "hint ok"
  }, t.llm_probe_ok, " (", probe.ms, " ms", probe.cost === 0 ? ', cost 0' : '', probe.free ? ', ' + t.llm_free : '', probe.rph ? ', ' + probe.rph + '/h' : '', ") \u2192 \u201C", probe.txt, "\u201D")
  /* A 429 with a full remaining-budget is UPSTREAM CAPACITY, not
     our limit — measured 2026-10-01, retry-after: 30, remaining 47.
     Saying "failed" there would be wrong: retrying works, changing
     the key would not, and only the headers tell them apart. */ : probe.status === 429 ? /*#__PURE__*/React.createElement("p", {
    className: "hint err"
  }, t.llm_busy_full, " ", probe.retryAfter ? '(' + probe.retryAfter + 's)' : '', probe.remaining ? ' · ' + probe.remaining + ' ' + t.llm_probe_left : '') : /*#__PURE__*/React.createElement("p", {
    className: "hint err"
  }, t.llm_err, ": ", probe.code || probe.msg || 'HTTP ' + probe.status)), cat && !cat.busy && cat.err && /*#__PURE__*/React.createElement("p", {
    className: "hint err"
  }, cat.err), cat && !cat.busy && !cat.err && /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, cat.total, " ", t.llm_listed_n, " \xB7 ", cat.free.length, " ", t.llm_free), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, t.llm_hint), /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, t.endpoint), /*#__PURE__*/React.createElement("input", {
    className: "epinput",
    placeholder: "/me",
    value: epq,
    onChange: e => onEpInput(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "suggest"
  }, sug.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "s",
    key: i,
    onClick: () => selectEndpoint(s)
  }, s.method, " ", s.path)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "result-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mth"
  }, ep.method), /*#__PURE__*/React.createElement("span", {
    className: "pth"
  }, ep.path)), /*#__PURE__*/React.createElement("div", {
    className: "meta-row",
    style: {
      textAlign: 'left',
      marginLeft: 0,
      maxWidth: 'none'
    }
  }, epMeta(ep)), /*#__PURE__*/React.createElement("div", {
    className: "block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "block-title"
  }, "curl"), /*#__PURE__*/React.createElement("pre", null, c.curl)), /*#__PURE__*/React.createElement("div", {
    className: "block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "block-title"
  }, "idun"), /*#__PURE__*/React.createElement("pre", null, c.idun)))));
}

/* ---------- LLM providers for NL→Graph ----------
 *
 * Four things were hard-wired to OpenRouter before: the endpoint, the model,
 * the key's storage name ('or_key'), and the response path. Changing any of
 * them meant editing the source, so nobody could use the one provider that
 * costs nothing.
 *
 * A provider is now: a base URL, a model, and where to read the answer out of
 * the response. Everything else — the key, the failure behaviour, the
 * heuristic fallback — is shared.
 *
 * MEASURED 2026-10-01 against the live APIs, not copied from docs:
 *
 *   Nous Portal   GET  {base}/models            -> 200, 427 models
 *                 POST {base}/chat/completions  -> 200, choices[0].message
 *                 no CORS preflight problem, OpenAI-shaped
 *                 free models have pricing.prompt == "0"; there is NO
 *                 is_free field. Six qualify, one answered cleanly:
 *                 poolside/laguna-s-2.1:free (cost: 0 in the usage block).
 *                 A non-free model answers 404 with
 *                 code "insufficient_credits_for_paid_model" — 404, not 402.
 *
 *   OpenRouter    POST https://openrouter.ai/api/v1/chat/completions
 *                 -> choices[0].message, CORS-open for browsers
 *
 * Both speak the OpenAI chat-completions shape, so one code path serves both.
 * What genuinely differs is the ANSWER EXTRACTION and the error text, so a
 * provider may override `extract`. */
const LLM_PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    chat: '/chat/completions',
    model: 'openai/gpt-4o-mini',
    // OpenRouter is the incumbent, so it keeps the default model. A user
    // without credits hits a 402 and the heuristic takes over — measured,
    // not assumed.
    keyName: 'or_key'
  },
  nous: {
    label: 'Nous Portal',
    base: 'https://inference-api.nousresearch.com/v1',
    chat: '/chat/completions',
    // The one free model that answered cleanly on 2026-10-01. Measured, not
    // assumed: of the six models with pricing 0, one worked, one said "no
    // longer free", three errored. This may rot — `model` is editable in the
    // UI for exactly that reason.
    model: 'poolside/laguna-s-2.1:free',
    keyName: 'nous_key'
  }
};
const LLM_PROVIDER_IDS = Object.keys(LLM_PROVIDERS);
const LLM_SYSTEM = 'You map a natural-language request to a Microsoft Graph v1.0 call. ' + 'Respond with ONLY strict JSON: {"method":"GET|POST|...","path":"/me/...","perm":"Scope.Read","reason":"short"} ' + 'Pick the closest real v1.0 endpoint. If unsure, use /me.';

/* Read the assistant text out of a chat-completions response.
 *
 * OpenAI-shaped, so both providers share this. It is a function rather than a
 * property because a future provider may answer differently, and a caller
 * that assumes the shape is exactly the bug this refactor is removing. */
function llmText(data) {
  return data?.choices?.[0]?.message?.content || '';
}

/* Turn provider chatter into {method, path, perm, reason}.
 *
 * A model may wrap JSON in prose or a code fence despite the instruction, so
 * this tries the strict parse first and only then a fenced/embedded object.
 *
 * It VALIDATES rather than trusting the model: a free model is the least
 * reliable thing in this whole feature, and a path that does not start with
 * /me produces a curl command that is silently wrong. The callers treat a
 * throw as "use the heuristic", so an unusable answer degrades to the
 * keyword mapping instead of to a bad request. */
function llmParse(txt) {
  let j = null;
  try {
    j = JSON.parse(txt);
  } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        j = JSON.parse(m[0]);
      } catch {/* fall through */}
    }
  }
  if (!j || !j.path) throw new Error('kein path in der Antwort');
  const path = String(j.path).trim();
  if (!path.startsWith('/')) throw new Error('path ist kein Graph-Pfad: ' + path);
  const method = String(j.method || 'GET').toUpperCase();
  if (!/^[A-Z]+$/.test(method)) throw new Error('unbekannte Methode: ' + method);
  return {
    method,
    path,
    perm: j.perm || '',
    reason: 'llm'
  };
}
async function callLLM(providerId, query, key) {
  const p = LLM_PROVIDERS[providerId];
  if (!p) throw new Error('unbekannter Provider: ' + providerId);
  if (!key) throw new Error('kein Key');
  const res = await fetch(p.base + p.chat, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: p.model,
      messages: [{
        role: 'system',
        content: LLM_SYSTEM
      }, {
        role: 'user',
        content: query
      }],
      // Only OpenRouter honours this; Nous ignores it, and a free model may
      // wrap the JSON in prose anyway. llmParse copes with both.
      response_format: {
        type: 'json_object'
      },
      temperature: 0
    })
  });
  if (!res.ok) {
    // The Nous "no credits" answer is a 404 with a code in the body. Surfacing
    // the code makes "why did it fall back" answerable instead of a shrug.
    let detail = '';
    try {
      const b = await res.json();
      detail = b.code || b.error?.message || b.message || '';
      if (detail) detail = ' (' + String(detail).slice(0, 80) + ')';
    } catch {/* body not JSON — the status is all we have */}
    throw new Error('HTTP ' + res.status + detail);
  }
  const extract = p.extract || llmText;
  return llmParse(extract(await res.json()));
}

// ---------- Permissions (curated, localized) ----------
const PERM_I18N = {
  'User.Read': {
    de: {
      cat: 'Identity',
      least: 'User.Read (statt User.ReadWrite.All)'
    },
    en: {
      cat: 'Identity',
      least: 'User.Read (instead of User.ReadWrite.All)'
    }
  },
  'User.Read.All': {
    de: {
      cat: 'Identity',
      least: 'nur wenn alle User nötig'
    },
    en: {
      cat: 'Identity',
      least: 'only if all users needed'
    }
  },
  'Group.Read.All': {
    de: {
      cat: 'Groups',
      least: 'Group.Read.All (statt Directory.Read.All)'
    },
    en: {
      cat: 'Groups',
      least: 'Group.Read.All (instead of Directory.Read.All)'
    }
  },
  'Mail.Read': {
    de: {
      cat: 'Outlook',
      least: 'Mail.Read (statt Mail.ReadWrite)'
    },
    en: {
      cat: 'Outlook',
      least: 'Mail.Read (instead of Mail.ReadWrite)'
    }
  },
  'Calendars.Read': {
    de: {
      cat: 'Outlook',
      least: 'Calendars.Read'
    },
    en: {
      cat: 'Outlook',
      least: 'Calendars.Read'
    }
  },
  'Files.Read.All': {
    de: {
      cat: 'OneDrive',
      least: 'Files.Read.All (statt full)'
    },
    en: {
      cat: 'OneDrive',
      least: 'Files.Read.All (instead of full)'
    }
  },
  'Sites.Read.All': {
    de: {
      cat: 'SharePoint',
      least: 'Sites.Read.All'
    },
    en: {
      cat: 'SharePoint',
      least: 'Sites.Read.All'
    }
  },
  'Team.ReadBasic.All': {
    de: {
      cat: 'Teams',
      least: 'Team.ReadBasic.All (statt Team.ReadWrite.All)'
    },
    en: {
      cat: 'Teams',
      least: 'Team.ReadBasic.All (instead of Team.ReadWrite.All)'
    }
  },
  'Directory.Read.All': {
    de: {
      cat: 'Entra ID',
      least: 'nur für Verzeichnis-Abfragen'
    },
    en: {
      cat: 'Entra ID',
      least: 'only for directory queries'
    }
  },
  'DeviceManagementManagedDevices.Read.All': {
    de: {
      cat: 'Intune',
      least: 'nur Intune-Devices'
    },
    en: {
      cat: 'Intune',
      least: 'Intune devices only'
    }
  }
};
const PERMS = Object.keys(PERM_I18N);
function Permissions({
  t,
  lang
}) {
  const [q, setQ] = useState('');
  const list = PERMS.filter(x => !q || x.toLowerCase().includes(q) || PERM_I18N[x][lang].cat.toLowerCase().includes(q));
  return /*#__PURE__*/React.createElement("div", {
    className: "panel-inner"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sect"
  }, t.perm, " ", /*#__PURE__*/React.createElement("span", {
    className: "newtag"
  }, "[2]")), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, t.perm_hint), /*#__PURE__*/React.createElement("input", {
    className: "epinput",
    placeholder: t.perm_ph,
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      maxWidth: 360
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "cards"
  }, list.map(x => {
    const info = PERM_I18N[x][lang];
    return /*#__PURE__*/React.createElement("div", {
      className: "card",
      key: x
    }, /*#__PURE__*/React.createElement("h3", null, x), /*#__PURE__*/React.createElement("div", {
      className: "role"
    }, info.cat), /*#__PURE__*/React.createElement("p", null, info.least));
  })));
}

// ---------- Radar (real deprecations) ----------
function Radar({
  t,
  lang
}) {
  const [variant, setVariant] = useState('v1.0');
  const [data, setData] = useState(null);
  const fileMap = {
    'v1.0': 'data/deprecations.v1.0.json',
    beta: 'data/deprecations.beta.json'
  };
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    fetch(fileMap[variant]).then(r => r.json()).then(setData).catch(() => setData({
      items: []
    }));
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
  const items = (data?.items || []).filter(it => filter === 'all' ? true : filter === 'soon' ? soonSet.has(it.status) : it.status === filter);
  return /*#__PURE__*/React.createElement("div", {
    className: "panel-inner"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sect"
  }, t.radar, " ", /*#__PURE__*/React.createElement("span", {
    className: "newtag"
  }, "[3]")), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, t.radar_hint), /*#__PURE__*/React.createElement("div", {
    className: "radar-controls"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'reftab' + (variant === 'v1.0' ? ' active' : ''),
    onClick: () => setVariant('v1.0')
  }, "v1.0"), /*#__PURE__*/React.createElement("button", {
    className: 'reftab' + (variant === 'beta' ? ' active' : ''),
    onClick: () => setVariant('beta')
  }, "beta"), /*#__PURE__*/React.createElement("button", {
    className: "reftab",
    onClick: () => setFilter('all')
  }, t.filter_all), /*#__PURE__*/React.createElement("button", {
    className: "reftab",
    onClick: () => setFilter('soon')
  }, t.filter_soon), /*#__PURE__*/React.createElement("button", {
    className: "reftab",
    onClick: () => setFilter('removed')
  }, t.filter_removed)), /*#__PURE__*/React.createElement("div", {
    className: "badges"
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, items.length, " ", t.dep, " (", variant, ")"), filter !== 'all' && /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, t.filter_shown)), /*#__PURE__*/React.createElement("div", {
    className: "cards radar-scroll"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    className: 'card ' + (it.status === 'removed' ? 'removed' : it.status === 'soon' ? 'soon' : 'planned'),
    key: i
  }, /*#__PURE__*/React.createElement("h3", null, it.endpoint || it.path || '?'), /*#__PURE__*/React.createElement("div", {
    className: "role"
  }, it.method || '', " \xB7 ", t.status[lang][it.status]), it.removalDate && /*#__PURE__*/React.createElement("p", null, t.removal, " ", it.removalDate))), items.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "radar-empty"
  }, t.radar_empty)));
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
const SKETCHES = [{
  name: 'beta-Bleu.csdl',
  sketch: 'Bleu',
  variant: 'beta',
  kb: 5494
}, {
  name: 'beta-Delos.csdl',
  sketch: 'Delos',
  variant: 'beta',
  kb: 5300
}, {
  name: 'beta-Fairfax.csdl',
  sketch: 'Fairfax',
  variant: 'beta',
  kb: 6462
}, {
  name: 'beta-GovSG.csdl',
  sketch: 'GovSG',
  variant: 'beta',
  kb: 187
}, {
  name: 'beta-Mooncake.csdl',
  sketch: 'Mooncake',
  variant: 'beta',
  kb: 5529
}, {
  name: 'beta-Prod.csdl',
  sketch: 'Prod',
  variant: 'beta',
  kb: 8263
}, {
  name: 'beta-Review.csdl',
  sketch: 'Review',
  variant: 'beta',
  kb: 64
}, {
  name: 'beta-USNat.csdl',
  sketch: 'USNat',
  variant: 'beta',
  kb: 1411
}, {
  name: 'beta-USSec.csdl',
  sketch: 'USSec',
  variant: 'beta',
  kb: 1433
}, {
  name: 'v1.0-Bleu.csdl',
  sketch: 'Bleu',
  variant: 'v1.0',
  kb: 1979
}, {
  name: 'v1.0-Delos.csdl',
  sketch: 'Delos',
  variant: 'v1.0',
  kb: 1804
}, {
  name: 'v1.0-Fairfax.csdl',
  sketch: 'Fairfax',
  variant: 'v1.0',
  kb: 2578
}, {
  name: 'v1.0-GovSG.csdl',
  sketch: 'GovSG',
  variant: 'v1.0',
  kb: 144
}, {
  name: 'v1.0-Mooncake.csdl',
  sketch: 'Mooncake',
  variant: 'v1.0',
  kb: 1974
}, {
  name: 'v1.0-Prod.csdl',
  sketch: 'Prod',
  variant: 'v1.0',
  kb: 3356
}, {
  name: 'v1.0-USNat.csdl',
  sketch: 'USNat',
  variant: 'v1.0',
  kb: 1040
}, {
  name: 'v1.0-USSec.csdl',
  sketch: 'USSec',
  variant: 'v1.0',
  kb: 1028
}];
function Sketch({
  t
}) {
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
    w.onmessage = e => {
      const {
        type,
        file,
        ok,
        counts: c,
        error
      } = e.data;
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
      if (ok) setCounts(prev => ({
        ...prev,
        [key]: c
      }));else setErrs(prev => ({
        ...prev,
        [key]: error
      }));
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
    w.postMessage({
      type: 'segments',
      file: dataUrl('data/index.beta.json')
    });
    return () => w.terminate();
  }, []);

  // One file per click. Naming exactly one sketch is the point: a loop over the
  // whole list would defeat the panel and be the freeze we removed.
  function count(s) {
    if (busy) return;
    setBusy(s.name);
    setErrs(prev => {
      const n = {
        ...prev
      };
      delete n[s.name];
      return n;
    });
    wref.current.postMessage({
      type: 'csdl',
      file: RAW + 'schemas/' + s.name
    });
  }
  const shown = SKETCHES.filter(s => filter === 'all' || s.variant === filter);
  // The v1.0/beta gap: Review exists only in beta. Say so instead of quietly
  // showing 8 where the beta tab shows 9.
  const missing = [...new Set(SKETCHES.map(s => s.sketch))].filter(n => !SKETCHES.some(o => o.sketch === n && o.variant === 'v1.0'));
  const totalKb = SKETCHES.reduce((a, s) => a + s.kb, 0);
  const mb = kb => kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
  // The join, recomputed from the counts already in state. `entitySets` maps a
  // type to its set names; a set name matches an endpoint when it is the last
  // path segment. Types with a set but no matching segment are kept and
  // marked — dropping them would make the panel look more complete than the
  // data is.
  // Only the types that actually reach endpoints. Kept separate from join()
  // so the header can say "N of M" and the list can show every type, including
  // the dead ones — hiding them would overstate the coverage.
  const linked = c => join(c).filter(r => r.n > 0);
  const join = c => {
    if (!c || !c.entitySets) return [];
    return Object.keys(c.entitySets).map(type => {
      // Sum the PATH COUNT per set, not the number of sets that exist. One
      // EntitySet can carry many endpoints — accessReview is a single set
      // and 58 endpoints — so counting sets reported 1 for every type and
      // made the column meaningless. Measured: administrativeUnit showed 1
      // while the index holds 2 paths ending in /administrativeUnits.
      const n = c.entitySets[type].reduce((acc, set) => acc + (segments && segments[set] ? segments[set] : 0), 0);
      // hasSet travels with the row so the render can tell the two dead-end
      // states apart: a type that HAS EntitySets but whose set name ends no
      // path is reachable through navigation, a type with none is not.
      // Without it every zero row would say "ohne direkte Endpoints" even
      // when navigation would have worked.
      return {
        type,
        n,
        hasSet: c.entitySets[type].length > 0
      };
    }).sort((a, b) => b.n - a.n || a.type.localeCompare(b.type));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "panel-inner"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sect"
  }, t.sketch_h), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, t.sketch_hint), /*#__PURE__*/React.createElement("div", {
    className: "radar-controls"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'reftab' + (filter === 'all' ? ' active' : ''),
    onClick: () => setFilter('all')
  }, t.filter_all), /*#__PURE__*/React.createElement("button", {
    className: 'reftab' + (filter === 'v1.0' ? ' active' : ''),
    onClick: () => setFilter('v1.0')
  }, t.sketch_v10), /*#__PURE__*/React.createElement("button", {
    className: 'reftab' + (filter === 'beta' ? ' active' : ''),
    onClick: () => setFilter('beta')
  }, t.sketch_beta)), /*#__PURE__*/React.createElement("div", {
    className: "badges"
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, SKETCHES.length, " CSDL \xB7 ", mb(totalKb)), filter !== 'all' && /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, t.filter_shown), missing.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, missing.join(', '), ": ", t.sketch_v10, " ", t.sketch_missing)), /*#__PURE__*/React.createElement("div", {
    className: "cards radar-scroll"
  }, shown.map(s => {
    const c = counts[s.name];
    const e = errs[s.name];
    const isBusy = busy === s.name;
    return /*#__PURE__*/React.createElement("div", {
      className: 'card sketch' + (c ? ' done' : ''),
      key: s.name
    }, /*#__PURE__*/React.createElement("h3", null, s.sketch), /*#__PURE__*/React.createElement("div", {
      className: "role"
    }, s.variant, " \xB7 ", mb(s.kb)), c ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "sketch-counts"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, c.entityTypes), " ", t.sketch_entity), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, c.complexTypes), " ", t.sketch_complex), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, c.enumTypes), " ", t.sketch_enum), /*#__PURE__*/React.createElement("div", {
      className: "sketch-total"
    }, /*#__PURE__*/React.createElement("b", null, c.totalTypes), " ", t.sketch_total)), linked(c).length > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "sketch-join"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sketch-join-head"
    }, t.sketch_types, ": ", t.sketch_join.replace('{a}', String(linked(c).length)).replace('{b}', String(c.entitySetCount))), (() => {
      // Top 5 by endpoint count, then the rest. The
      // no-endpoint types sort last (n === 0), so they are
      // only visible after expanding — which is fine,
      // because the header already states the coverage and
      // the "rest" line counts them.
      const all = join(c);
      const shown = open[s.name] ? all : all.slice(0, TOP);
      const rest = all.slice(TOP);
      return /*#__PURE__*/React.createElement(React.Fragment, null, shown.map(r => /*#__PURE__*/React.createElement("div", {
        className: 'sketch-type' + (r.n ? ' has-ep' : ' no-ep'),
        key: r.type
      }, /*#__PURE__*/React.createElement("span", {
        className: "sk-type-name"
      }, r.type), r.n > 0 ? /*#__PURE__*/React.createElement("span", {
        className: "sk-ep"
      }, r.n, " ", t.sketch_ep)
      /* Two different dead-end states, one label
         each. A type WITH EntitySets whose set name
         is the last segment of no path is still
         reachable through navigation — that is
         sketch_navonly. A type with NO EntitySet at
         all has nothing to navigate from, and
         saying "nur über Navigation" there is
         simply false. That second case is
         sketch_noep, which existed in both tables
         and was never rendered. */ : /*#__PURE__*/React.createElement("span", {
        className: "sk-noep"
      }, r.hasSet ? t.sketch_navonly : t.sketch_noep))), rest.length > 0 && /*#__PURE__*/React.createElement("button", {
        className: "sk-more",
        onClick: () => setOpen(prev => ({
          ...prev,
          [s.name]: !prev[s.name]
        })),
        "aria-expanded": !!open[s.name]
      }, open[s.name] ? t.sketch_less : t.sketch_more.replace('{n}', String(rest.length))));
    })()) :
    /*#__PURE__*/
    /* Zero linked types is a RESULT, not a missing section.
       Gating the whole join block on linked(c).length > 0 made
       a CSDL whose EntitySets reach no endpoint path render a
       counts card with no join line at all — indistinguishable
       from "not computed yet". Say it. */
    React.createElement("div", {
      className: "sketch-join"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sketch-join-head"
    }, t.sketch_types, ": ", t.sketch_join_none))) : e ? /*#__PURE__*/React.createElement("p", {
      className: "err"
    }, t.sketch_err, ": ", e) : /*#__PURE__*/React.createElement("div", {
      className: "sketch-actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "primary",
      onClick: () => count(s),
      disabled: isBusy || busy
    }, isBusy ? t.sketch_counting : t.sketch_load), /*#__PURE__*/React.createElement("a", {
      className: "dl",
      href: RAW + 'schemas/' + s.name,
      target: "_blank",
      rel: "noopener"
    }, t.sketch_raw, " \u2197")));
  })));
}

// ---------- App shell ----------
const TABS = [['hub', 'Hub', Hub], ['reference', 'Reference', Reference], ['console', 'Console', ConsolePanel], ['permissions', 'Permissions', Permissions], ['radar', 'Breaking Radar', Radar]];
// The sketch panel is reachable from the header button, NOT from the tab bar.
// Two entry points for one panel would mean the tab bar shows six entries the
// user cannot predict, and the ARIA tablist would contain a tab with no label.
// It is therefore not in TABS; the render switch below handles it separately.
const EXTRA_PANELS = {
  sketch: Sketch
};
function App() {
  const [tab, setTab] = useState('hub');
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('msgraph_lang') || 'de';
    } catch {
      return 'de';
    }
  });
  const [ignite, setIgnite] = useState(false);
  const [m, setM] = useState(null);
  useEffect(() => {
    fetch('data/manifest.json').then(r => r.json()).then(setM).catch(() => setM({}));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('ignite', ignite);
  }, [ignite]);
  const t = I18N[lang];
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('msgraph_lang', lang);
    } catch {}
  }, [lang]);

  // micro-interactions: cursor trail + scanlines
  useEffect(() => {
    const trail = document.getElementById('trail');
    const scan = document.getElementById('scan');
    const move = e => {
      if (trail) {
        trail.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
      }
    };
    window.addEventListener('mousemove', move);
    if (trail) trail.style.display = 'block';
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "trail",
    id: "trail",
    style: {
      display: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "scanlines",
    id: "scan"
  }), /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "brandname"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mark"
  }), "qapdex-maker.github.io"), /*#__PURE__*/React.createElement("nav", {
    className: "nav",
    role: "tablist",
    "aria-label": "Hauptbereiche"
  }, TABS.map((tt, ti) => /*#__PURE__*/React.createElement("a", {
    key: tt[0],
    id: 'tab-' + tt[0],
    role: "tab",
    href: '#' + tt[0],
    "aria-selected": tab === tt[0],
    "aria-controls": 'panel-' + tt[0],
    className: tab === tt[0] ? 'active' : '',
    onClick: e => {
      e.preventDefault();
      setTab(tt[0]);
    },
    onKeyDown: e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = (ti + dir + TABS.length) % TABS.length;
        setTab(TABS[next][0]);
        const el = document.getElementById('tab-' + TABS[next][0]);
        if (el) el.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setTab(TABS[0][0]);
        document.getElementById('tab-' + TABS[0][0])?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        setTab(TABS[TABS.length - 1][0]);
        document.getElementById('tab-' + TABS[TABS.length - 1][0])?.focus();
      }
    }
  }, tt[1]))), /*#__PURE__*/React.createElement("div", {
    className: "themeswitch"
  }, /*#__PURE__*/React.createElement("span", {
    id: "liveDot",
    className: 'livedot ' + (m?.syncDate ? 'on' : '')
  }, m?.syncDate ? t.live.replace('{d}', m.syncDate) : m === null ? t.live_loading : t.live_err), /*#__PURE__*/React.createElement("button", {
    className: "tbtn",
    id: "sketchBtn",
    onClick: () => setTab('sketch')
  }, t.sketch), /*#__PURE__*/React.createElement("button", {
    className: "btn-ignite",
    id: "igniteBtn",
    "aria-pressed": ignite,
    onClick: () => setIgnite(v => !v)
  }, /*#__PURE__*/React.createElement("span", {
    className: "toggle-dot"
  }), t.ignite), /*#__PURE__*/React.createElement("button", {
    className: "tbtn",
    id: "langBtn",
    "aria-pressed": lang === 'en',
    onClick: () => setLang(l => l === 'de' ? 'en' : 'de')
  }, lang === 'en' ? t.de : t.en)))), /*#__PURE__*/React.createElement("main", {
    id: 'panel-' + tab,
    role: "tabpanel",
    "aria-labelledby": 'tab-' + tab
  }, tab === 'hub' && /*#__PURE__*/React.createElement(Hub, {
    t: t,
    m: m,
    lang: lang
  }), tab === 'reference' && /*#__PURE__*/React.createElement(Reference, {
    t: t
  }), tab === 'console' && /*#__PURE__*/React.createElement(ConsolePanel, {
    t: t
  }), tab === 'permissions' && /*#__PURE__*/React.createElement(Permissions, {
    t: t,
    lang: lang
  }), tab === 'radar' && /*#__PURE__*/React.createElement(Radar, {
    t: t,
    lang: lang
  }), tab === 'sketch' && /*#__PURE__*/React.createElement(Sketch, {
    t: t
  })), /*#__PURE__*/React.createElement("footer", {
    className: "foot"
  }, t.footer, m && m.siteVersion ? ' · v' + m.siteVersion : ''));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));