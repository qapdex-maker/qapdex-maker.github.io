'use strict';
const RAW = 'https://raw.githubusercontent.com/qapdex-maker/metadata-msgraph/master/';
const SITE = { 'v1.0': 'openapi/v1.0/openapi.yaml', beta: 'openapi/beta/openapi.yaml' };

// ---------- Theme ----------
const THEME_KEY = 'qgraph-theme';
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('active', b.dataset.setTheme===t));
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
}
document.querySelectorAll('.tbtn').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.setTheme)));
applyTheme(localStorage.getItem(THEME_KEY) || 'idun-retro');

// ---------- Nav ----------
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();
  const id=a.getAttribute('href').slice(1);
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav a').forEach(n=>n.classList.remove('active'));
  a.classList.add('active');
  if(id==='console') lazyLoadConsole();
  if(id==='reference') lazyLoadReference();
  if(id==='permissions') lazyLoadPermissions();
  if(id==='radar') lazyLoadRadar();
}));

// ---------- Manifest / Cards (sofort, klein) ----------
async function boot(){
  let m;
  try { m = await (await fetch('data/manifest.json')).json(); }
  catch(e){ m = {projects:[], schemaVersion:'?', syncDate:'?'}; }
  document.getElementById('schemaVer').textContent = 'schema '+(m.schemaVersion||'?');
  document.getElementById('badgeSync').textContent = 'sync '+(m.syncDate||'?');
  const pc = document.getElementById('projectCards');
  (m.projects||[]).forEach(p=>{
    const d=document.createElement('div'); d.className='card';
    d.innerHTML = `<h3>${p.name}</h3><div class="role">${p.role}</div>
      <p><a class="dl" href="https://github.com/${p.repo}" target="_blank" rel="noopener">github.com/${p.repo} ↗</a></p>`;
    pc.appendChild(d);
  });
  const dls = [
    ['OpenAPI v1.0', 'openapi/v1.0/openapi.yaml'],
    ['OpenAPI beta', 'openapi/beta/openapi.yaml'],
    ['Clean CSDL v1.0 (full)', 'clean_v10_metadata/cleanMetadataWithDescriptionsAndAnnotationsAndErrorsv1.0.xml'],
    ['CSDL beta-Prod', 'schemas/beta-Prod.csdl'],
    ['Type-Mappings v1.0 (entities)', 'schemas/type-mappings/v1.0-entity-types.json'],
    ['Type-Mappings beta (enums)', 'schemas/type-mappings/beta-enum-types.json'],
  ];
  const dc=document.getElementById('dlCards');
  dls.forEach(([n,path])=>{
    const d=document.createElement('div'); d.className='card';
    d.innerHTML=`<h3>${n}</h3><p><a class="dl" href="${RAW+path}" target="_blank" rel="noopener">raw herunterladen ↗</a></p>`;
    dc.appendChild(d);
  });
  // Sichtbarer "JS lebt" Indikator
  const live=document.getElementById('liveDot');
  if(live){ live.textContent='● live'; live.classList.add('on'); }
  // Console + Reference IM HINTERGRUND vorladen, damit Tab-Klick sofort Inhalt zeigt
  lazyLoadConsole();
  lazyLoadReference();
}

// ---------- Lazy: Console (lädt erst die 2.5MB Index) ----------
let consoleLoaded=false;
async function lazyLoadConsole(){
  if(consoleLoaded) return; consoleLoaded=true;
  try{
    const v10 = await (await fetch('data/index.v1.0.json')).json();
    const beta = await (await fetch('data/index.beta.json')).json();
    document.getElementById('badgeV10').textContent='v1.0: '+v10.pathCount+' Pfade / '+v10.resources.length+' Ressourcen';
    document.getElementById('badgeBeta').textContent='beta: '+beta.pathCount+' Pfade / '+beta.resources.length+' Ressourcen';
    window.__idx = { 'v1.0':v10, 'beta':beta };
    initConsole();
  }catch(e){ console.error('index load failed', e); }
}

// ---------- Lazy: Reference (leichtgewichtig, kein RapiDoc) ----------
// RapiDoc blockiert den Main-Thread bei 8-41MB Specs -> Seite friert ein.
// Stattdessen: durchsuchbare Endpoint-Liste aus den Index-JSONs
// (index.v1.0.json / index.beta.json), die ohnehin fuer die Console da sind.
// "rohe Spec oeffnen" -> raw.githubusercontent in neuem Tab. Kein Freeze.
let refLoaded=false;
let refData = { 'v1.0':null, 'beta':null };
let refVariant='v1.0';
const REF_FILE = { 'v1.0':'index.v1.0.json', 'beta':'index.beta.json' };

