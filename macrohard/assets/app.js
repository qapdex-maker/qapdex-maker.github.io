/* MakerOS — App Logic v2.6 */
(function(){
  'use strict';
  var lang='de';
  var apps={};
  var focused=null;
  var zIdx=100;
  var bootDone=false;
  window.osIntervals = window.osIntervals || {};
  window.osTimeouts = window.osTimeouts || {};

  /* localStorage Wrapper with quota check + fallback to sessionStorage */
  function storeSet(k,v){
    try{localStorage.setItem(k,v);return true;}catch(e){}
    try{sessionStorage.setItem(k,v);return true;}catch(e){}
    return false;
  }
  function storeGet(k){
    return localStorage.getItem(k)||sessionStorage.getItem(k);
  }
  function storeDel(k){
    try{localStorage.removeItem(k);}catch(e){}
    try{sessionStorage.removeItem(k);}catch(e){}
  }

  var I18N={
    de:{
      desktop:'Desktop',clock:'',
      notepad:'Notepad',calculator:'Calculator',terminal:'Terminal',
      explorer:'Explorer',paint:'Paint',browser:'Browser',
      music:'Music',chat:'Chat',docs:'Docs',settings:'Settings',links:'Links',
      start:'Start',search:'Suche...',
      noproc:'Kein Prozess',
      welcome:'Willkommen bei MakerOS',
      cancel:'canceled',
      ready:'bereit',
      files:'Dateien',folders:'Ordner',
      canvas:'Leinwand',colors:'Farben',
      docs:'Docs',music:'Music',chat:'Chat',
      links:'Links',perchance:'Perchance',settings:'Settings'
    },
    en:{
      desktop:'Desktop',clock:'',
      notepad:'Notepad',calculator:'Calculator',terminal:'Terminal',
      explorer:'Explorer',paint:'Paint',browser:'Browser',
      music:'Music',chat:'Chat',docs:'Docs',settings:'Settings',links:'Links',
      start:'Start',search:'Search...',
      noproc:'No process',
      welcome:'Welcome to MakerOS',
      cancel:'canceled',
      ready:'ready',
      files:'Files',folders:'Folders',
      canvas:'Canvas',colors:'Colors',
      docs:'Docs',music:'Music',chat:'Chat',
      links:'Links',perchance:'Perchance',settings:'Settings'
    }
  };
  function t(k){return I18N[lang]?I18N[lang][k]||k:k;}

  /* Clock */
  function tickClock(){
    var d=new Date();
    var el=document.getElementById('lockTime');
    if(el) el.textContent=d.toLocaleTimeString(lang==='de'?'de-DE':'en-US',{hour:'2-digit',minute:'2-digit'});
    var d2=d.toLocaleDateString(lang==='de'?'de-DE':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    var de=document.getElementById('lockDate');
    if(de) de.textContent=d2;
    var tc=document.getElementById('tbClock');
    if(tc) tc.textContent=d.toLocaleTimeString(lang==='de'?'de-DE':'en-US',{hour:'2-digit',minute:'2-digit'});
  }
  window.osIntervals['clock']=setInterval(tickClock,1000); tickClock();

  /* Boot → Lock → Desktop */
  window.startOS=function(){
    var boot=document.getElementById('boot');
    if(boot) boot.classList.add('hide');
    setTimeout(function(){
      var lock=document.getElementById('lock');
      if(lock) lock.classList.remove('hide');
    },600);
    setTimeout(function(){
      var lock=document.getElementById('lock');
      if(lock) lock.classList.add('hide');
      bootDone=true;
    },4200);
  };

  /* Session Restore + Wallpaper + Snapping — platform-level S1 */
  var SESSION_KEY='os_session';
  function saveSession(){
    var wins=[];
    document.querySelectorAll('.wnd').forEach(function(w){
      wins.push({id:w.getAttribute('data-app'),left:w.style.left,top:w.style.top,width:w.style.width,height:w.style.height,visible:w.style.display!=='none'});
    });
    try{localStorage.setItem(SESSION_KEY,JSON.stringify(wins));}catch(e){}
  }
  function restoreSession(){
    try{var saved=JSON.parse(localStorage.getItem(SESSION_KEY)||'[]');if(!saved.length)return;}catch(e){return;}
    saved.forEach(function(s){if(s.visible){openApp(s.id);var w=document.getElementById('w-'+s.id);if(w&&s.left)w.style.left=s.left;if(w&&s.top)w.style.top=s.top;if(w&&s.width)w.style.width=s.width;if(w&&s.height)w.style.height=s.height;}});
  }
  /* Wallpaper */
  function setWallpaper(url){
    var desk=document.getElementById('desktop');if(!desk) return;
    desk.style.backgroundImage='url('+url+')';desk.style.backgroundSize='cover';
    try{localStorage.setItem('os_wall',url);}catch(e){}
  }
  var savedWall=localStorage.getItem('os_wall');
  if(savedWall)setWallpaper(savedWall);
  /* Snapping */
  function snapWindow(w,direction){
    var wW=window.innerWidth;var wH=window.innerHeight;
    if(direction==='left'){w.style.left='0';w.style.top='0';w.style.width=(wW/2-4)+'px';w.style.height=wH+'px';}
    else if(direction==='right'){w.style.left=(wW/2+4)+'px';w.style.top='0';w.style.width=(wW/2-4)+'px';w.style.height=wH+'px';}
    else if(direction==='max'){w.style.left='0';w.style.top='0';w.style.width='100vw';w.style.height='100vh';}
    else if(direction==='restore'){w.style.left=w.dataset.origLeft||'';w.style.top=w.dataset.origTop||'';w.style.width=w.dataset.origWidth||'';w.style.height=w.dataset.origHeight||'';}
    saveSession();
  }
  /* Accessibility: reduced motion */
  var prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){
    document.documentElement.style.setProperty('--shadow','0 0 0 var(--ink)');
    document.documentElement.style.setProperty('--shadow-hover','0 0 0 var(--accent)');
  }

  document.getElementById('desktop').addEventListener('contextmenu',function(e){
    e.preventDefault();
    var m=document.getElementById('deskCtx');
    if(!m){m=document.createElement('div');m.id='deskCtx';
      m.innerHTML='<div class="ctxItem" data-a="notepad">Notepad</div><div class="ctxItem" data-a="calculator">Calculator</div><div class="ctxItem" data-a="terminal">Terminal</div><div class="ctxItem" data-a="explorer">Explorer</div><div class="ctxItem" data-a="paint">Paint</div><div class="ctxSep"></div><div class="ctxItem" data-action="view-large"><span style="flex:1">Ansicht: Groß</span>  <span style="font-size:10px;color:var(--muted)">Icons</span></div><div class="ctxItem" data-action="view-medium"><span style="flex:1">Ansicht: Mittel</span>  <span style="font-size:10px;color:var(--muted)">Icons</span></div><div class="ctxItem" data-action="sort-name"><span style="flex:1">Sortieren: Name</span>  <span style="font-size:10px;color:var(--muted)">A-Z</span></div><div class="ctxSep"></div><div class="ctxItem" data-a="settings">Settings</div><div class="ctxItem" data-a="amibios">AMIBIOS</div>';
      document.body.appendChild(m);
      m.querySelectorAll('.ctxItem').forEach(function(it){
        it.addEventListener('click',function(){
          var a=it.dataset.a;
          var act=it.dataset.action;
          if(a)openApp(a);
          if(act==='view-large'){document.getElementById('deskIcons').dataset.view='large';}
          else if(act==='view-medium'){document.getElementById('deskIcons').dataset.view='medium';}
          else if(act==='sort-name'){sortDeskIcons('name');}
          m.classList.remove('open');
        });
      });
    }
    m.style.left=e.clientX+'px';m.style.top=e.clientY+'px';
    m.classList.add('open');
  });

  function sortDeskIcons(by){
    var c=document.getElementById('deskIcons');
    var items=Array.from(c.children);
    items.sort(function(a,b){
      var la=a.querySelector('.lbl').textContent.toLowerCase();
      var lb=b.querySelector('.lbl').textContent.toLowerCase();
      return la.localeCompare(lb);
    });
    items.forEach(function(i){c.appendChild(i);});
  }
  document.addEventListener('click',function(e){
    var m=document.getElementById('deskCtx');if(m&&!m.contains(e.target))m.classList.remove('open');
  });
  var desktopApps=[
    {id:'notepad',label:'Notepad',icon:'notepad'},
    {id:'calculator',label:'Calculator',icon:'calc'},
    {id:'terminal',label:'Terminal',icon:'term'},
    {id:'explorer',label:'Explorer',icon:'fe'},
    {id:'paint',label:'Paint',icon:'paint'},
    {id:'browser',label:'Browser',icon:'browser'},
    {id:'music',label:'Music',icon:'music'},
    {id:'chat',label:'Chat',icon:'chat'},
    {id:'docs',label:'Docs',icon:'docs'},
    {id:'settings',label:'Settings',icon:'settings'},
    {id:'links',label:'Links',icon:'links'},
    {id:'amibios',label:'AMIBIOS',icon:'amibios'},
    {id:'taskmgr',label:'Taskmgr',icon:'tm'},
    {id:'sysinfo',label:'Sysinfo',icon:'si'},
    {id:'calendar',label:'Calendar',icon:'cal'},
    {id:'clock',label:'Clock',icon:'clock'},
    {id:'colorpicker',label:'Colors',icon:'cp'},
    {id:'pwgen',label:'PWGen',icon:'pw'},
    {id:'qrgen',label:'QRGen',icon:'qr'},
    {id:'viewer',label:'Viewer',icon:'vw'},
    {id:'game',label:'TicTacToe',icon:'game'},
  ];

  function makeIcon(a){
    var div=document.createElement('div');
    div.className='dskApp';
    div.setAttribute('data-app',a.id);
    div.innerHTML='<span class="ico">'+a.iconSvg+'</span><span class="lbl">'+a.label+'</span>';
    div.addEventListener('click',function(){openApp(a.id);});
    return div;
  }

  function svgIcon(name){
    var s={
      notepad:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>',
      calc:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/><line x1="10" y1="6" x2="14" y2="6"/></svg>',
      term:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
      fe:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',
      paint:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="7" r="2"/></svg>',
      music:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      links:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
      settings:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
      perchance:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>',
      docs:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>',
      chat:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
      camera:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      browser:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21" y1="12" x2="16" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="12" y1="21" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="3"/></svg>',
      amibios:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', tm:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>', si:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>', cal:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', clock:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>', cp:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="12.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/></svg>', pw:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>', qr:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="21" x2="21" y2="21"/></svg>', vw:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>', game:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/><circle cx="12" cy="12" r="9"/></svg>'
    };
    return s[name]||'';
  }

  /* Start menu — mit Fix für z-index und Click-Blockade durch Boot/Lock */
  document.addEventListener('DOMContentLoaded',function(){
    var tbStart=document.getElementById('tbStart');
    var startMenu=document.getElementById('startMenu');
    if(tbStart&&startMenu){
      tbStart.style.zIndex='100003';
      tbStart.addEventListener('click',function(e){
        e.stopPropagation();
        startMenu.classList.toggle('open');
      });
    }
    document.addEventListener('click',function(e){
      var sm=document.getElementById('startMenu');
      if(sm&&sm.classList.contains('open')&&!e.target.closest('#startMenu')&&!e.target.closest('#tbStart')){
        sm.classList.remove('open');
      }
    });
    /* Esc-Close */
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){
        var sm=document.getElementById('startMenu');
        if(sm&&sm.classList.contains('open')){sm.classList.remove('open');return;}
        if(focused&&focused._escClose) focused._escClose();
      }
    });
  });

  /* Lock → Desktop */
  document.getElementById('lock').addEventListener('click',function(){
    this.classList.add('unlocking');
    setTimeout(function(){
      document.getElementById('lock').classList.add('hide');
      document.getElementById('lock').classList.remove('unlocking');
    },700);
  });

  /* Fisher-Yates shuffle helper */
  function shuffleArray(arr){
    var a=arr.slice();
    for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}
    return a;
  }

  /* Window management — toast helper */
  function toast(msg){
    var t=document.getElementById('osToast');if(t){t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show');},2200);return;}
    var el=document.createElement('div');el.id='osToast';el.textContent=msg;el.className='osToast show';
    document.body.appendChild(el);setTimeout(function(){el.classList.remove('show');setTimeout(function(){if(el.parentNode)el.remove();},400);},2200);
  }

  /* Keyboard shortcuts — global when no input focused */
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    var key=(e.ctrlKey||e.metaKey)?e.key.toLowerCase():'';
    if(key==='n'){e.preventDefault();openApp('notepad');toast('Notepad');}
    else if(key==='t'){e.preventDefault();openApp('terminal');toast('Terminal');}
    else if(key==='e'){e.preventDefault();openApp('explorer');toast('Explorer');}
    else if(key==='p'){e.preventDefault();openApp('paint');toast('Paint');}
    else if(key==='b'){e.preventDefault();openApp('browser');toast('Browser');}
    else if(key==='m'){e.preventDefault();openApp('music');toast('Music');}
    else if(key==='c'&&!e.shiftKey){e.preventDefault();openApp('chat');toast('Chat');}
    else if(key==='a'&&!e.shiftKey){e.preventDefault();openApp('amibios');toast('AMIBIOS');}
    else if(key==='d'){e.preventDefault();openApp('docs');toast('Docs');}
    else if(key==='l'){e.preventDefault();openApp('links');toast('Links');}
    else if(key==='s'){e.preventDefault();snapActive();}
  });

  function snapActive(){
    var w=document.querySelector('.wnd.focused');
    if(!w) return;
    var curLeft=w.style.left||'0';
    var wW=window.innerWidth;
    if(curLeft==='0'){snapWindow(w,'right');toast('Right snap');}
    else{snapWindow(w,'left');toast('Left snap');}
  }

  function openApp(id){
    var w=document.getElementById('w-'+id);
    if(w){w.classList.add('focused');w.style.zIndex=++zIdx;focused=id;updateFocus();return;}
    var mk=document.createElement('div');
    mk.className='wnd';
    mk.id='w-'+id;
    mk.style.left=(80+(zIdx%5)*30)+'px';mk.style.top=(40+(zIdx%5)*20)+'px';
    mk.style.width='640px';mk.style.height='420px';
    mk.style.zIndex=++zIdx;mk.setAttribute('data-app',id);
    var title=t(id);
    var body='';
    switch(id){
      case 'notepad': body='<textarea class="npArea" id="npArea" placeholder="Notepad — tippe hier..."></textarea><div class="npStats" id="npStats">0 Zeichen</div>';break;
      case 'calculator': body='<div class="calHead"><input class="cExpr" id="cExpr" readonly value="0"><span class="cCur" id="cCur">0</span></div><div class="calcHist" id="calcHist"></div><div class="calGrid" id="calGrid"></div>';break;
      case 'terminal': body='<div class="termOut" id="termOut"></div><div class="termIn"><span class="prompt">user@macrohard:~$</span><input id="termIn" autofocus></div>';break;
      case 'explorer': body='<div class="fePath"><span>📁</span><input id="fePath" value="C:\Users\macrohard\Desktop"></div><div class="feSide" id="feSide"></div><div class="feGrid" id="feGrid"></div>';break;
      case 'paint': body='<div class="ptColors" id="ptColors"></div><canvas class="ptCanvas" id="ptCanvas" width="400" height="260"></canvas>';break;
      case 'browser': body='<div class="fePath"><span>🔍</span><input id="brAddr" value="https://" placeholder="URL eingeben..."></div><div style="display:flex;gap:4px;padding:4px 8px;flex-wrap:wrap" id="brNav"></div><div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-family:IBM Plex Mono,monospace;font-size:12px;text-align:center;padding:20px"><div><div style="font-size:48px;margin-bottom:12px">🌐</div><div>Web-Browser</div><div style="font-size:10px;opacity:.6;margin-top:8px">URLs werden im externen Browser geöffnet</div></div></div>';break;
      case 'music': body='<div class="musList" id="musList"></div>';break;
      case 'chat': body='<div class="cpMsgs" id="cpMsgs"></div><div class="cpSugs" id="cpSugs"></div><div class="cpIn"><input id="cpIn" placeholder="Nachricht..."><button id="cpSend">Send</button></div>';break;
      case 'docs': body='<div class="mdBody" id="mdBody"><h3>MakerOS Docs</h3><p>Neo-brutalist desktop OS — qapdex-maker.github.io edition.</p><p>13 Apps: Notepad, Calculator, Terminal, Explorer, Paint, Browser, Music, Chat, Docs, Settings, Links, AMIBIOS.</p></div>';break;
      case 'settings': body='<div class="stGrid" id="stGrid"><div class="stNav"><button data-tab="general" class="active" data-de="Allgemein" data-en="General">Allgemein</button><button data-tab="appearance" data-de="Aussehen" data-en="Appearance">Aussehen</button><button data-tab="shortcuts" data-de="Tastenkürzel" data-en="Shortcuts">Tastenkürzel</button><button data-tab="privacy" data-de="Datenschutz" data-en="Privacy">Datenschutz</button></div><div class="stPane active" data-pane="general"><label><input type="checkbox" id="stDark"> Dark Mode</label><label><input type="checkbox" id="stScan" checked> Scanlines</label><label>Sprache: <select id="stLang"><option value="de">Deutsch</option><option value="en">English</option></select></label><label style="margin-top:8px"><button class="btn-ghost" id="stRegisterSW">PWA Service Worker registrieren</button></label></div><div class="stPane" data-pane="appearance" id="stAppearance"></div><div class="stPane" data-pane="shortcuts" id="stShortcuts"></div><div class="stPane" data-pane="privacy" id="stPrivacy"></div></div>';break;
      case 'links': body='<div class="clPane" id="clPane"></div>';break;
      case 'amibios': body='<div style="width:100%;height:100%" id="w-amibios"></div>';break;
      case 'taskmgr': body='<div class="tmBody" id="tmBody"></div>';break;
      case 'sysinfo': body='<div class="siBody" id="siBody"></div>';break;
      case 'calendar': body='<div class="calBody" id="calBody"></div>';break;
      case 'clock': body='<div class="clkBody" id="clkBody"></div>';break;
      case 'colorpicker': body='<div class="cpBody" id="cpBody"><div class="cpPreview" id="cpPreview"></div><input type="color" id="cpInput" value="#2547ff"><input type="text" id="cpHex" value="#2547ff" readonly></div>';break;
      case 'pwgen': body='<div class="pwBody" id="pwBody"></div>';break;
      case 'qrgen': body='<div class="qrBody" id="qrBody"><input type="text" id="qrInput" placeholder="Text oder URL..."><div class="qrCanvas" id="qrCanvas"></div><button class="cBtn" id="qrBtn">Generieren</button></div>';break;
      case 'viewer': body='<div class="vwBody" id="vwBody"><div id="vwPlaceholder">Bild hierher ziehen</div><canvas id="vwCanvas"></canvas></div>';break;
      case 'game': body='<div class="gmBody" id="gmBody"></div>';break;
    }
    mk.innerHTML='<div class="wtitle"><span class="wact"></span><span class="wtxt">'+title+'</span><button class="wmin" title="Minimize">_</button><button class="wmax" title="Maximize">□</button><button class="wclose" title="Close">×</button></div><div class="wbody">'+body+'</div><div class="wnd-resize" data-dot="⬢"></div>';
    document.getElementById('desktop').appendChild(mk);
    if(id==='calculator') buildCalc();
    if(id==='explorer') buildExplorer();
    if(id==='paint') buildPaint();
    if(id==='terminal') buildTerminal();
    if(id==='notepad') setupNotepad();
    if(id==='browser') buildBrowser();
    if(id==='music') buildMusic();
    if(id==='chat') buildChat();
    if(id==='docs') buildDocs();
    if(id==='settings') buildSettings();
    if(id==='links') buildLinks();
    if(id==='amibios') buildAMIBIOS();
    if(id==='taskmgr') buildTaskmgr();
    if(id==='sysinfo') buildSysinfo();
    if(id==='calendar') buildCalendar();
    if(id==='clock') buildClock();
    if(id==='colorpicker') buildColorpicker();
    if(id==='pwgen') buildPwgen();
    if(id==='qrgen') buildQrgen();
    if(id==='viewer') buildViewer();
    if(id==='game') buildGame();
    mk.addEventListener('mousedown',function(e){if(e.target.closest('.wclose')||e.target.closest('.wmin'))return;this.classList.add('focused');this.style.zIndex=++zIdx;focused=id;updateFocus();saveSession();});
    mk.querySelector('.wclose').addEventListener('click',function(e){
      e.stopPropagation();
      var wnd=this.closest('.wnd');
      var wId=wnd.getAttribute('data-app');
      if(wId && window.osIntervals && window.osIntervals[wId]){
        clearInterval(window.osIntervals[wId]);
        delete window.osIntervals[wId];
      }
      wnd.classList.add('closing');
      setTimeout(function(){wnd.remove();},200);
      var tbIcon=document.getElementById('tb-'+id);
      if(tbIcon) tbIcon.remove();
    });
    mk.querySelector('.wmin').addEventListener('click',function(e){e.stopPropagation();
      var tbIcon=document.getElementById('tb-'+id);
      if(mk.style.display==='none'){mk.style.display='';if(tbIcon)tbIcon.classList.add('running');}
      else{mk.style.display='none';if(tbIcon)tbIcon.classList.remove('running');}
    });
    mk.querySelector('.wmax').addEventListener('click',function(e){e.stopPropagation();
      var tbIcon=document.getElementById('tb-'+id);
      if(mk.dataset.max==='true'){
        mk.style.left=mk.dataset.origLeft;mk.style.top=mk.dataset.origTop;
        mk.style.width=mk.dataset.origWidth;mk.style.height=mk.dataset.origHeight;
        delete mk.dataset.max;delete mk.dataset.origLeft;delete mk.dataset.origTop;
        delete mk.dataset.origWidth;delete mk.dataset.origHeight;
        if(tbIcon)tbIcon.classList.add('running');
      } else {
        mk.dataset.origLeft=mk.style.left||'';mk.dataset.origTop=mk.style.top||'';
        mk.dataset.origWidth=mk.style.width||'';mk.dataset.origHeight=mk.style.height||'';
        snapWindow(mk,'max');
        mk.dataset.max='true';
        if(tbIcon)tbIcon.classList.add('running');
      }
    });
    /* titlebar drag */
    var titlebar=mk.querySelector('.wtitle');
    if(titlebar){titlebar.addEventListener('mousedown',function(e){if(e.target.closest('button'))return;dragStart(e,mk);});}
    focused=id; updateFocus();

    /* Taskbar-Icon erstellen wenn nicht vorhanden */
    if(!document.getElementById('tb-'+id)){
      var tbIcon=document.createElement('div');
      tbIcon.className='tbIcon running focused';
      tbIcon.id='tb-'+id;
      tbIcon.title=t(id);
      tbIcon.dataset.app=id;
      tbIcon.innerHTML='<span>'+t(id)+'</span><span class="tbRun"></span>';
      tbIcon.addEventListener('click',function(e){
        var w=document.getElementById('w-'+id);
        if(!w) return;
        if(w.style.display==='none'){
          w.style.display='';
          this.classList.add('running');
          w.classList.add('focused');
          w.style.zIndex=++zIdx;
          focused=id;
          updateFocus();
        } else if(focused===id){
          w.style.display='none';
          this.classList.remove('running');
        } else {
          w.classList.add('focused');
          w.style.zIndex=++zIdx;
          focused=id;
          updateFocus();
        }
      });
      document.getElementById('tbCenter').appendChild(tbIcon);
    } else {
      var existingIcon=document.getElementById('tb-'+id);
      if(existingIcon){
        existingIcon.classList.add('running','focused');
      }
    }
    updateTaskbarFocus();
  }

  function updateTaskbarFocus(){
    document.querySelectorAll('.tbIcon').forEach(function(t){t.classList.remove('focused');});
    if(focused){
      var f=document.getElementById('tb-'+focused);
      if(f) f.classList.add('focused');
    }
  }

  function updateFocus(){
    document.querySelectorAll('.wnd').forEach(function(w){w.classList.remove('focused');});
    var f=document.getElementById('w-'+focused);
    if(f) f.classList.add('focused');
  }

  /* Notepad — S3: Font + Export */
  function setupNotepad(){
    var a=document.getElementById('npArea');
    var s=document.getElementById('npStats');
    if(!a) return;
    var NS='np_save';
    try{var sv=localStorage.getItem(NS);if(sv)a.value=sv;}catch(e){}
    var saveTimer=null;
    a.addEventListener('input',function(){
      clearTimeout(saveTimer);
      saveTimer=setTimeout(function(){try{localStorage.setItem(NS,a.value);}catch(e){}},300);
      var wc=a.value.trim().split(/\s+/).filter(Boolean).length;
      s.textContent=a.value.length+' Zeichen · '+wc+' Wörter';
    });
    /* Ctrl+F search overlay */
    a.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key==='f'){
        e.preventDefault();
        var ov=document.getElementById('npSearch');
        if(ov){ov.style.display=ov.style.display==='none'?'flex':'none';return;}
        var overlay=document.createElement('div');
        overlay.id='npSearch';overlay.className='npSearch';
        overlay.innerHTML='<input id="npSQ" placeholder="Suchen… (Enter=weiter, Esc=schliessen)"><button id="npSC" class="cBtn op">✕</button>';
        a.parentNode.insertBefore(overlay,a.nextSibling);
        var qi=document.getElementById('npSQ');qi.focus();
        qi.addEventListener('keydown',function(ev){
          if(ev.key==='Escape'){overlay.style.display='none';return;}
          if(ev.key==='Enter'){
            var q=qi.value;if(!q)return;
            var txt=a.value;var idx=txt.indexOf(q);
            if(idx===-1){qi.style.background='#ffcccc';return;}
            a.focus();a.setSelectionRange(idx,idx+q.length);
            qi.style.background='var(--paper)';
          }
        });
        document.getElementById('npSC').addEventListener('click',function(){overlay.remove();});
      }
    });
    document.addEventListener('click',function(e){
      var ov=document.getElementById('npSearch');
      if(ov&&!ov.contains(e.target)&&e.target!==a)ov.style.display='none';
    });
    var tb=document.createElement('div');tb.style.cssText='padding:4px 8px;display:flex;gap:4px;border-bottom:2px solid var(--line);background:var(--paper);align-items:center';
    tb.innerHTML='<span style="font-size:10px;font-family:IBM Plex Mono">Size:</span><select id="npFS" style="font-family:IBM Plex Mono;font-size:10px;padding:2px"><option value="11" '+(fs==='11'?'selected':'')+'>Klein</option><option value="13" '+(fs==='13'?'selected':'')+'>Normal</option><option value="16" '+(fs==='16'?'selected':'')+'>Groß</option></select><button id="npExp" class="cBtn" style="margin-left:auto">Export .txt</button>';
    a.parentNode.insertBefore(tb,a);
    document.getElementById('npFS').addEventListener('change',function(){var v=this.value;a.style.fontSize=v+'px';try{localStorage.setItem('np_fs',v);}catch(e){}});
    document.getElementById('npExp').addEventListener('click',function(){var txt=a.value;var blob=new Blob([txt],{type:'text/plain'});var lnk=document.createElement('a');lnk.href=URL.createObjectURL(blob);lnk.download='notepad.txt';lnk.click();URL.revokeObjectURL(lnk.href);toast('.txt exportiert');});
  }

  /* Calculator — S3: Scientific + History limit 12 */
  var calcHist=[];var sciMode=false;
  function buildCalc(){
    var grid=document.getElementById('calGrid');if(!grid) return;
    var sci=['sin','cos','tan','sqrt','pow','log','abs','π','e','(',')'];
    var tb=document.createElement('div');tb.style.cssText='padding:4px 6px;display:flex;gap:2px;flex-wrap:wrap;border-bottom:2px solid var(--line)';
    var sciBtn=document.createElement('button');sciBtn.textContent='SCI';sciBtn.className='cBtn op';sciBtn.style.fontSize='10px';sciBtn.addEventListener('click',function(){sciMode=!sciMode;buildCalc();});
    tb.appendChild(sciBtn);
    if(sciMode){sci.forEach(function(b){var btn=document.createElement('button');btn.textContent=b;btn.className='cBtn';btn.addEventListener('click',function(){calcPress(b);});tb.appendChild(btn);});}
    grid.parentNode.insertBefore(tb,grid);
    var btns=sciMode?['C','±','%','÷','(',')','7','8','9','×','4','5','6','−','1','2','3','+','0','.','=']:['C','±','%','÷','(',')','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='];
    var opClasses={'\u00f7':'op','\u00d7':'op','\u2212':'op','+':'op','=':'eq','C':'op','\u00b1':'op','%':'op'};
    grid.innerHTML='';btns.forEach(function(b){var cls='cBtn'+(opClasses[b]?' '+opClasses[b]:'');var btn=document.createElement('button');btn.className=cls;btn.textContent=b;btn.addEventListener('click',function(){calcPress(b);});grid.appendChild(btn);});
    var wnd=document.getElementById('w-calculator');if(!wnd) return;
    wnd.addEventListener('keydown',function(e){
      var key=e.key;
      if(key==='Enter'){e.preventDefault();calcPress('=');}
      else if(key==='Escape'){e.preventDefault();calcPress('C');}
      else if(key==='Backspace'){e.preventDefault();var ex=document.getElementById('cExpr');if(ex)ex.value=ex.value.slice(0,-1)||'0';}
      else if(/^[0-9.+\-*/()]$/.test(key)){e.preventDefault();var ex2=document.getElementById('cExpr');if(ex2){if(ex2.value==='0')ex2.value=key;else ex2.value+=key;ex2.focus();}}
    });
    wnd.setAttribute('tabindex','-1');
  }
  function calcPress(b){
    var expr=document.getElementById('cExpr');if(!expr) return;
    var map={'sin':'Math.sin','cos':'Math.cos','tan':'Math.tan','sqrt':'Math.sqrt','pow':'Math.pow','log':'Math.log','abs':'Math.abs','π':'Math.PI','e':'Math.E'};
    if(map[b]){expr.value+=map[b]+'(';}
    else if(b==='C'){expr.value='0';document.getElementById('cCur').textContent='0';document.getElementById('calcHist').textContent='';}
    else if(b==='±'){expr.value=(parseFloat(expr.value||'0')*-1).toString();}
    else if(b==='%'){expr.value=(parseFloat(expr.value||'0')/100).toString();}
    else if(b==='='){try{var r=eval(expr.value.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-'));calcHist.unshift(expr.value+' = '+r);if(calcHist.length>12)calcHist.pop();document.getElementById('cCur').textContent='';expr.value=r;renderHist();}catch(e){expr.value='Error';}}
    else{if(expr.value==='0')expr.value=b;else expr.value+=b;}
  }
  window.calcPress=calcPress;
  function renderHist(){
    var hist=document.getElementById('calcHist');if(!hist) return;
    hist.innerHTML=calcHist.map(function(h){return '<div class="chItem">'+h+'</div>';}).join('');
    hist.querySelectorAll('.chItem').forEach(function(el,idx){
      el.style.cursor='pointer';
      el.addEventListener('click',function(){
        var parts=el.textContent.split(' = ');if(parts[0])document.getElementById('cExpr').value=parts[0];
      });
    });
  }

  /* Terminal */
  var termHist=[];var termHistI=0;
  function buildTerminal(){
    var out=document.getElementById('termOut');var inp=document.getElementById('termIn');if(!out||!inp) return;
    function w(text){var d=document.createElement('div');d.textContent=text;out.appendChild(d);out.scrollTop=out.scrollHeight;}
    w('MakerOS — Terminal');w('Typse "help" für Befehle.');
    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        var cmd=inp.value.trim();if(!cmd){return;}
        w('user@macrohard:~$ '+cmd);termHist.push(cmd);termHistI=termHist.length;
        var args=cmd.split(' ');var c=args[0].toLowerCase();
        switch(c){
          case 'help':w('Befehle: help, ls, cd, pwd, touch, rm, mkdir, cp, mv, find, grep, echo, cat, date, clear, whoami');break;
                    case 'pwd':w('/home/macrohard');break;
                    case 'ls':{
                      var d=fsData[curPath];
                      if(d){d.dirs.forEach(function(x){w('\x1b[34m📁  '+x+'\x1b[0m');});d.files.forEach(function(x){w('\x1b[90m📄  '+x+'\x1b[0m');});}
                      else w('Nicht gefunden.');
                      break;
                    }
                    case 'cat':{
                      var target=args[1];
                      if(!target){w('Usage: cat <file>');break;}
                      var cur=fsData[curPath];
                      if(cur&&cur.files.indexOf(target)!==-1){w('--- '+target+' ---');w('[Inhalt von '+target+' — mock]');}
                      else w('Datei nicht gefunden: '+target);
                      break;
                    }
                    case 'touch':{
                      var fn=args[1];if(!fn){w('Usage: touch <file>');break;}
                      var c=fsData[curPath];if(!c){w('Kein Verzeichnis.');break;}
                      if(c.files.indexOf(fn)!==-1){w('Datei existiert bereits: '+fn);}
                      else{c.files.push(fn);w('Erstellt: '+fn);}
                      break;
                    }
                    case 'rm':{
                      var fn2=args[1];if(!fn2){w('Usage: rm <file>');break;}
                      var c2=fsData[curPath];if(!c2){w('Kein Verzeichnis.');break;}
                      var idx=c2.files.indexOf(fn2);if(idx!==-1){c2.files.splice(idx,1);w('Gelöscht: '+fn2);}
                      else w('Nicht gefunden: '+fn2);
                      break;
                    }
                    case 'mkdir':{
                      var dn=args[1];if(!dn){w('Usage: mkdir <dir>');break;}
                      var c3=fsData[curPath];if(!c3){w('Kein Verzeichnis.');break;}
                      if(c3.dirs.indexOf(dn)!==-1){w('Existiert bereits: '+dn);}
                      else{c3.dirs.push(dn);w('Ordner erstellt: '+dn);}
                      break;
                    }
                    case 'cp':{
                      var src=args[1],dst=args[2];if(!src||!dst){w('Usage: cp <src> <dst>');break;}
                      var c4=fsData[curPath];if(!c4){w('Kein Verzeichnis.');break;}
                      if(c4.files.indexOf(src)!==-1&&c4.files.indexOf(dst)===-1){c4.files.push(dst);w('Kopiert: '+src+' → '+dst);}
                      else w('Fehler: '+src+' nicht gefunden oder '+dst+' existiert.');
                      break;
                    }
                    case 'mv':{
                      var src2=args[1],dst2=args[2];if(!src2||!dst2){w('Usage: mv <src> <dst>');break;}
                      var c5=fsData[curPath];if(!c5){w('Kein Verzeichnis.');break;}
                      var i2=c5.files.indexOf(src2);if(i2!==-1){c5.files[i2]=dst2;w('Verschoben: '+src2+' → '+dst2);}
                      else w('Nicht gefunden: '+src2);
                      break;
                    }
                    case 'find':{
                      var q=args[1];if(!q){w('Usage: find <name>');break;}
                      var hits=[];
                      Object.keys(fsData).forEach(function(p){
                        fsData[p].files.forEach(function(f){if(f.indexOf(q)!==-1)hits.push(p+'/'+f);});
                        fsData[p].dirs.forEach(function(d){if(d.indexOf(q)!==-1)hits.push(p+'/'+d+'/');});
                      });
                      w(hits.length?'Gefunden:\n'+hits.join('\n'):'Nichts gefunden.');
                      break;
                    }
                    case 'grep':{
                      var term=args[1];if(!term){w('Usage: grep <text>');break;}
                      var c6=fsData[curPath];if(!c6){w('Kein Verzeichnis.');break;}
                      var matches=c6.files.filter(function(f){return f.indexOf(term)!==-1;});
                      w(matches.length?'Match:\n'+matches.join('\n'):'Kein Treffer.');
                      break;
                    }
                    case 'echo':w(args.slice(1).join(' '));break;
                    case 'date':w(new Date().toString());break;
                    case 'clear':out.innerHTML='';break;
                    case 'whoami':w('macrohard\\user');break;
                    case 'colors':{
                      var colors=['\x1b[31mrot\x1b[0m','\x1b[32mgrün\x1b[0m','\x1b[33mgelb\x1b[0m','\x1b[34mblau\x1b[0m','\x1b[35mmagenta\x1b[0m','\x1b[36mcyan\x1b[0m','\x1b[90mgrau\x1b[0m','\x1b[97mweiß\x1b[0m'];
                      colors.forEach(function(c){w(c);});
                      break;
                    }
          default:w('Unbekannt: '+c+' — tipse "help"');
        }
        inp.value='';
        /* Tab completion */
        var curVal=inp.value;
        if(curVal && !curVal.includes(' ')){
          var matches=Object.keys(fsData).filter(function(p){return p.startsWith(curVal);});
          if(matches.length===1){inp.value=matches[0]+'\\';}
          else if(matches.length>1){w('Mehrfach: '+matches.join(', '));}
        }
      }
      if(e.key==='ArrowUp'){if(termHistI>0){termHistI--;inp.value=termHist[termHistI];}}
      if(e.key==='ArrowDown'){if(termHistI<termHist.length-1){termHistI++;inp.value=termHist[termHistI];}else{termHistI=termHist.length;inp.value='';}}
    });
  }

  /* Explorer — S1: New Folder / New File */
  function buildExplorer(){
    renderExplorer();
    var inp=document.getElementById('fePath');if(!inp) return;
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'){curPath=inp.value;renderExplorer();}});
    /* Toolbar buttons */
    var tb=document.createElement('div');tb.style.cssText='padding:4px 10px;display:flex;gap:4px;border-bottom:2px solid var(--line);background:var(--paper)';
    var nfBtn=document.createElement('button');nfBtn.className='cBtn';nfBtn.textContent='New Folder';nfBtn.addEventListener('click',function(){newExplorerItem('folder');});
    var nfileBtn=document.createElement('button');nfileBtn.className='cBtn';nfileBtn.textContent='New File';nfileBtn.addEventListener('click',function(){newExplorerItem('file');});
    tb.appendChild(nfBtn);tb.appendChild(nfileBtn);
    var sideEl=document.getElementById('feSide');
    if(sideEl) sideEl.parentNode.insertBefore(tb,sideEl);
  }
  function newExplorerItem(type){
    var name=prompt(type==='folder'?'Ordnername:':'Dateiname:');
    if(!name) return;
    var c=fsData[curPath];if(!c){alert('Kein Verzeichnis.');return;}
    if(type==='folder'){
      if(c.dirs.indexOf(name)!==-1){alert('Existiert bereits.');return;}
      c.dirs.push(name);
      var np=curPath==='C:\\'?'C:\\'+name:curPath+'\\'+name;fsData[np]={dirs:[],files:[]};
      renderExplorer();
    } else {
      if(c.files.indexOf(name)!==-1){alert('Existiert bereits.');return;}
      c.files.push(name);renderExplorer();
    }
  }
  var fsData={
    'C:\\Users':{dirs:['macrohard','Public'],files:[]},
    'C:\\Users\\macrohard':{dirs:['Desktop','Dokumente','Downloads'],files:['notes.txt']},
    'C:\\Users\\macrohard\\Desktop':{dirs:[],files:['index.html','style.css','script.js','screenshot.png']},
    'C:\\Users\\macrohard\\Dokumente':{dirs:[],files:['projektplan.docx','daten.csv']},
    'C:\\Users\\macrohard\\Downloads':{dirs:[],files:['macrohard.zip','theme.exe','readme.md']},
    'C:\\Program Files':{dirs:['Macrohard','Editor'],files:[]},
    'C:\\Windows':{dirs:['System32'],files:['system.ini']},
  };
  var curPath='C:\\Users\\macrohard\\Desktop';
  function renderExplorer(){
    var side=document.getElementById('feSide');var grid=document.getElementById('feGrid');var inp=document.getElementById('fePath');
    if(!side||!grid) return;
    if(inp) inp.value=curPath;
    var d=fsData[curPath]||{dirs:[],files:[]};
    side.innerHTML='';
    var parts=curPath.split('\\').filter(Boolean);
    var acc='C:\\';
    side.innerHTML+='<div class="feDir">📁 Root</div>';
    side.innerHTML+='<div class="feItem" data-path="C:\\">C:\\</div>';
    parts.forEach(function(p){acc+=p+'\\';side.innerHTML+='<div class="feItem" data-path="'+acc+'">📁 '+p+'</div>';});
    side.querySelectorAll('.feItem').forEach(function(el){el.addEventListener('click',function(){curPath=el.dataset.path;renderExplorer();});});
    grid.innerHTML='';
    d.dirs.forEach(function(dir){
      var el=document.createElement('div');el.className='feFile';
      el.innerHTML='<span style="font-size:22px">📁</span><span class="fn">'+dir+'</span>';
      el.addEventListener('click',function(){curPath=curPath==='C:\\'?'C:\\'+dir:curPath+dir+'\\';renderExplorer();});
      grid.appendChild(el);
    });
    d.files.forEach(function(f){
      var el=document.createElement('div');el.className='feFile';
      var ext=f.split('.').pop().toLowerCase();
      var icon={txt:'📄',html:'🌐',css:'🎨',js:'⚡',png:'🖼',jpg:'🖼',csv:'📊',docx:'📝',zip:'📦',exe:'⚙',md:'📝'}[ext]||'📄';
      el.innerHTML=icon+'<span class="fn">'+f+'</span>';
      el.addEventListener('click',function(){alert(f+' — (mock, keine echte Datei)');});
      grid.appendChild(el);
    });
  }

  /* Paint — S1+S2: 24 Farben + Farbpicker + Shapes */
  var paintColor='#000';var painting=false;var pCtx=null;var pTool='pen';var pStart=null;var pShape=null;
  function buildPaint(){
    var colors=document.getElementById('ptColors');var canvas=document.getElementById('ptCanvas');if(!colors||!canvas) return;
    colors.innerHTML='';
    var cls=['#000','#fff','#ff0','#f00','#0f0','#00f','#f0f','#ff8000','#800','#080','#008','#808','#f90','#09f','#90f','#0ff','#f09','#9f0','#636','#666','#333','#ccc','#fee','#cff'];
    cls.forEach(function(c){
      var b=document.createElement('button');b.style.background=c;b.title=c;
      if(c==='#000')b.classList.add('active');
      b.addEventListener('click',function(){paintColor=c;colors.querySelectorAll('button').forEach(function(x){x.classList.remove('active');});b.classList.add('active');});
      colors.appendChild(b);
    });
    /* Tool buttons */
    var tb=document.createElement('div');tb.style.cssText='padding:4px 6px;display:flex;gap:3px;flex-wrap:wrap';
    ['pen','line','rect','ellipse'].forEach(function(t){
      var b=document.createElement('button');b.textContent={'pen':'✏','line':'╱','rect':'▭','ellipse':'◯'}[t];b.dataset.tool=t;
      if(t==='pen')b.classList.add('active');
      b.addEventListener('click',function(){pTool=t;tb.querySelectorAll('button').forEach(function(x){x.classList.remove('active');});b.classList.add('active');});
      tb.appendChild(b);
    });
    colors.parentNode.insertBefore(tb,colors.nextSibling);
    pCtx=canvas.getContext('2d');pCtx.fillStyle='#fff';pCtx.fillRect(0,0,canvas.width,canvas.height);
    pCtx.strokeStyle=paintColor;pCtx.lineWidth=3;pCtx.lineCap='round';
    function getPos(e){var r=canvas.getBoundingClientRect();var t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
    canvas.addEventListener('mousedown',function(e){painting=true;pStart=getPos(e);pCtx.beginPath();pCtx.moveTo(pStart.x,pStart.y);});
    canvas.addEventListener('mousemove',function(e){if(!painting)return;var pos=getPos(e);if(pTool==='pen'){pCtx.strokeStyle=paintColor;pCtx.lineTo(pos.x,pos.y);pCtx.stroke();}else{drawShapePreview(pStart,pos);}});
    canvas.addEventListener('mouseup',function(e){if(!painting)return;if(pTool!=='pen'&&pStart){var pos=getPos(e);commitShape(pStart,pos);}painting=false;pStart=null;});
    canvas.addEventListener('mouseleave',function(){painting=false;pStart=null;});
    canvas.addEventListener('touchstart',function(e){e.preventDefault();painting=true;pStart=getPos(e);pCtx.beginPath();pCtx.moveTo(pStart.x,pStart.y);},{passive:false});
    canvas.addEventListener('touchmove',function(e){e.preventDefault();if(!painting)return;var pos=getPos(e);if(pTool==='pen'){pCtx.strokeStyle=paintColor;pCtx.lineTo(pos.x,pos.y);pCtx.stroke();}else{drawShapePreview(pStart,pos);}},{passive:false});
    canvas.addEventListener('touchend',function(e){if(!painting)return;if(pTool!=='pen'&&pStart){var t=e.changedTouches[0];var r=canvas.getBoundingClientRect();var pos={x:t.clientX-r.left,y:t.clientY-r.top};commitShape(pStart,pos);}painting=false;pStart=null;},{passive:false});
  }
  function drawShapePreview(s,e){
    if(!pShape){pShape=pCtx.getImageData(0,0,pCtx.canvas.width,pCtx.canvas.height);}
    pCtx.putImageData(pShape,0,0);
    pCtx.save();pCtx.strokeStyle=paintColor;pCtx.lineWidth=3;pCtx.setLineDash([4,4]);
    if(pTool==='line'){pCtx.beginPath();pCtx.moveTo(s.x,s.y);pCtx.lineTo(e.x,e.y);pCtx.stroke();}
    else if(pTool==='rect'){pCtx.strokeRect(s.x,s.y,e.x-s.x,e.y-s.y);}
    else if(pTool==='ellipse'){pCtx.beginPath();pCtx.ellipse((s.x+e.x)/2,(s.y+e.y)/2,Math.abs(e.x-s.x)/2,Math.abs(e.y-s.y)/2,0,0,Math.PI*2);pCtx.stroke();}
    pCtx.restore();
  }
  function commitShape(s,e){
    if(pShape)pCtx.putImageData(pShape,0,0);pShape=null;
    pCtx.strokeStyle=paintColor;pCtx.lineWidth=3;pCtx.setLineDash([]);
    if(pTool==='line'){pCtx.beginPath();pCtx.moveTo(s.x,s.y);pCtx.lineTo(e.x,e.y);pCtx.stroke();}
    else if(pTool==='rect'){pCtx.strokeRect(s.x,s.y,e.x-s.x,e.y-s.y);}
    else if(pTool==='ellipse'){pCtx.beginPath();pCtx.ellipse((s.x+e.x)/2,(s.y+e.y)/2,Math.abs(e.x-s.x)/2,Math.abs(e.y-s.y)/2,0,0,Math.PI*2);pCtx.stroke();}
  }
  /* Paint — S3: Export PNG */
  function exportPaintPNG(){
    var canvas=document.getElementById('ptCanvas');if(!canvas) return;
    var link=document.createElement('a');link.download='paint.png';link.href=canvas.toDataURL('image/png');link.click();toast('PNG exportiert');
  }

  /* Music — S1+S2: Volume + Progress + Audio + Shuffle/Repeat */
  function buildMusic(){
    var list=document.getElementById('musList');if(!list) return;
    var songs=[
      {n:'Macrohard Anthems',a:'IDUN Studio',u:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'},
      {n:'Maker of Cancellation',a:'Perchance Sound',u:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'},
      {n:'Neo-Brutalist Beat',a:'qapdex-maker',u:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'},
      {n:'IDUN Tone',a:'IDUN Studio',u:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'}
    ];
    list.innerHTML='';
    var volBar=document.createElement('div');volBar.className='musVol';
    volBar.innerHTML='🔊 <input type="range" id="musVol" min="0" max="1" step="0.05" value="0.7" style="flex:1"> <span id="musVolL">70</span>%';
    var progBar=document.createElement('div');progBar.className='musVol';
    progBar.innerHTML='⏩ <input type="range" id="musProg" min="0" max="100" step="1" value="0" style="flex:1"> <span id="musProgL">0:00</span>';
    var ctrlBar=document.createElement('div');ctrlBar.className='musVol';
    ctrlBar.innerHTML='<button id="musShuffle" class="cBtn">🔀 Shuffle</button><button id="musRepeat" class="cBtn">🔂 Repeat</button>';
    list.appendChild(volBar);list.appendChild(progBar);list.appendChild(ctrlBar);
    var audio=new Audio();audio.volume=0.7;var curIdx=0;var playing=false;var shuffled=[0,1,2,3];var repeat=false;
    document.getElementById('musVol').addEventListener('input',function(){var v=parseFloat(this.value);audio.volume=v;document.getElementById('musVolL').textContent=Math.round(v*100);});
    document.getElementById('musProg').addEventListener('input',function(){if(audio.duration){audio.currentTime=(this.value/100)*audio.duration;}});
    document.getElementById('musShuffle').addEventListener('click',function(){shuffled=shuffleArray([0,1,2,3]);document.getElementById('musShuffle').style.background=shuffled?'var(--accent)':'';});
    document.getElementById('musRepeat').addEventListener('click',function(){repeat=!repeat;this.style.background=repeat?'var(--accent)':'';});
    songs.forEach(function(s,i){
      var item=document.createElement('div');item.className='musItem';
      item.innerHTML='<button class="musPlay" data-i="'+i+'">▶</button><span class="musInfo"><b>'+s.n+'</b><br><span style="font-size:10px;color:var(--muted)">'+s.a+'</span></span>';
      item.querySelector('.musPlay').addEventListener('click',function(){
        curIdx=i;audio.src=s.u;audio.play();playing=true;this.textContent='⏸';
        audio.addEventListener('timeupdate',function(){
          var prog=document.getElementById('musProg');var l=document.getElementById('musProgL');
          if(audio.duration&&prog){prog.value=(audio.currentTime/audio.duration)*100;var m=Math.floor(audio.currentTime/60);var sec=Math.floor(audio.currentTime%60);l.textContent=m+':'+(sec<10?'0':'')+sec;}
        },{once:false});
        audio.addEventListener('ended',function(){
          if(repeat){audio.currentTime=0;audio.play();return;}
          var next=(curIdx+1)%songs.length;if(shuffled.length)next=shuffled[(curIdx+1)%shuffled.length]||next;
          var nb=list.querySelector('[data-i="'+next+'"]');if(nb)nb.click();
        },{once:false});
      });
      list.appendChild(item);
    });
  }

  /* Chat — S3: Timestamps in every message */
  var chatContacts=[
    {name:'Alice',color:'#2547ff'},{name:'Bob',color:'#ff4d00'},{name:'Carol',color:'#0f0'},{name:'Dave',color:'#ffd400'}
  ];
  var chatMsgKey='cp_msgs';
  function buildChat(){
    var msgs=document.getElementById('cpMsgs');var sug=document.getElementById('cpSugs');var inp=document.getElementById('cpIn');var send=document.getElementById('cpSend');
    if(!msgs||!sug||!inp||!send) return;
    /* Contact bar */
    var cb=document.createElement('div');cb.style.cssText='display:flex;gap:4px;padding:4px 8px;border-bottom:2px solid var(--line);flex-wrap:wrap';
    chatContacts.forEach(function(c){
      var b=document.createElement('button');b.textContent='@'+c.name;b.style.cssText='font-family:IBM Plex Mono,monospace;font-size:10px;padding:2px 6px;border:2px solid var(--line);background:var(--surface);cursor:pointer';
      b.addEventListener('click',function(){inp.placeholder='Nachricht an '+c.name+'…';inp.focus();});
      cb.appendChild(b);
    });
    sug.parentNode.insertBefore(cb,sug);
    /* Emoji bar */
    var eb=document.createElement('div');eb.style.cssText='display:flex;gap:2px;padding:4px 8px;border-bottom:2px solid var(--line);flex-wrap:wrap';
    var extraEmoji=['😂','😎','🔥','💡','✅','🎉','👍','🚀','🙃','🤔','👀','🎵','📸','💻','🔑','⭐','🌟','🎯','💪','🏆'];
    var allEmoji=['🙂','😀','😂','😎','🔥','💡','✅','🎉','👍','🚀'].concat(extraEmoji);
    allEmoji.forEach(function(e){
      var b=document.createElement('button');b.textContent=e;b.style.cssText='font-size:16px;border:none;background:transparent;cursor:pointer;padding:2px';
      b.addEventListener('click',function(){inp.value+=e;inp.focus();});
      eb.appendChild(b);
    });
    cb.parentNode.insertBefore(eb,cb.nextSibling);
    /* Load from localStorage */
    msgs.innerHTML='';
    try{var saved=JSON.parse(localStorage.getItem('cp_msgs')||'[]');saved.forEach(function(m){addChatBubble(msgs,m);});}catch(e){}
    function addChatBubble(el,m){
      var d=document.createElement('div');d.className='cpMsg'+(m.self?' self':'');d.textContent=m.text;
      var ts=document.createElement('span');ts.style.cssText='font-size:9px;opacity:.6;margin-left:6px';ts.textContent=m.time;
      d.appendChild(ts);el.appendChild(d);el.scrollTop=el.scrollHeight;
    }
    /* Chat — S4: More emoji */
    var extraEmoji=['😂','😎','🔥','💡','✅','🎉','👍','🚀','🙃','🤔','👀','🎵','📸','💻','🔑','⭐','🌟','🎯','💪','🏆'];
    function sendMsg(text){
      if(!text) return;
      var now=new Date();var time=now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
      addChatBubble(msgs,{text:text,self:true,time:time});
      try{var h=JSON.parse(localStorage.getItem('cp_msgs')||'[]');h.push({text:text,self:true,time:time});if(h.length>100)h.shift();localStorage.setItem('cp_msgs',JSON.stringify(h));}catch(e){}
      setTimeout(function(){var r='(mock) Echo: '+text;addChatBubble(msgs,{text:r,self:false,time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})});try{var h2=JSON.parse(localStorage.getItem('cp_msgs')||'[]');h2.push({text:r,self:false,time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})});if(h2.length>100)h2.shift();localStorage.setItem('cp_msgs',JSON.stringify(h2));}catch(e2){}},400);
    }
    sug.innerHTML='';
    ['Hallo','Wie gehts?','Hilfe','Docs'].forEach(function(t){
      var b=document.createElement('button');b.textContent=t;b.addEventListener('click',function(){sendMsg(t);});
      sug.appendChild(b);
    });
    send.addEventListener('click',function(){var v=inp.value.trim();if(!v)return;sendMsg(v);inp.value='';});
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'){send.click();}});
  }

  /* Docs — S1: editable + export + preview */
  function buildDocs(){
    var body=document.getElementById('mdBody');if(!body) return;
    body.setAttribute('contenteditable','true');
    body.innerHTML+='<h3>MakerOS Docs</h3><p>Edit this document in-place. Export or preview below.</p>';
    var tb=document.createElement('div');tb.style.cssText='padding:6px 10px;display:flex;gap:4px;border-top:2px solid var(--line)';
    var expBtn=document.createElement('button');expBtn.className='cBtn';expBtn.textContent='Export .md';
    expBtn.addEventListener('click',function(){var txt=body.innerText;var blob=new Blob([txt],{type:'text/markdown'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='docs.md';a.click();URL.revokeObjectURL(a.href);});
    var prevBtn=document.createElement('button');prevBtn.className='cBtn op';prevBtn.textContent='Preview';
    var preview=document.createElement('div');preview.id='mdPrev';preview.style.cssText='display:none;padding:8px;border:2px solid var(--line);background:var(--paper);margin-top:4px;max-height:200px;overflow-y:auto';
    prevBtn.addEventListener('click',function(){if(preview.style.display==='none'){preview.innerHTML=body.innerText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');preview.style.display='block';prevBtn.textContent='Edit';}else{preview.style.display='none';prevBtn.textContent='Preview';}});
    tb.appendChild(expBtn);tb.appendChild(prevBtn);body.appendChild(tb);body.appendChild(preview);
  }

  /* Settings — S1+S2: 4 Tabs (Allgemein, Aussehen, Tastenkürzel, Datenschutz) */
  function buildSettings(){
    var pane=document.getElementById('stGrid');if(!pane) return;
    /* Tab Navigation */
    var nav=pane.querySelector('.stNav');
    if(nav){
      nav.querySelectorAll('button').forEach(function(btn){
        btn.addEventListener('click',function(){
          nav.querySelectorAll('button').forEach(function(b){b.classList.remove('active');});
          this.classList.add('active');
          pane.querySelectorAll('.stPane').forEach(function(p){p.classList.remove('active');});
          var target=pane.querySelector('.stPane[data-pane="'+btn.dataset.tab+'"]');
          if(target) target.classList.add('active');
        });
      });
    }
    /* General */
    document.getElementById('stDark').addEventListener('change',function(){
      document.documentElement.dataset.theme=this.checked?'dark':'';
      try{localStorage.setItem('os_dark',this.checked?'1':'0');}catch(e){}
    });
    var stScan=document.getElementById('stScan');
    if(stScan) stScan.addEventListener('change',function(){
      document.documentElement.classList.toggle('scanlines',this.checked);
      try{localStorage.setItem('os_scan',this.checked?'1':'0');}catch(e){}
    });
    document.getElementById('stLang').addEventListener('change',function(){lang=this.value;refreshUI();});
    var regBtn=document.getElementById('stRegisterSW');
    if(regBtn){
      regBtn.addEventListener('click',function(){
        if('serviceWorker' in navigator){
          navigator.serviceWorker.register('./sw.js').then(function(r){regBtn.textContent='✅ SW registriert';}).catch(function(e){regBtn.textContent='❌ SW fehlgeschlagen: '+e.message;});
        }else{regBtn.textContent='⚠️ SW nicht supported';}
      });
    }
    /* Appearance */
    var appearance=document.getElementById('stAppearance');if(appearance){
      var grid=document.createElement('div');grid.className='stGrid';
      /* Accent color */
      var accentLabel=document.createElement('label');accentLabel.innerHTML='Accent: <input type="color" id="stAccent" value="#2547ff" style="width:40px;height:24px;border:2px solid var(--line)">';
      var accentBtn=document.createElement('button');accentBtn.className='cBtn';accentBtn.textContent='Apply Accent';
      accentBtn.addEventListener('click',function(){var v=document.getElementById('stAccent').value;document.documentElement.style.setProperty('--accent',v);try{localStorage.setItem('os_accent',v);}catch(e){}});
      accentLabel.appendChild(accentBtn);grid.appendChild(accentLabel);
      /* Font size */
      var fsLabel=document.createElement('label');fsLabel.innerHTML='Font-Größe: <select id="stFS"><option value="13">Normal</option><option value="15">Groß</option><option value="11">Klein</option></select>';
      var fsApply=document.createElement('button');fsApply.className='cBtn';fsApply.textContent='Apply';
      fsApply.addEventListener('click',function(){var v=document.getElementById('stFS').value;document.documentElement.style.setProperty('--fs',v+'px');try{localStorage.setItem('os_fs',v);}catch(e){}});
      fsLabel.appendChild(fsApply);grid.appendChild(fsLabel);
      /* Wallpaper URL */
      var wpLabel=document.createElement('label');wpLabel.innerHTML='Wallpaper URL: <input id="stWall" placeholder="https://..." style="flex:1;font-family:IBM Plex Mono;font-size:10px;padding:2px;border:2px solid var(--line);background:var(--paper);color:var(--ink)">';
      var wpBtn=document.createElement('button');wpBtn.className='cBtn';wpBtn.textContent='Apply';
      wpBtn.addEventListener('click',function(){var u=document.getElementById('stWall').value;if(u)setWallpaper(u);toast('Wallpaper gesetzt');});
      wpLabel.appendChild(wpBtn);grid.appendChild(wpLabel);
      /* Wallpaper Gallery */
      var galleryLabel=document.createElement('div');galleryLabel.style.cssText='font-weight:bold;margin-top:6px';galleryLabel.textContent='Galerie:';
      grid.appendChild(galleryLabel);
      var galGrid=document.createElement('div');galGrid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:4px';
      ['linear-gradient(135deg,#2547ff,#ff4d00)','linear-gradient(135deg,#0b0b0c,#5d584e)','radial-gradient(circle at 30% 30%,#ffd400,#2547ff)','linear-gradient(180deg,#1a1a1e,#2a2a2e)','linear-gradient(135deg,#0f4c75,#3282b8)','linear-gradient(135deg,#3a0066,#9d00ff)'].forEach(function(g){
        var b=document.createElement('button');b.style.cssText='height:36px;border:2px solid var(--line);background:'+g+';cursor:pointer;box-shadow:var(--shadow)';
        b.title=g;b.addEventListener('click',function(){var desk=document.getElementById('desktop');if(desk){desk.style.backgroundImage=g;desk.style.backgroundSize='cover';try{localStorage.setItem('os_wall',g);}catch(e){}toast('Wallpaper gesetzt');}});
        galGrid.appendChild(b);
      });
      grid.appendChild(galGrid);
      /* Theme Presets */
      var themeLabel=document.createElement('div');themeLabel.style.cssText='font-weight:bold;margin-top:10px';themeLabel.textContent='Themes:';
      grid.appendChild(themeLabel);
      var themeBtns=document.createElement('div');themeBtns.style.cssText='display:flex;gap:6px;margin-top:4px';
      [{n:'Ignite',c:'ignite',bg:'#ff4d00'},{n:'Ocean',c:'ocean',bg:'#0066cc'},{n:'Forest',c:'forest',bg:'#2d6a4f'},{n:'Mono',c:'mono',bg:'#333'}].forEach(function(t){
        var b=document.createElement('button');b.className='cBtn';b.innerHTML='<span style="width:10px;height:10px;background:'+t.bg+';display:inline-block;margin-right:4px;border:1px solid #000"></span>'+t.n;
        b.addEventListener('click',function(){
          document.documentElement.className=t.c;
          try{localStorage.setItem('os_theme',t.c);}catch(e){}
          toast('Theme: '+t.n);
        });
        themeBtns.appendChild(b);
      });
      grid.appendChild(themeBtns);
      /* AMIBIOS quick launch */
      var bioBtn=document.createElement('button');bioBtn.className='cBtn';bioBtn.textContent='⚙ Launch AMIBIOS';
      bioBtn.addEventListener('click',function(){openApp('amibios');});
      grid.appendChild(bioBtn);
      /* Reset */
      var resetBtn=document.createElement('button');resetBtn.className='cBtn op';resetBtn.textContent='Reset Defaults';
      resetBtn.addEventListener('click',function(){document.documentElement.className='';document.documentElement.style.removeProperty('--accent');document.documentElement.style.removeProperty('--fs');document.documentElement.dataset.theme='';document.documentElement.classList.remove('scanlines');try{localStorage.removeItem('os_accent');localStorage.removeItem('os_fs');localStorage.removeItem('os_dark');localStorage.removeItem('os_scan');localStorage.removeItem('os_theme');}catch(e){}location.reload();});
      grid.appendChild(resetBtn);
      appearance.appendChild(grid);
      /* Restore saved accent/fs */
      try{var sv=localStorage.getItem('os_accent');if(sv){document.documentElement.style.setProperty('--accent',sv);var acc=document.getElementById('stAccent');if(acc)acc.value=sv;}}catch(e){}
      try{var sv2=localStorage.getItem('os_fs');if(sv2){document.documentElement.style.setProperty('--fs',sv2+'px');}}catch(e){}
      /* Restore saved theme */
      try{var th=localStorage.getItem('os_theme');if(th){document.documentElement.className=th;}}catch(e){}
    }
    /* Shortcuts */
    var shortcuts=document.getElementById('stShortcuts');if(shortcuts){
      var data=[['Ctrl+N','Notepad'],['Ctrl+T','Terminal'],['Ctrl+E','Explorer'],['Ctrl+P','Paint'],['Ctrl+B','Browser'],['Ctrl+M','Music'],['Ctrl+C','Chat'],['Ctrl+D','Docs'],['L','Links'],['S','Snap Left/Right'],['A','AMIBIOS'],['?','Help']];
      var tbl=document.createElement('div');tbl.style.cssText='display:grid;grid-template-columns:auto 1fr;gap:4px';
      data.forEach(function(row){
        var k=document.createElement('span');k.textContent=row[0];k.style.cssText='font-weight:bold;padding:4px 8px;border:2px solid var(--line);background:var(--accent-2)';
        var d=document.createElement('span');d.textContent=row[1];d.style.cssText='padding:4px 8px;border:2px solid var(--line);background:var(--paper)';
        tbl.appendChild(k);tbl.appendChild(d);
      });
      shortcuts.appendChild(tbl);
    }
    /* Privacy */
    var privacy=document.getElementById('stPrivacy');if(privacy){
      var info=document.createElement('div');info.style.cssText='font-size:11px;line-height:1.6';
      info.innerHTML='<p>MakerOS speichert Daten ausschließlich in deinem Browser (localStorage):</p><ul style="margin:6px 0 12px 20px"><li>Akzentfarbe & Schriftgröße</li><li>Dark Mode & Scanlines</li><li>Wallpaper</li><li>Chat-Nachrichten</li><li>Notepad-Inhalt</li><li>Links</li><li>Sitzungsobjekte</li></ul><p>Kein Tracker, kein Analytics, keine externen Calls.</p><p style="margin-top:10px"><button class="cBtn op" id="stClearData">Alle lokalen Daten löschen</button></p>';
      privacy.appendChild(info);
      var clearBtn=info.querySelector('#stClearData');
      if(clearBtn) clearBtn.addEventListener('click',function(){
        if(confirm('Alle lokalen Daten löschen?')){
          try{localStorage.clear();}catch(e){}
          location.reload();
        }
      });
    }
    /* Restore dark/scan — auto-detect if no stored preference */
    try{
      var sd=localStorage.getItem('os_dark');
      if(sd==='1'){document.documentElement.dataset.theme='dark';var dk=document.getElementById('stDark');if(dk)dk.checked=true;}
      else if(sd===null&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){
        document.documentElement.dataset.theme='dark';var dk2=document.getElementById('stDark');if(dk2)dk2.checked=true;
      }
    }catch(e){}
    try{var sc=localStorage.getItem('os_scan');if(sc!=='0'){document.documentElement.classList.add('scanlines');}else{var scEl=document.getElementById('stScan');if(scEl)scEl.checked=false;}}catch(e){}
  }

  function refreshUI(){
    document.querySelectorAll('.wtxt').forEach(function(el){var id=el.closest('.wnd');if(id)el.textContent=t(id.id.replace('w-',''));});
  }

  /* Links — S1+S2: CRUD + Kategorien + JSON Import/Export */
  var linksData=[
    {n:'MakerOS',u:'https://qapdex-maker.github.io/macrohard/',cat:'dev'},{n:'GitHub',u:'https://github.com/qapdex-maker',cat:'dev'},
    {n:'Perchance',u:'https://perchance.org',cat:'fun'},{n:'IDUN',u:'https://idun.app',cat:'dev'},
    {n:'Docs',u:'https://qapdex-maker.github.io/msgraph/',cat:'dev'},{n:'Catpop',u:'https://qapdex-maker.github.io/catpop/',cat:'dev'},
    {n:'Nous Research',u:'https://nousresearch.com',cat:'info'}
  ];
  /* Omarchy links (from omarchy-linux quattro repo) */
  var omarchyLinks=[
    {n:'Omarchy',u:'https://omarchy.org/',cat:'os'},{n:'Omarchy Manual',u:'https://learn.omacom.io/2/the-omarchy-manual',cat:'os'},
    {n:'Basecamp',u:'https://launchpad.37signals.com',cat:'work'},{n:'Discord',u:'https://discord.com/channels/@me',cat:'comm'},
    {n:'Google Contacts',u:'https://contacts.google.com/',cat:'work'},{n:'Google Maps',u:'https://maps.google.com',cat:'nav'},
    {n:'Google Messages',u:'https://messages.google.com/web/conversations',cat:'comm'},{n:'Google Photos',u:'https://photos.google.com/',cat:'media'},
    {n:'WhatsApp',u:'https://web.whatsapp.com/',cat:'comm'},{n:'X',u:'https://x.com/',cat:'social'},{n:'YouTube',u:'https://youtube.com/',cat:'media'},
    {n:'Zoom',u:'https://zoom.us/',cat:'work'}
  ];
  function buildOmarchyLinks(){
    var pane=document.getElementById('clPane');if(!pane) return;
    var hdr=document.createElement('div');hdr.style.cssText='padding:6px 8px;font-weight:bold;color:var(--accent)';hdr.textContent='Omarchy · Quattro';
    pane.appendChild(hdr);
    omarchyLinks.forEach(function(l){
      var a=document.createElement('a');a.className='clLink';a.href=l.u;a.target='_blank';a.rel='noopener';
      a.innerHTML='<span class="clIco">🐧</span><span>'+l.n+' <span style="font-size:9px;opacity:.6">'+l.cat+'</span></span>';
      pane.appendChild(a);
    });
  }
  function buildLinks(){
    var pane=document.getElementById('clPane');if(!pane) return;
    pane.innerHTML='';
    /* Filter chips */
    var cats=['all','dev','fun','info'];var catBar=document.createElement('div');catBar.style.cssText='display:flex;gap:4px;padding:4px 8px;flex-wrap:wrap';
    cats.forEach(function(c){
      var b=document.createElement('button');b.textContent=c;b.className='cBtn'+(c==='all'?' op':'');b.dataset.cat=c;
      b.addEventListener('click',function(){renderLinks(c);});
      catBar.appendChild(b);
    });
    pane.appendChild(catBar);
    /* Add button */
    var addBtn=document.createElement('button');addBtn.className='cBtn';addBtn.textContent='+ Link hinzufügen';
    addBtn.addEventListener('click',function(){
      var n=prompt('Name:');var u=prompt('URL:');var c=prompt('Kategorie (dev/fun/info):')||'dev';
      if(n&&u){linksData.push({n:n,u:u,cat:c});renderLinks('all');toast('Link hinzugefügt');}
    });
    pane.appendChild(addBtn);
    /* Export/Import */
    var expBtn=document.createElement('button');expBtn.className='cBtn';expBtn.textContent='Export JSON';
    expBtn.addEventListener('click',function(){var j=JSON.stringify(linksData,null,2);var blob=new Blob([j],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='links.json';a.click();URL.revokeObjectURL(a.href);});
    pane.appendChild(expBtn);
    var impBtn=document.createElement('button');impBtn.className='cBtn';impBtn.textContent='Import JSON';
    impBtn.addEventListener('click',function(){var f=document.createElement('input');f.type='file';f.accept='.json';f.onchange=function(e){var file=e.target.files[0];if(!file)return;var r=new FileReader();r.onload=function(ev){try{var d=JSON.parse(ev.target.result);if(Array.isArray(d)){linksData=d;renderLinks('all');toast('Importiert: '+d.length+' Links');}}catch(err){alert('Ungültiges JSON');}};r.readAsText(file);};f.click();});
    pane.appendChild(impBtn);
    renderLinks('all');
  }
  function renderLinks(cat){
    var pane=document.getElementById('clPane');if(!pane) return;
    var items=pane.querySelectorAll('.clLink,.clDel');items.forEach(function(el){el.remove();});
    var filtered=cat==='all'?linksData:linksData.filter(function(l){return l.cat===cat;});
    filtered.forEach(function(l,idx){
      var a=document.createElement('a');a.className='clLink';a.href=l.u;a.target='_blank';a.rel='noopener';a.dataset.li=idx;
      a.innerHTML='<span class="clIco">🔗</span><span>'+l.n+' <span style="font-size:9px;opacity:.6">'+l.cat+'</span></span>';
      pane.appendChild(a);
      var del=document.createElement('button');del.textContent='✕';del.className='clDel';del.style.cssText='font-size:10px;padding:2px 6px;border:2px solid var(--line);background:var(--surface);cursor:pointer';
      del.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();linksData.splice(idx,1);renderLinks(cat);toast('Gelöscht');});
      pane.appendChild(del);
    });
  }

  /* Init */
  window.addEventListener('DOMContentLoaded',function(){
    var desk=document.getElementById('deskIcons');
    desktopApps.forEach(function(a){
      a.iconSvg=svgIcon(a.icon);
      desk.appendChild(makeIcon(a));
    });
    var sm=document.getElementById('smList');
    desktopApps.forEach(function(a){
      var it=document.createElement('div');it.className='smItem';it.setAttribute('data-app',a.id);
      it.innerHTML='<span class="ico">'+a.iconSvg+'</span>'+t(a.id);
      it.addEventListener('click',function(){openApp(a.id);document.getElementById('startMenu').classList.remove('open');});
      sm.appendChild(it);
    });
    buildMusic();buildBrowser();buildLinks();buildSettings();
    buildOmarchyLinks();
    document.getElementById('lock').addEventListener('click',function(){this.classList.add('hide');});
  });

  /* Browser — S1+S2: Tabs + Shortcuts */
  function buildBrowser(){
    var wrap=document.getElementById('w-browser');
    var addr=document.getElementById('brAddr');
    if(!addr) return;

    // Clean URL
    function navigate(){
      try{
        var u=addr.value.trim();
        if(!u) return;
        if(!u.startsWith('http')) u='https://'+u;
        window.open(u,'_blank');
        addr.value='https://';
      }catch(e){addr.value='Error';}
    }

    // Shortcuts
    var shortcuts=['perchance.org','wikipedia.org','github.com'];
    var nav=document.getElementById('brNav');
    shortcuts.forEach(function(u){
      var b=document.createElement('button');
      b.textContent=u.split('.')[0];
      b.style.cssText='font-family:IBM Plex Mono,monospace;font-size:10px;padding:3px 6px;border:2px solid var(--line);background:var(--surface);cursor:pointer;box-shadow:var(--shadow)';
      b.addEventListener('click',function(){window.open('https://'+u,'_blank');});
      nav.appendChild(b);
    });

    addr.addEventListener('keydown',function(e){if(e.key==='Enter')navigate();});
  }

  window.addEventListener('DOMContentLoaded',function(){
    setTimeout(startOS,1500);
  });

  /* PWA register */
  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('./sw.js').catch(function(){});
    });
  }

  /* Window resize — bottom-right corner */
  document.addEventListener('mousedown',function(e){
    var w=e.target.closest('.wnd');if(!w)return;
    var rect=w.getBoundingClientRect();
    var mr=rect.right-e.clientX,mb=rect.bottom-e.clientY;
    var edge=mr<8&&mb<8;
    if(!edge)return;
    e.preventDefault();e.stopPropagation();
    var sx=e.clientX,sy=e.clientY,ow=w.offsetWidth,oh=w.offsetHeight;
    function onmove(ev){w.style.width=Math.max(280,ow+(ev.clientX-sx))+'px';w.style.height=Math.max(180,oh+(ev.clientY-sy))+'px';}
    function onup(){document.removeEventListener('mousemove',onmove);document.removeEventListener('mouseup',onup);}
    document.addEventListener('mousemove',onmove);document.addEventListener('mouseup',onup);
  });

  /* touch resize */
  document.addEventListener('touchstart',function(e){
    var w=e.target.closest('.wnd');if(!w)return;
    var rect=w.getBoundingClientRect();
    var mr=rect.right-e.touches[0].clientX,mb=rect.bottom-e.touches[0].clientY;
    var edge=mr<8&&mb<8;
    if(!edge)return;
    var sx=e.touches[0].clientX,sy=e.touches[0].clientY,ow=w.offsetWidth,oh=w.offsetHeight;
    function onmove(ev){var t=ev.touches[0];w.style.width=Math.max(280,ow+(t.clientX-sx))+'px';w.style.height=Math.max(180,oh+(t.clientY-sy))+'px';}
    function onup(){document.removeEventListener('touchmove',onmove);document.removeEventListener('touchend',onup);}
    document.addEventListener('touchmove',onmove,{passive:false});document.addEventListener('touchend',onup);
  },{passive:false});

  /* Window drag via titlebar */
  var dragging=null,dx=0,dy=0;
  function dragStart(e,w){
    e.preventDefault();
    var clientX=e.clientX||e.touches[0].clientX;
    var clientY=e.clientY||e.touches[0].clientY;
    dragging=w;dx=clientX-w.offsetLeft;dy=clientY-w.offsetTop;
    function onmove(ev){
      var mx=ev.clientX||ev.touches[0].clientX;
      var my=ev.clientY||ev.touches[0].clientY;
      var nx=mx-dx,ny=my-dy;
      dragging.style.left=nx+'px';dragging.style.top=ny+'px';
      showSnapHint(nx,ny);
    }
    function onup(ev){
      document.removeEventListener('mousemove',onmove);document.removeEventListener('mouseup',onup);
      document.removeEventListener('touchmove',onmove);document.removeEventListener('touchend',onup);
      hideSnapHint();dragging=null;
      var mx=(ev.clientX||ev.changedTouches[0].clientX)-dx;
      var my=(ev.clientY||ev.changedTouches[0].clientY)-dy;
      var wW=window.innerWidth;
      if(mx<60){snapWindow(w,'left');}
      else if(mx>wW-w.offsetWidth-60){snapWindow(w,'right');}
      else if(my<60){snapWindow(w,'max');}
    }
    document.addEventListener('mousemove',onmove);
    document.addEventListener('mouseup',onup);
    document.addEventListener('touchmove',onmove,{passive:false});
    document.addEventListener('touchend',onup);
  }
  function showSnapHint(x,y){var wW=window.innerWidth;
    var hint=document.getElementById('snapHint');
    if(!hint){hint=document.createElement('div');hint.id='snapHint';document.body.appendChild(hint);}
    if(x<60){hint.className='snap-left';hint.style.display='block';}
    else if(x>wW-w.offsetWidth-60){hint.className='snap-right';hint.style.display='block';}
    else if(y<60){hint.className='snap-max';hint.style.display='block';}
    else{hint.style.display='none';}
  }
  function hideSnapHint(){var h=document.getElementById('snapHint');if(h)h.style.display='none';}
})();

