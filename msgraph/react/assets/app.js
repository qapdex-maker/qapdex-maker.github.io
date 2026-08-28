/* AUTO-GENERATED from assets/app.jsx -- do not edit by hand.
   Regenerate: sh build_appjs.sh */
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
const RAW = 'https://raw.githubusercontent.com/qapdex-maker/metadata-msgraph/master/';
const SITE = {
  'v1.0': 'openapi/v1.0/openapi.yaml',
  beta: 'openapi/beta/openapi.yaml'
};

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
    nl_reasons: {
      teams: 'Teams',
      mails: 'Mails',
      calendar: 'Kalender',
      onedrive: 'OneDrive',
      photo: 'Profilfoto',
      default: 'Standard'
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
    nl_reasons: {
      teams: 'Teams',
      mails: 'Mails',
      calendar: 'Calendar',
      onedrive: 'OneDrive',
      photo: 'Profile photo',
      default: 'Default'
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
  const dls = [['OpenAPI v1.0', SITE['v1.0']], ['OpenAPI beta', SITE.beta], ['Type-Mappings v1.0', 'schemas/type-mappings/v1.0-entity-types.json']];
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
  }, dls.map(([n, path]) => /*#__PURE__*/React.createElement("div", {
    className: "card",
    key: n
  }, /*#__PURE__*/React.createElement("h3", null, n), /*#__PURE__*/React.createElement("a", {
    className: "dl",
    href: RAW + path,
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
    href: RAW + SITE[variant]
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
  function runNl() {
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
    onClick: runNl
  }, t.nl_btn), /*#__PURE__*/React.createElement("label", {
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
  const items = (data?.items || []).filter(it => filter === 'all' || it.status === filter);
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
  }, data?.count || 0, " ", t.dep, " (", variant, ")")), /*#__PURE__*/React.createElement("div", {
    className: "cards radar-scroll"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    className: 'card ' + (it.status === 'removed' ? 'removed' : it.status === 'soon' ? 'soon' : 'planned'),
    key: i
  }, /*#__PURE__*/React.createElement("h3", null, it.endpoint || it.path || '?'), /*#__PURE__*/React.createElement("div", {
    className: "role"
  }, it.method || '', " \xB7 ", t.status[lang][it.status]), it.removalDate && /*#__PURE__*/React.createElement("p", null, t.removal, " ", it.removalDate)))));
}

// ---------- App shell ----------
const TABS = [['hub', 'Hub', Hub], ['reference', 'Reference', Reference], ['console', 'Console', ConsolePanel], ['permissions', 'Permissions', Permissions], ['radar', 'Breaking Radar', Radar]];
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
    onClick: () => setTab('reference')
  }, "React"), /*#__PURE__*/React.createElement("button", {
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
  })), /*#__PURE__*/React.createElement("footer", {
    className: "foot"
  }, t.footer, m && m.siteVersion ? ' · v' + m.siteVersion : ''));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));