async function loadRefVariant(variant){
  if(!refData[variant]){
    const r = await fetch('data/'+REF_FILE[variant]);
    refData[variant] = await r.json();
  }
  return refData[variant];
}
function renderRefList(){
  const data = refData[refVariant];
  const el = document.getElementById('refList');
  if(!data){ el.innerHTML='<div class="hint">lade…</div>'; return; }
  const q=(document.getElementById('refSearch').value||'').toLowerCase();
  // flat list
  const flat=[];
  Object.entries(data.paths||{}).forEach(([p,ops])=>ops.forEach(o=>{
    flat.push({path:p, method:o.method.toUpperCase(), summary:o.summary||''});
  }));
  const items = q ? flat.filter(f=>f.path.toLowerCase().includes(q)||f.summary.toLowerCase().includes(q)) : flat;
  document.getElementById('refStats').innerHTML =
    `<span class="badge">${data.variant||refVariant}: ${data.pathCount||flat.length} Endpoints</span>`+
    (q?`<span class="badge">Treffer: ${items.length}</span>`:'');
  el.innerHTML = (items.length?items:[]).slice(0,300).map(f=>`<div class="card">
    <h3><span class="mth">${f.method}</span> <span class="pth">${f.path}</span></h3>
    ${f.summary?`<p>${f.summary}</p>`:''}
  </div>`).join('') || '<div class="hint">Kein Treffer.</div>';
}
async function lazyLoadReference(){
  const spec=refVariant;
  document.getElementById('refRawBtn').href = RAW + SITE[spec];
  if(refLoaded && refData[spec]){ renderRefList(); return; }
  refLoaded=true;
  await loadRefVariant(spec);
  renderRefList();
}
document.querySelectorAll('.reftab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.reftab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  refVariant=t.dataset.spec;
  document.getElementById('refRawBtn').href = RAW + SITE[refVariant];
  loadRefVariant(refVariant).then(renderRefList);
}));
document.getElementById('refSearch').addEventListener('input', renderRefList);


// ---------- Console ----------
function initConsole(){
  const idx = window.__idx['v1.0'];
  // flatten path list with method summary
  const flat = [];
  Object.entries(idx.paths).forEach(([p, ops])=>{
    ops.forEach(o=>flat.push({path:p, method:o.method.toUpperCase(), summary:o.summary, opId:o.operationId}));
  });

  const epInput=document.getElementById('epInput');
  const sug=document.getElementById('epSuggest');
  function showSuggest(q){
    q=q.trim().toLowerCase();
    if(!q){ sug.innerHTML=''; return; }
    const matches = flat.filter(f=>f.path.toLowerCase().includes(q) || (f.summary||'').toLowerCase().includes(q)).slice(0,12);
    sug.innerHTML = matches.map(m=>`<div class="s" data-path="${m.path}" data-method="${m.method}">
      <span class="sm">${m.method}</span> ${m.path}${m.summary?` <span class="sm">— ${m.summary}</span>`:''}</div>`).join('');
    sug.querySelectorAll('.s').forEach(s=>s.addEventListener('click',()=>{
      selectEndpoint(s.dataset.path, s.dataset.method, s.querySelector('.sm').nextSibling.textContent.replace(/^ — /,''));
      sug.innerHTML='';
    }));
  }
  epInput.addEventListener('input',()=>showSuggest(epInput.value));

  function selectEndpoint(path, method, summary){
    document.getElementById('resMethod').textContent=method;
    document.getElementById('resPath').textContent=path;
    document.getElementById('resMeta').textContent = summary?('Beschreibung: '+summary):'(aus Metadaten)';
    renderCommands(path, method);
  }
  window.__selectEndpoint = selectEndpoint;

  // default selection
  selectEndpoint('/me','GET','Aktueller Benutzer');

  // NL heuristic
  document.getElementById('nlBtn').addEventListener('click',()=>{
    const q=document.getElementById('nlInput').value.trim();
    const r=nlMap(q, idx);
    document.getElementById('resMethod').textContent=r.method;
    document.getElementById('resPath').textContent=r.path;
    document.getElementById('resMeta').textContent='NL-Heuristik: '+(r.reason||'')+ (r.perm?(' · Permission: '+r.perm):'');
    renderCommands(r.path, r.method, r.varHint);
  });
}

function renderCommands(path, method, varHint){
  const curl = `# ${method} ${path}\ncurl -X ${method} "https://graph.microsoft.com/v1.0${path}" \\\n  -H "Authorization: Bearer $GRAPH_TOKEN" \\\n  -H "Content-Type: application/json"`;
  const idun = `# idun (Azure Foundry Client)\nidun graph call ${method} ${path}` + (varHint?`\n# Hinweis: ${varHint}`:'');
  document.getElementById('curlOut').textContent=curl;
  document.getElementById('idunOut').textContent=idun;
}