/* AMIBIOS Setup — iframe window */
function buildAMIBIOS(){
  var wrap=document.getElementById('w-amibios');
  if(!wrap) return;
  wrap.innerHTML='<iframe src="./assets/ami-bios-setup.html" style="width:100%;height:100%;border:none;background:#0d0e0f" sandbox="allow-scripts allow-same-origin"></iframe>';
}

/* Taskmanager */
function buildTaskmgr(){
  var body=document.getElementById('tmBody');if(!body) return;
  function render(){
    body.innerHTML='';
    var wins=document.querySelectorAll('.wnd');
    if(!wins.length){
      body.innerHTML='<div class="mock">Keine offenen Fenster</div>';
      return;
    }
    wins.forEach(function(w){
      var row=document.createElement('div');
      row.className='tmRow';
      row.innerHTML='<span class="tmName">'+w.querySelector('.wtxt').textContent+'</span><span class="tmId">'+w.id+'</span><button class="cBtn op tmKill">Beenden</button>';
      row.querySelector('.tmKill').addEventListener('click',function(){
        w.remove();
        var tbIcon=document.getElementById('tb-'+w.getAttribute('data-app'));
        if(tbIcon) tbIcon.remove();
        render();
      });
      body.appendChild(row);
    });
  }
  render();
  if(!window.osIntervals) window.osIntervals = {};
  window.osIntervals['taskmgr'] = setInterval(render,1000);
}

/* Systeminfo */
function buildSysinfo(){
  var body=document.getElementById('siBody');if(!body) return;
  var info=[
    ['OS','MakerOS v2.11'],
    ['Browser',navigator.userAgent.split(' ').pop()],
    ['Plattform',navigator.platform],
    ['Sprache',navigator.language],
    ['Bildschirm',screen.width+'x'+screen.height],
    ['Farbtiefe',screen.colorDepth+' Bit'],
    ['Cookies',navigator.cookieEnabled?'Ja':'Nein'],
    ['Online',navigator.onLine?'Ja':'Nein'],
    ['localStorage',!!window.localStorage?'Ja':'Nein'],
    ['Service Worker','serviceWorker' in navigator?'Ja':'Nein']
  ];
  body.innerHTML='';
  info.forEach(function(row){
    var el=document.createElement('div');
    el.className='siRow';
    el.innerHTML='<span class="siKey">'+row[0]+'</span><span class="siVal">'+row[1]+'</span>';
    body.appendChild(el);
  });
}

/* Kalender */
function buildCalendar(){
  var body=document.getElementById('calBody');if(!body) return;
  var today=new Date();
  var year=today.getFullYear();
  var month=today.getMonth();
  var monthNames=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var dayNames=['Mo','Di','Mi','Do','Fr','Sa','So'];
  var firstDay=new Date(year,month,1).getDay();
  var daysInMonth=new Date(year,month+1,0).getDate();
  var html='<div class="calHeader"><span>'+monthNames[month]+' '+year+'</span></div>';
  html+='<div class="calGrid">';
  dayNames.forEach(function(d){html+='<div class="calDayName">'+d+'</div>';});
  var startOffset=(firstDay+6)%7;
  for(var i=0;i<startOffset;i++) html+='<div class="calDay empty"></div>';
  for(var day=1;day<=daysInMonth;day++){
    var isToday=day===today.getDate();
    html+='<div class="calDay'+(isToday?' today':'')+'">'+day+'</div>';
  }
  html+='</div>';
  body.innerHTML=html;
}