// ---------- NL -> Graph heuristic (offline, gegen Metadaten) ----------
function nlMap(q, idx){
  const t=q.toLowerCase();
  const has=(...kw)=>kw.some(k=>t.includes(k));
  // very small intent table; later replaced by idun-multi LLM bridge
  if(has('team')) return {method:'GET', path:'/me/joinedTeams', perm:'Team.ReadBasic.All', reason:'Teams-Mitgliedschaften des aktuellen Users'};
  if(has('calendar','termin','event')) return {method:'GET', path:'/me/events', perm:'Calendars.Read', reason:'Kalender-Events des Users'};
  if(has('mail','email','nachricht')) return {method:'GET', path:'/me/messages', perm:'Mail.Read', reason:'Mails des Users'};
  if(has('drive','onedrive','datei','file')) return {method:'GET', path:'/me/drive/root/children', perm:'Files.Read', reason:'OneDrive-Dateien'};
  if(has('photo','bild','avatar')) return {method:'GET', path:'/me/photo/$value', perm:'User.Read', reason:'Profilfoto'};
  if(has('group','gruppe')) return {method:'GET', path:'/groups', perm:'Group.Read.All', reason:'Verzeichnis-Gruppen'};
  if(has('user','benutzer','mitarbeiter') && has('mitglied')){
    const email=(q.match(/[\w.+-]+@[\w.-]+/)||[])[0];
    if(email) return {method:'GET', path:'/users/'+encodeURIComponent(email), perm:'User.Read.All', reason:'User via E-Mail', varHint:'E-Mail war '+email};
    return {method:'GET', path:'/users', perm:'User.Read.All', reason:'User-Liste'};
  }
  if(has('user','benutzer','mitarbeiter')) return {method:'GET', path:'/me', perm:'User.Read', reason:'Aktueller User'};
  if(has('device','gerät')) return {method:'GET', path:'/me/managedDevices', perm:'Device.Read.All', reason:'Managed Devices'};
  // fallback: search resource tokens
  const tok=t.split(/\W+/).filter(Boolean);
  const hit = (idx.resources||[]).find(r=>tok.includes(r.toLowerCase())) || (idx.resources||[]).find(r=>tok.some(k=>r.toLowerCase().includes(k)));
  if(hit) return {method:'GET', path:'/'+hit, perm:'—', reason:'Ressource aus Metadaten: '+hit};
  return {method:'GET', path:'/me', perm:'User.Read', reason:'kein Treffer — Default /me (Heuristik erweiterbar)'};
}