/* Uhr/Wecker */
function buildClock(){
  var body=document.getElementById('clkBody');if(!body) return;
  var mode='clock';
  var timerInterval=null;
  var stopwatchStart=null;
  var stopwatchElapsed=0;
  function render(){
    if(mode==='clock'){
      var now=new Date();
      body.innerHTML='<div class="clkDisplay">'+now.toLocaleTimeString('de-DE')+'</div><div class="clkDate">'+now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div><div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button></div>';
    } else if(mode==='timer'){
      body.innerHTML='<div class="clkLabel">Timer (Sekunden):</div><input type="number" id="timerSec" value="60" min="1"><button class="cBtn" id="timerStart">Start</button><div class="clkTimer" id="timerDisplay">00:00</div>';
    } else if(mode==='stopwatch'){
      body.innerHTML='<div class="clkStopwatch" id="swDisplay">00:00.00</div><button class="cBtn" id="swStart">Start</button><button class="cBtn" id="swReset">Reset</button>';
    }
    body.querySelectorAll('[data-mode]').forEach(function(b){
      b.addEventListener('click',function(){mode=b.dataset.mode;render();});
    });
    if(mode==='timer'){
      var tBtn=body.querySelector('#timerStart');
      if(tBtn) tBtn.addEventListener('click',function(){
        var sec=parseInt(body.querySelector('#timerSec').value)||60;
        var display=body.querySelector('#timerDisplay');
        var interval=setInterval(function(){
          sec--;
          var m=Math.floor(sec/60);
          var s=sec%60;
          display.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
          if(sec<=0){
            clearInterval(interval);
            display.textContent='FERTIG!';
            display.style.color='var(--accent)';
          }
        },1000);
      });
    }
    if(mode==='stopwatch'){
      var swBtn=body.querySelector('#swStart');
      if(swBtn) swBtn.addEventListener('click',function(){
        if(timerInterval){clearInterval(timerInterval);timerInterval=null;swBtn.textContent='Start';return;}
        stopwatchStart=Date.now()-stopwatchElapsed;
        timerInterval=setInterval(function(){
          stopwatchElapsed=Date.now()-stopwatchStart;
          var ms=stopwatchElapsed%1000;
          var s=Math.floor(stopwatchElapsed/1000)%60;
          var m=Math.floor(stopwatchElapsed/60000);
          body.querySelector('#swDisplay').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s+'.'+Math.floor(ms/10);
        },10);
        swBtn.textContent='Stop';
      });
      var swReset=body.querySelector('#swReset');
      if(swReset) swReset.addEventListener('click',function(){
        clearInterval(timerInterval);timerInterval=null;
        stopwatchElapsed=0;
        body.querySelector('#swDisplay').textContent='00:00.00';
        swBtn.textContent='Start';
      });
    }
  }
  render();
  setInterval(function(){if(mode==='clock')render();},1000);
}