// =================== [2] PERMISSION INTELLIGENCE ===================
// Ehrlich: OpenAPI hier hat KEINE strukturierten scopes. Diese Liste ist
// kuratiert (bekannte Graph-Permissions) + least-privilege-Empfehlung.
const PERMISSIONS = [
  { name:'User.Read', type:'Delegated', min:'User.Read', workload:'Identity', note:'Profi + Grundlagen des angemeldeten Users' },
  { name:'User.Read.All', type:'Application', min:'User.Read.All', workload:'Identity', note:'Alle User lesen (App-only)' },
  { name:'User.ReadWrite.All', type:'Application', min:'User.Read.All', workload:'Identity', note:'Schreiben — lieber User.Read.All + Zielscope' },
  { name:'Group.Read.All', type:'Application', min:'Group.Read.All', workload:'Groups', note:'Alle Gruppen lesen' },
  { name:'Group.ReadWrite.All', type:'Application', min:'Group.Read.All', workload:'Groups', note:'Gruppen schreiben' },
  { name:'Mail.Read', type:'Delegated', min:'Mail.Read', workload:'Outlook', note:'Mails lesen' },
  { name:'Mail.ReadWrite', type:'Delegated', min:'Mail.Read', workload:'Outlook', note:'Mails lesen/senden/entwerfen' },
  { name:'Mail.Send', type:'Delegated', min:'Mail.Send', workload:'Outlook', note:'Nur senden, kein Lesen' },
  { name:'Calendars.Read', type:'Delegated', min:'Calendars.Read', workload:'Outlook', note:'Kalender lesen' },
  { name:'Calendars.ReadWrite', type:'Delegated', min:'Calendars.Read', workload:'Outlook', note:'Kalender schreiben' },
  { name:'Files.Read', type:'Delegated', min:'Files.Read', workload:'OneDrive/SharePoint', note:'Dateien lesen' },
  { name:'Files.ReadWrite', type:'Delegated', min:'Files.Read', workload:'OneDrive/SharePoint', note:'Dateien schreiben' },
  { name:'Sites.Read.All', type:'Application', min:'Sites.Read.All', workload:'SharePoint', note:'Alle Sites lesen' },
  { name:'Team.ReadBasic.All', type:'Delegated', min:'Team.ReadBasic.All', workload:'Teams', note:'Team-Namen + Kanäle' },
  { name:'Team.ReadWrite.All', type:'Delegated', min:'Team.ReadBasic.All', workload:'Teams', note:'Teams verwalten' },
  { name:'ChannelMessage.Read.All', type:'Application', min:'ChannelMessage.Read.All', workload:'Teams', note:'Kanalnachrichten lesen' },
  { name:'Directory.Read.All', type:'Application', min:'Directory.Read.All', workload:'Entra ID', note:'Verzeichnis lesen' },
  { name:'Device.Read.All', type:'Application', min:'Device.Read.All', workload:'Intune', note:'Managed Devices lesen' },
  { name:'Policy.Read.All', type:'Application', min:'Policy.Read.All', workload:'Entra ID', note:'Richtlinien lesen' },
  { name:'Reports.Read.All', type:'Application', min:'Reports.Read.All', workload:'Identity', note:'Nutzungsberichte' },
];
function renderPermList(){
  const q=(document.getElementById('permSearch').value||'').toLowerCase();
  const tp=document.getElementById('permType').value;
  const list=PERMISSIONS.filter(p=>
    (tp==='all'||p.type===tp) &&
    (q===''||p.name.toLowerCase().includes(q)||p.workload.toLowerCase().includes(q)||p.note.toLowerCase().includes(q)));
  const el=document.getElementById('permList');
  el.innerHTML = list.map(p=>`<div class="card">
    <h3>${p.name}</h3>
    <div class="role">${p.type} · ${p.workload}</div>
    <p>Least-privilege: <code>${p.min}</code></p>
    <p>${p.note}</p>
  </div>`).join('') || '<div class="hint">Kein Treffer.</div>';
}
function lazyLoadPermissions(){
  if(document.getElementById('permList').dataset.loaded) return;
  document.getElementById('permList').dataset.loaded='1';
  renderPermList();
  document.getElementById('permSearch').addEventListener('input', renderPermList);
  document.getElementById('permType').addEventListener('change', renderPermList);
}

// =================== [3] BREAKING-CHANGE RADAR ===================
let radarData = { 'v1.0':null, 'beta':null };
async function loadRadar(variant){
  if(!radarData[variant]){
    const r = await fetch('data/deprecations.'+variant+'.json');
    radarData[variant] = await r.json();
  }
  return radarData[variant];
}
function renderRadar(){
  const variant=document.getElementById('radarVariant').value;
  const filter=document.getElementById('radarFilter').value;
  const data = radarData[variant];
  if(!data){ document.getElementById('radarList').innerHTML='<div class="hint">lade…</div>'; return; }
  const items = data.items.filter(d=> filter==='all' ? true : d.status===filter);
  const c={}; data.items.forEach(d=>c[d.status]=(c[d.status]||0)+1);
  document.getElementById('radarStats').innerHTML =
    `<span class="badge">total: ${data.count}</span>`+
    (c.soon?`<span class="badge soon">bald: ${c.soon}</span>`:'')+
    (c.planned?`<span class="badge">geplant: ${c.planned}</span>`:'')+
    (c.removed?`<span class="badge removed">entfernt: ${c.removed}</span>`:'');
  const el=document.getElementById('radarList');
  el.innerHTML = (items.length?items:[]).slice(0,200).map(d=>`<div class="card ${d.status}">
    <h3><span class="mth">${d.method}</span> ${d.path}</h3>
    <div class="role">${d.status==='soon'?'⚠ bald':d.status==='removed'?'✕ entfernt':'○ geplant'} · ${d.removalDate||'k.A.'}</div>
    <p>${d.operationId||''}</p>
    ${d.version?`<p class="role">${d.version}</p>`:''}
  </div>`).join('') || '<div class="hint">Kein Treffer für Filter.</div>';
}
async function lazyLoadRadar(){
  if(document.getElementById('radarList').dataset.loaded) return;
  document.getElementById('radarList').dataset.loaded='1';
  await loadRadar('v1.0');
  renderRadar();
  document.getElementById('radarVariant').addEventListener('change', async ()=>{ await loadRadar(document.getElementById('radarVariant').value); renderRadar(); });
  document.getElementById('radarFilter').addEventListener('change', renderRadar);
}

boot();