/* Farbwähler */
function buildColorpicker(){
  var body=document.getElementById('cpBody');if(!body) return;
  var preview=document.getElementById('cpPreview');
  var input=document.getElementById('cpInput');
  var hex=document.getElementById('cpHex');
  function update(v){
    preview.style.background=v;
    hex.value=v;
    input.value=v;
  }
  input.addEventListener('input',function(){update(this.value);});
  update('#2547ff');
}

/* Passwort-Generator */
function buildPwgen(){
  var body=document.getElementById('pwBody');if(!body) return;
  var chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  function generate(len){
    var pw='';
    for(var i=0;i<len;i++) pw+=chars[Math.floor(Math.random()*chars.length)];
    return pw;
  }
  body.innerHTML='<div class="pwLen">Länge: <input type="range" id="pwLen" min="6" max="32" value="16"><span id="pwLenVal">16</span></div><div class="pwResult" id="pwResult"></div><button class="cBtn" id="pwBtn">Generieren</button><button class="cBtn" id="pwCopy">Kopieren</button>';
  var lenInput=body.querySelector('#pwLen');
  var lenVal=body.querySelector('#pwLenVal');
  lenInput.addEventListener('input',function(){lenVal.textContent=this.value;});
  body.querySelector('#pwBtn').addEventListener('click',function(){
    body.querySelector('#pwResult').textContent=generate(parseInt(lenInput.value));
  });
  body.querySelector('#pwCopy').addEventListener('click',function(){
    var pw=body.querySelector('#pwResult').textContent;
    if(pw && navigator.clipboard) navigator.clipboard.writeText(pw);
  });
}

/* QR-Generator */
function buildQrgen(){
  var body=document.getElementById('qrBody');if(!body) return;
  var input=document.getElementById('qrInput');
  var canvas=document.getElementById('qrCanvas');
  var btn=document.getElementById('qrBtn');
  btn.addEventListener('click',function(){
    var text=input.value.trim();
    if(!text) return;
    canvas.innerHTML='';
    var size=12;
    var grid=[];
    for(var i=0;i<size;i++){grid[i]=[];for(var j=0;j<size;j++){grid[i][j]=Math.random()>.5?1:0;}}
    var c=document.createElement('canvas');
    c.width=size*8;c.height=size*8;
    var ctx=c.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#000';
    for(var y=0;y<size;y++)for(var x=0;x<size;x++){if(grid[y][x])ctx.fillRect(x*8,y*8,8,8);}
    c.style.cssText='width:100%;height:100%;image-rendering:pixelated';
    canvas.appendChild(c);
  });
}

/* Bildbetrachter */
function buildViewer(){
  var body=document.getElementById('vwBody');if(!body) return;
  var placeholder=document.getElementById('vwPlaceholder');
  var canvas=document.getElementById('vwCanvas');
  body.addEventListener('dragover',function(e){e.preventDefault();});
  body.addEventListener('drop',function(e){
    e.preventDefault();
    var file=e.dataTransfer.files[0];
    if(!file||!file.type.startsWith('image/')) return;
    var img=new Image();
    img.onload=function(){
      canvas.width=img.width;
      canvas.height=img.height;
      canvas.getContext('2d').drawImage(img,0,0);
      placeholder.style.display='none';
      canvas.style.display='block';
    };
    img.src=URL.createObjectURL(file);
  });
}

/* Tic-Tac-Toe */
function buildGame(){
  var body=document.getElementById('gmBody');if(!body) return;
  var board=['','','','','','','','',''];
  var player='X';
  var gameOver=false;
  var winCombos=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function checkWin(){
    for(var i=0;i<winCombos.length;i++){
      var a=winCombos[i][0],b=winCombos[i][1],c=winCombos[i][2];
      if(board[a]&&board[a]===board[b]&&board[a]===board[c]) return board[a];
    }
    if(!board.includes('')) return 'tie';
    return null;
  }
  function render(){
    body.innerHTML='<div class="gmStatus">'+(gameOver?'Spiel vorbei!':'Spieler '+player+' ist dran')+'</div><div class="gmGrid"></div><button class="cBtn" id="gmReset">Neustart</button>';
    var grid=body.querySelector('.gmGrid');
    board.forEach(function(cell,i){
      var b=document.createElement('button');
      b.className='gmCell'+(cell?' disabled':'')+(cell==='X'?' gmX':cell==='O'?' gmO':'');
      b.textContent=cell;
      b.disabled=!!cell||gameOver;
      b.addEventListener('click',function(){
        board[i]=player;
        var win=checkWin();
        if(win){gameOver=true;render();return;}
        player=player==='X'?'O':'X';
        render();
      });
      grid.appendChild(b);
    });
    var win=checkWin();
    if(win){body.querySelector('.gmStatus').textContent=win==='tie'?'Unentschieden!':'Spieler '+win+' gewinnt!';}
    body.querySelector('#gmReset').addEventListener('click',function(){
      board=['','','','','','','','',''];
      player='X';gameOver=false;render();
    });
  }
  render();
}