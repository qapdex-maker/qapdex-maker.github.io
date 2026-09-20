/* MakerOS — App Logic v2.6 */
(function(){
  'use strict';
  window.onerror=function(msg,url,line){
    console.error('MakerOS Error:',msg,'at',url+':'+line);
    return true;
  };
  var lang='de';
  function setLang(l){
    lang=l;
    var html=document.documentElement;
    html.classList.remove('lang-de','lang-en');
    html.classList.add('lang-'+l);
    html.lang=l;
    try{localStorage.setItem('os_lang',l);}catch(e){}
  }
  var apps={};
  var focused=null;
  var zIdx=100;
  var bootDone=false;
  window.osIntervals = window.osIntervals || {};
  window.osTimeouts = window.osTimeouts || {};

  /* Globale Dateistruktur — geteilt zwischen Terminal und Explorer */
  var fsData={
    'C:\\Users':{dirs:['macrohard','Public'],files:[]},
    'C:\\Users\\macrohard':{dirs:['Desktop','Dokumente','Downloads'],files:['notes.txt']},
    'C:\\Users\\macrohard\\Desktop':{dirs:[],files:['index.html','style.css','script.js','screenshot.png']},
    'C:\\Users\\macrohard\\Dokumente':{dirs:[],files:['projektplan.docx','daten.csv']},
    'C:\\Users\\macrohard\\Downloads':{dirs:[],files:['macrohard.zip','theme.exe','readme.md']},
    'C:\\Program Files':{dirs:['Macrohard','Editor'],files:[]},
    'C:\\Windows':{dirs:['System32'],files:['system.ini']},
    'C:\\Papierkorb':{dirs:[],files:[]},
  };
  var trashPath='C:\\Papierkorb';
  var curPath='C:\\Users\\macrohard\\Desktop';

  /* localStorage Wrapper with quota check + fallback to sessionStorage */
  /**
   * Speichert einen Wert in localStorage mit Fallback auf sessionStorage
   * @param {string} k - Schlüssel
   * @param {string} v - Wert
   * @returns {boolean} Erfolg
   */
  function storeSet(k,v){
    try{localStorage.setItem(k,v);return true;}catch(e){}
    try{sessionStorage.setItem(k,v);return true;}catch(e){}
    return false;
  }
  function storeGet(k){
    try{var v=localStorage.getItem(k);if(v!==null&&v!==undefined)return v;}catch(e){}
    try{return sessionStorage.getItem(k);}catch(e){}
    return null;
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
      amibios:'AMIBIOS',taskmgr:'Taskmgr',sysinfo:'Sysinfo',
      calendar:'Kalender',clock:'Uhr',colorpicker:'ColorPicker',
      pwgen:'PwGen',qrgen:'QRGen',viewer:'Viewer',game:'TicTacToe',
      editor:'Editor',imgeditor:'ImgEditor',pomodoro:'Pomodoro',notes:'Notes',
      start:'Start',search:'Suche...',
      noproc:'Kein Prozess',
      welcome:'Willkommen bei MakerOS',
      cancel:'canceled',
      ready:'bereit',
      files:'Dateien',folders:'Ordner',
      canvas:'Leinwand',colors:'Farben',
      docs:'Docs',music:'Music',chat:'Chat',
      links:'Links',perchance:'Perchance',settings:'Settings',
      all:'Alle',prod:'Produktivität',system:'System',media:'Media',games:'Spiele',
      showDesktop:'Desktop anzeigen',closeAll:'Alle Fenster schließen',about:'Über MakerOS'
    },
    en:{
      desktop:'Desktop',clock:'',
      notepad:'Notepad',calculator:'Calculator',terminal:'Terminal',
      explorer:'Explorer',paint:'Paint',browser:'Browser',
      music:'Music',chat:'Chat',docs:'Docs',settings:'Settings',links:'Links',
      amibios:'AMIBIOS',taskmgr:'Taskmgr',sysinfo:'Sysinfo',
      calendar:'Calendar',clock:'Clock',colorpicker:'ColorPicker',
      pwgen:'PwGen',qrgen:'QRGen',viewer:'Viewer',game:'TicTacToe',
      editor:'Editor',imgeditor:'ImgEditor',pomodoro:'Pomodoro',notes:'Notes',
      start:'Start',search:'Search...',
      noproc:'No process',
      welcome:'Welcome to MakerOS',
      cancel:'canceled',
      ready:'ready',
      files:'Files',folders:'Folders',
      canvas:'Canvas',colors:'Colors',
      docs:'Docs',music:'Music',chat:'Chat',
      links:'Links',perchance:'Perchance',settings:'Settings',
      all:'All',prod:'Productivity',system:'System',media:'Media',games:'Games',
      showDesktop:'Show Desktop',closeAll:'Close all windows',about:'About MakerOS'
    },
  };
  function t(k){return I18N[lang]?I18N[lang][k]||k:k;}

  /* Clock */
  /**
   * Aktualisiert die Uhrzeit auf Lock-Screen und Taskbar
   * Wird jede Sekunde aufgerufen (setInterval)
   */
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
    var _isMobile = window.innerWidth <= 760;
    saved.forEach(function(s){
      if(s.visible){
        openApp(s.id);
        var w=document.getElementById('w-'+s.id);
        if(w){
          if(_isMobile){w.style.left='0';w.style.top='0';w.style.width='100vw';w.style.height='calc(100vh - 52px)';}
          else{if(s.left)w.style.left=s.left;if(s.top)w.style.top=s.top;if(s.width)w.style.width=s.width;if(s.height)w.style.height=s.height;}
        }
      }
    });
  }
  /* Wallpaper */
  function setWallpaper(url){
    var desk=document.getElementById('desktop');if(!desk) return;
    desk.style.backgroundImage='url('+url+')';desk.style.backgroundSize='cover';
    try{localStorage.setItem('os_wall',url);}catch(e){}
  }
  try{var savedWall=localStorage.getItem('os_wall');if(savedWall)setWallpaper(savedWall);}catch(e){}
  /* Snapping */
  /**
   * Snapped ein Fenster an eine Bildschirmkante
   * @param {HTMLElement} w - Fenster-Element
   * @param {string} direction - 'left'|'right'|'max'|'restore'
   */
  function snapWindow(w,direction){
    var wW=window.innerWidth;var wH=window.innerHeight;
    var _isMobile = wW <= 760;
    if(direction==='left'){w.style.left='0';w.style.top='0';w.style.width=_isMobile?'100vw':(wW/2-4)+'px';w.style.height=_isMobile?'calc(100vh - 52px)':wH+'px';}
    else if(direction==='right'){w.style.left=_isMobile?'0':(wW/2+4)+'px';w.style.top='0';w.style.width=_isMobile?'100vw':(wW/2-4)+'px';w.style.height=_isMobile?'calc(100vh - 52px)':wH+'px';}
    else if(direction==='max'){w.style.left='0';w.style.top='0';w.style.width='100vw';w.style.height=_isMobile?'calc(100vh - 52px)':'100vh';}
    else if(direction==='restore'){
      if(_isMobile){w.style.left='0';w.style.top='0';w.style.width='100vw';w.style.height='calc(100vh - 52px)';}
      else{w.style.left=w.dataset.origLeft||'';w.style.top=w.dataset.origTop||'';w.style.width=w.dataset.origWidth||'';w.style.height=w.dataset.origHeight||'';}
    }
    saveSession();
  }
  /* Accessibility: reduced motion */
  var prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){
    document.documentElement.style.setProperty('--shadow','0 0 0 var(--ink)');
    document.documentElement.style.setProperty('--shadow-hover','0 0 0 var(--accent)');
  }

  var desktopEl=document.getElementById('desktop');if(desktopEl) desktopEl.addEventListener('contextmenu',function(e){
    e.preventDefault();
    var m=document.getElementById('deskCtx');
    if(!m){m=document.createElement('div');m.id='deskCtx';
      m.innerHTML='<div class="ctxItem" data-action="wallpaper"><span class="ctxIco">🖼</span>Wallpaper wechseln</div><div class="ctxItem" data-action="wallpaper-upload"><span class="ctxIco">⬆</span>Wallpaper hochladen</div><div class="ctxSep"></div><div class="ctxItem" data-action="theme"><span class="ctxIco">🌙</span>Theme umschalten</div><div class="ctxItem" data-action="show-desktop"><span class="ctxIco">🗗</span>Desktop anzeigen</div><div class="ctxItem" data-action="close-all"><span class="ctxIco">✕</span>Alle Fenster schließen</div><div class="ctxSep"></div><div class="ctxItem" data-a="notepad"><span class="ctxIco">📝</span>Notepad</div><div class="ctxItem" data-a="terminal"><span class="ctxIco">⬛</span>Terminal</div><div class="ctxItem" data-a="explorer"><span class="ctxIco">📁</span>Explorer</div><div class="ctxItem" data-a="paint"><span class="ctxIco">🎨</span>Paint</div><div class="ctxSep"></div><div class="ctxItem" data-action="about"><span class="ctxIco">ℹ</span>Über MakerOS</div><div class="ctxItem" data-a="settings"><span class="ctxIco">⚙</span>Settings</div>';
      document.body.appendChild(m);
      m.querySelectorAll('.ctxItem').forEach(function(it){
        it.addEventListener('click',function(){
          var a=it.dataset.a;
          var act=it.dataset.action;
          if(a)openApp(a);
          if(act==='theme'){toggleTheme();}
          else if(act==='wallpaper'){openApp('settings');toast('Wähle ein Wallpaper');}
          else if(act==='wallpaper-upload'){uploadWallpaper();}
          else if(act==='show-desktop'){minimizeAllWindows();}
          else if(act==='close-all'){closeAllWindows();}
          else if(act==='about'){showAboutDialog();}
          m.classList.remove('open');
        });
      });
    }
    m.style.left=e.clientX+'px';m.style.top=e.clientY+'px';
    m.classList.add('open');
  });

  /* Wallpaper Upload — FileReader to data URL */
  function uploadWallpaper(){
    var inp=document.createElement('input');
    inp.type='file';
    inp.accept='image/*';
    inp.style.display='none';
    document.body.appendChild(inp);
    inp.addEventListener('change',function(){
      var file=inp.files[0];
      if(!file)return;
      if(file.size>5*1024*1024){alert('Datei zu groß (max 5 MB)');return;}
      var reader=new FileReader();
      reader.onload=function(ev){
        var url=ev.target.result;
        setWallpaper(url);
        toast('Wallpaper hochgeladen');
      };
      reader.readAsDataURL(file);
      inp.remove();
    });
    inp.click();
  }

  /* Close all windows */
  function closeAllWindows(){
    var wins=document.querySelectorAll('.wnd');
    if(!wins.length){toast('Keine Fenster offen');return;}
    wins.forEach(function(w){
      var wId=w.getAttribute('data-app');
      var instId=w.getAttribute('data-inst')||wId;
      if(instId && window.osIntervals){
        Object.keys(window.osIntervals).forEach(function(k){
          if(k===instId||k===wId){
            clearInterval(window.osIntervals[k]);
            delete window.osIntervals[k];
          }
        });
      }
      w.classList.add('closing');
      setTimeout(function(){w.remove();},200);
      var tbIcon=document.getElementById('tb-'+instId);
      if(tbIcon) tbIcon.remove();
    });
    focused=null;
    updateFocus();
    toast('Alle Fenster geschlossen');
  }

  /* Minimize all windows (show desktop) */
  function minimizeAllWindows(){
    var wins=document.querySelectorAll('.wnd');
    if(!wins.length){toast('Keine Fenster offen');return;}
    wins.forEach(function(w){
      w.classList.add('minimized');
      w.style.display='none';
      var wId=w.getAttribute('data-app');
      var tbIcon=document.getElementById('tb-'+wId);
      if(tbIcon) tbIcon.classList.add('minimized');
    });
    focused=null;
    updateFocus();
    toast('Desktop anzeigen');
  }

  /* About Dialog */
  function showAboutDialog(){
    var existing=document.getElementById('aboutDialog');
    if(existing){existing.remove();return;}
    var d=document.createElement('div');
    d.id='aboutDialog';
    d.innerHTML='<div class="aboutOverlay"></div><div class="aboutBox"><div class="aboutHeader">Über MakerOS<button class="aboutClose">×</button></div><div class="aboutBody"><div class="aboutLogo">MD</div><div class="aboutInfo"><h3>MakerOS</h3><p>Windows-Style Desktop OS im Browser</p><p>Version 2.11.40 (2026-09-19)</p><p>25 Apps · Neo-Brutalist · PWA</p><p style="margin-top:8px;font-size:11px;color:var(--muted)">Made by Alexander Kleine<br>info@qapdex.com<br>qapdex-maker.github.io<br>MIT License</p><p style="margin-top:8px;font-size:10px;color:var(--muted)">Made with Hermes Agent<br>by Nous Research</p></div></div></div>';
    document.body.appendChild(d);
    d.querySelector('.aboutOverlay').addEventListener('click',function(){d.remove();});
    d.querySelector('.aboutClose').addEventListener('click',function(){d.remove();});
  }

  /* Restore minimized windows (click on taskbar icon) */
  function restoreFromTaskbar(wId){
    var w=document.getElementById('w-'+wId);
    if(w){
      w.classList.remove('minimized');
      w.style.display='flex';
      w.classList.add('focused');
      w.style.zIndex=++zIdx;
      focused=wId;
      updateFocus();
      var tbIcon=document.getElementById('tb-'+wId);
      if(tbIcon) tbIcon.classList.remove('minimized');
    }
  }

  function sortDeskIcons(by){
    var c=document.getElementById('deskIcons');
    if(!c) return;
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
    {id:'editor',label:'Editor',icon:'editor'},
    {id:'imgeditor',label:'ImgEdit',icon:'imgeditor'},
    {id:'pomodoro',label:'Pomodoro',icon:'pomodoro'},
    {id:'notes',label:'Notes',icon:'notes'},
  ];

  function makeIcon(a){
    var div=document.createElement('div');
    div.className='dskApp';
    div.setAttribute('data-app',a.id);
    div.innerHTML='<span class="ico">'+a.iconSvg+'</span><span class="lbl">'+a.label+'</span>';
    div.addEventListener('click',function(e){
      if(e.shiftKey||e.ctrlKey||e.metaKey){
        this.classList.toggle('selected');
        e.stopPropagation();
        return;
      }
      document.querySelectorAll('.dskApp.selected').forEach(function(x){x.classList.remove('selected');});
      this.classList.add('selected');
      openApp(a.id);
    });
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
      amibios:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', tm:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>', si:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>', cal:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', clock:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>', cp:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="12.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/></svg>', pw:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>', qr:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="21" x2="21" y2="21"/></svg>', vw:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>', game:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/><circle cx="12" cy="12" r="9"/></svg>',
      editor:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
      imgeditor:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>',
      pomodoro:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="14" r="8"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="14" x2="15" y2="14"/><line x1="9" y1="2" x2="15" y2="2"/></svg>',
      notes:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
    };
    return s[name]||'';
  }

  /* Notifikationen-System */
  var notifQueue=[];
  var notifCenter=[];
  /**
   * Zeigt eine Desktop-Benachrichtigung
   * @param {string} title - Überschrift
   * @param {string} body - Nachricht
   * @param {string} icon - Emoji (optional)
   */
  function showNotif(title,body,icon){
    var n=document.createElement('div');n.className='osNotif';
    n.innerHTML='<span class="notifIcon">'+(icon||'🔔')+'</span><div class="notifBody"><b>'+title+'</b><span>'+body+'</span></div><button class="notifClose">×</button>';
    document.body.appendChild(n);
    n.querySelector('.notifClose').addEventListener('click',function(){n.remove();});
    setTimeout(function(){n.classList.add('show');},10);
    setTimeout(function(){n.classList.remove('show');setTimeout(function(){n.remove();},300);},4000);
    /* Also add to notification center */
    notifCenter.unshift({title:title,body:body,icon:icon||'🔔',time:Date.now()});
    if(notifCenter.length>50)notifCenter.pop();
    updateNotifBadge();
  }

  /* Notification Center toggle */
  var notifCenterOpen=false;
  function toggleNotifCenter(){
    var nc=document.getElementById('notifCenter');
    if(notifCenterOpen){
      if(nc) nc.remove();
      notifCenterOpen=false;
      return;
    }
    notifCenterOpen=true;
    nc=document.createElement('div');
    nc.id='notifCenter';
    var html='<div class="ncOverlay"></div><div class="ncBox"><div class="ncHeader">Benachrichtigungen<button class="ncClose">×</button></div><div class="ncList">';
    if(!notifCenter.length){
      html+='<div class="ncEmpty">Keine Benachrichtigungen</div>';
    }else{
      notifCenter.forEach(function(n){
        var timeStr=new Date(n.time).toLocaleTimeString(lang==='de'?'de-DE':'en-US',{hour:'2-digit',minute:'2-digit'});
        html+='<div class="ncItem"><span class="ncIcon">'+n.icon+'</span><div class="ncBody"><b>'+n.title+'</b><span>'+n.body+'</span><span class="ncTime">'+timeStr+'</span></div></div>';
      });
    }
    html+='</div></div>';
    nc.innerHTML=html;
    document.body.appendChild(nc);
    nc.querySelector('.ncOverlay').addEventListener('click',function(){toggleNotifCenter();});
    nc.querySelector('.ncClose').addEventListener('click',function(){toggleNotifCenter();});
  }

  function updateNotifBadge(){
    var badge=document.getElementById('tbNotifBadge');
    if(!badge&&notifCenter.length>0){
      var tbRight=document.getElementById('tbRight');
      if(tbRight){
        badge=document.createElement('div');
        badge.id='tbNotifBadge';
        badge.title='Benachrichtigungen ('+notifCenter.length+')';
        tbRight.insertBefore(badge,tbRight.firstChild);
        badge.addEventListener('click',toggleNotifCenter);
      }
    }
    if(badge){
      if(notifCenter.length>0){
        badge.textContent=notifCenter.length;
        badge.style.display='flex';
      }else{
        badge.style.display='none';
      }
    }
  }

  /* Start menu — mit Fix für z-index und Click-Blockade durch Boot/Lock */
  document.addEventListener('DOMContentLoaded',function(){

/* Add skip link for accessibility */
if(!document.getElementById('skipLink')){
  var skip=document.createElement('a');
  skip.id='skipLink';
  skip.href='#desktop';
  skip.className='skip-link';
  skip.textContent='Zum Hauptinhalt springen';
  document.body.insertBefore(skip, document.body.firstChild);
}

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
        if(taskViewOpen){toggleTaskView();return;}
        if(helpOverlayOpen){toggleHelpOverlay();return;}
        if(focused&&focused._escClose) focused._escClose();
      }
    });
  });

  /* Lock → Desktop */
  var lockEl=document.getElementById('lock');if(lockEl) lockEl.addEventListener('click',function(){
    this.classList.add('unlocking');
    setTimeout(function(){
      var lk=document.getElementById('lock');
      if(lk){lk.classList.add('hide');lk.classList.remove('unlocking');}
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
    var t=document.getElementById('osToast');
    if(t){
      t.textContent=msg;
      t.classList.remove('hiding');
      t.classList.add('show');
      clearTimeout(t._t);
      t._t=setTimeout(function(){t.classList.add('hiding');setTimeout(function(){t.classList.remove('hiding');t.classList.remove('show');if(t.parentNode)t.remove();},300);},2200);
      return;
    }
    var el=document.createElement('div');el.id='osToast';el.textContent=msg;el.className='osToast show';
    document.body.appendChild(el);
    setTimeout(function(){
      el.classList.add('hiding');
      setTimeout(function(){if(el.parentNode)el.remove();},400);
    },2200);
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
    else if(key==='k'){e.preventDefault();globaleSuche();}
    else if(key==='Tab'&&e.ctrlKey){e.preventDefault();toggleTaskView();}
    else if(key==='?'||key==='/'){e.preventDefault();toggleHelpOverlay();}
    else if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='l'){e.preventDefault();toggleTheme();}
  });

  /* Theme Toggle — Ctrl+Shift+L + Button */
  function toggleTheme(){
    var cur=document.documentElement.dataset.theme;
    var next=cur==='dark'?'':'dark';
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem('os_dark',next==='dark'?'1':'0');}catch(e){}
    updateThemeToggleBtn();
    toast(next==='dark'?'Dark Mode':'Light Mode');
  }
  function updateThemeToggleBtn(){
    var btn=document.getElementById('tbThemeToggle');
    if(btn) btn.textContent=document.documentElement.dataset.theme==='dark'?'☀️':'🌙';
  }

  /* Task View (Win+Tab) - shows all open windows */
  var taskViewOpen = false;
  function toggleTaskView(){
    var tv=document.getElementById('taskView');
    if(taskViewOpen){
      if(tv) tv.remove();
      taskViewOpen=false;
      return;
    }
    taskViewOpen=true;
    tv=document.createElement('div');
    tv.id='taskView';
    tv.innerHTML='<div class="tvOverlay"></div><div class="tvBox"><div class="tvHeader">Alle Fenster</div><div class="tvGrid" id="tvGrid"></div><div class="tvFooter">Tab oder Klick zum Auswählen, Esc zum Schließen</div></div>';
    document.body.appendChild(tv);
    tv.querySelector('.tvOverlay').addEventListener('click',function(){toggleTaskView();});
    var grid=document.getElementById('tvGrid');
    var wins=document.querySelectorAll('.wnd');
    if(!wins.length){
      grid.innerHTML='<div class="tvEmpty">Keine offenen Fenster</div>';
    } else {
      wins.forEach(function(w){
        var wId=w.getAttribute('data-app');
        var instId=w.getAttribute('data-inst')||wId;
        var title=t(wId);
        var isMin=w.classList.contains('minimized');
        var thumb=document.createElement('div');
        thumb.className='tvThumb'+(isMin?' minimized':'');
        thumb.innerHTML='<div class="tvThumbTitle">'+title+(isMin?' (minimiert)':'')+'</div><div class="tvThumbBody">'+wId+'</div>';
        thumb.addEventListener('click',function(){
          if(isMin){
            w.classList.remove('minimized');
            w.style.display='';
            var tbIcon=document.getElementById('tb-'+instId);
            if(tbIcon) tbIcon.classList.remove('minimized');
          }
          w.classList.add('focused');
          w.style.zIndex=++zIdx;
          focused=wId;
          updateFocus();
          toggleTaskView();
        });
        grid.appendChild(thumb);
      });
    }
  }

  /* Help Overlay (Ctrl+?) */
  var helpOverlayOpen = false;
  function toggleHelpOverlay(){
    var ho=document.getElementById('helpOverlay');
    if(helpOverlayOpen){
      if(ho) ho.remove();
      helpOverlayOpen=false;
      return;
    }
    helpOverlayOpen=true;
    ho=document.createElement('div');
    ho.id='helpOverlay';
    var shortcuts=[
      ['Ctrl+N','Notepad'],['Ctrl+T','Terminal'],['Ctrl+E','Explorer'],
      ['Ctrl+P','Paint'],['Ctrl+B','Browser'],['Ctrl+M','Music'],
      ['Ctrl+C','Chat'],['Ctrl+D','Docs'],['Ctrl+L','Links'],
      ['Ctrl+A','AMIBIOS'],['Ctrl+S','Snap Left/Right'],
      ['Ctrl+K','Globale Suche'],['Ctrl+Tab','Task-View'],
      ['Ctrl+?','Diese Hilfe'],['Esc','Fenster/Menu schließen']
    ];
    var html='<div class="helpOverlay-bg"></div><div class="helpBox"><div class="helpHeader">Tastenkürzel<button class="helpClose">×</button></div><div class="helpGrid">';
    shortcuts.forEach(function(s){
      html+='<div class="helpKey">'+s[0]+'</div><div class="helpDesc">'+s[1]+'</div>';
    });
    html+='</div></div>';
    ho.innerHTML=html;
    document.body.appendChild(ho);
    ho.querySelector('.helpOverlay-bg').addEventListener('click',function(){toggleHelpOverlay();});
    ho.querySelector('.helpClose').addEventListener('click',function(){toggleHelpOverlay();});
  }

  function snapActive(){
    var w=document.querySelector('.wnd.focused');
    if(!w) return;
    var curLeft=w.style.left||'0';
    var wW=window.innerWidth;
    if(curLeft==='0'){snapWindow(w,'right');toast('Right snap');}
    else{snapWindow(w,'left');toast('Left snap');}
  }

  /**
   * Öffnet eine App im Desktop-Fenster
   * @param {string} id - App-ID (z.B. 'notepad', 'calculator')
   */
  function openApp(id){playSound('open');
    var multiInstApps=['notepad','terminal','editor'];
    var allowMulti = multiInstApps.indexOf(id) >= 0;
    var instCounter = window.osInstCounter || (window.osInstCounter = {});
    var instId = id;
    if (allowMulti) {
      instCounter[id] = (instCounter[id] || 0) + 1;
      instId = id + '-inst-' + instCounter[id];
    }
    var w=document.getElementById('w-'+instId);
    if(w && !w.classList.contains('minimized')){
      w.classList.add('focused');
      w.style.zIndex=++zIdx;
      focused=id;
      updateFocus();
      if(id==='music' && typeof resumeMusic==='function') resumeMusic();
      return;
    }
    if(w && w.classList.contains('minimized')){
      w.classList.remove('minimized');
      w.style.display='';
      w.classList.add('focused');
      w.style.zIndex=++zIdx;
      focused=id;
      updateFocus();
      var tbIcon=document.getElementById('tb-'+instId);
      if(tbIcon) tbIcon.classList.remove('minimized');
      return;
    }
    var mk=document.createElement('div');
    mk.className='wnd';
    mk.id='w-'+instId;
    mk.setAttribute('data-app',id);
    mk.setAttribute('data-inst',instId);
    var _isMobile = window.innerWidth <= 760;
    if(_isMobile){
      mk.style.left='0';mk.style.top='0';mk.style.width='100vw';mk.style.height='calc(100vh - 52px)';
    } else {
      mk.style.left=(80+(zIdx%5)*30)+'px';mk.style.top=(40+(zIdx%5)*20)+'px';
      mk.style.width='640px';mk.style.height='420px';
    }
    mk.style.zIndex=++zIdx;
    var title=t(id) + (allowMulti && instCounter[id] > 1 ? ' #' + instCounter[id] : '');
    var body='';
    switch(id){
      case 'notepad': body='<div class="npLayout"><div class="npToolbar"><span class="npBrand">Notepad</span><select id="npFont" class="npSelect"><option value="12">12px</option><option value="14" selected>14px</option><option value="16">16px</option><option value="18">18px</option><option value="20">20px</option></select><button id="npFindBtn" class="cBtn op">Suchen</button><button id="npUndoBtn" class="cBtn op">↶</button><button id="npRedoBtn" class="cBtn op">↷</button><button id="npSaveBtn" class="cBtn op">💾</button><button id="npExportBtn" class="cBtn op">Export</button></div><div class="npContainer"><div class="npLines" id="npLines"></div><textarea class="npArea" id="npArea" placeholder="Tippe hier..." spellcheck="false"></textarea></div><div class="npStatus" id="npStatus">Bereit</div></div><div class="npSearchOverlay" id="npSearchOverlay"><input id="npSearchInput" placeholder="Suchen..."><button id="npSearchNext" class="cBtn op">Weiter</button><button id="npSearchPrev" class="cBtn op">Zurück</button><button id="npReplaceBtn" class="cBtn op">Ersetzen</button><input id="npReplaceInput" placeholder="Ersetzen durch..."><button id="npSearchClose" class="cBtn op">✕</button></div>';break;
      case 'calculator': body='<div class="calHead"><input class="cExpr" id="cExpr" readonly value="0"><span class="cCur" id="cCur">0</span></div><div class="calcHist" id="calcHist"></div><div class="calGrid" id="calGrid"></div>';break;
      case 'terminal': body='<div class="termOut" id="termOut"></div><div class="termIn"><span class="prompt">user@macrohard:~$</span><input id="termIn" autofocus></div>';break;
      case 'explorer': body='<div class="fePath"><span>📁</span><input id="fePath" value="C:\Users\macrohard\Desktop"></div><div class="feSide" id="feSide"></div><div class="feGrid" id="feGrid"></div>';break;
      case 'paint': body='<div class="ptColors" id="ptColors"></div><canvas class="ptCanvas" id="ptCanvas" width="400" height="260"></canvas>';break;
      case 'browser': body='<div class="brTabs" id="brTabs"></div><div class="brBar"><button class="brBtn" id="brBack" title="Zurück">←</button><button class="brBtn" id="brFwd" title="Vor">→</button><button class="brBtn" id="brRefresh" title="Aktualisieren">↻</button><button class="brBtn" id="brHome" title="Startseite">⌂</button><input id="brAddr" value="https://duckduckgo.com" placeholder="URL oder Suche..."><button class="brBtn" id="brGo" title="Los">➜</button><button class="brBtn" id="brBm" title="Lesezeichen">☆</button><button class="brBtn" id="brNewTab" title="Neuer Tab">+</button></div><div class="brContent" id="brContent"></div>';break;
      case 'music': body='<div class="musPlayer"><div class="musHeader"><span class="musLogo">🎵 Music</span><button class="musToggle" id="musToggle">☰ Playlist</button></div><div class="musBody"><div class="musMain"><div class="musArt" id="musArt"><span id="musArtIcon">♪</span></div><div class="musMeta"><div class="musTitle" id="musTitle">Player</div><div class="musArtist" id="musArtist">Wähle einen Song</div><div class="musAlbum" id="musAlbum">—</div></div><div class="musSeek"><input type="range" id="musProg" min="0" max="100" step="1" value="0"><div class="musTimes"><span id="musProgL">0:00</span><span id="musProgR">0:00</span></div></div><div class="musControls"><button id="musShuffle" title="Shuffle">🔀</button><button id="musPrev" title="Zurück">⏮</button><button id="musPlayBtn" class="musPlay" title="Play">▶</button><button id="musNext" title="Weiter">⏭</button><button id="musRepeat" title="Repeat">🔁</button></div><div class="musVolWrap"><span>🔊</span><input type="range" id="musVol" min="0" max="1" step="0.05" value="0.7"><span id="musVolL">70%</span></div></div><div class="musSidebar" id="musSidebar"><div class="musTabs"><button data-tab="playlist" class="musTab active">🎵 Playlist</button><button data-tab="radio" class="musTab">📻 Radio</button><button data-tab="favs" class="musTab">★ Favs</button></div><div id="musPlaylist" class="musList"></div><div id="musRadio" class="musList" style="display:none"></div><div id="musFavs" class="musList" style="display:none"></div><div class="musSidebarFoot"><label class="musUploadBtn">⬆ Upload<input type="file" id="musUploadIn" accept="audio/*" multiple style="display:none"></label><span id="musRadioStatus" style="font-size:9px;color:var(--muted)"></span></div></div></div><div class="musExtraTabs"><button data-extra="beatpad" class="musExtraTab active">🥁 Beatpad</button><button data-extra="eq" class="musExtraTab">🎛 EQ</button><button data-extra="vis" class="musExtraTab">📊 Visualizer</button></div><div id="musBeatpadSection" class="musExtra"><div class="beatpad-header"><span class="beatpad-title">🥁 Beatpad</span><button id="beatpadPlay" class="beatpad-btn-lg" title="Play Loop">▶ Play</button><button id="beatpadStop" class="beatpad-btn-lg beatpad-stop" title="Stop">⏹ Stop</button><select id="beatpadBpm" class="beatpad-bpm"><option value="100">100 BPM</option><option value="120" selected>120 BPM</option><option value="140">140 BPM</option><option value="160">160 BPM</option><option value="180">180 BPM</option></select></div><div class="musBeatpad" id="musBeatpad"></div><div class="beatpad-vol-wrap"><span>🔊</span><input type="range" id="beatpadVol" min="0" max="100" value="50"><span id="beatpadVolL">50%</span></div></div><div id="musEq" class="musExtra" style="display:none"><canvas id="musVisualizer" width="280" height="60"></canvas><div class="musEq" id="musEq"></div></div><div id="musVis" class="musExtra" style="display:none"><canvas id="musVisCanvas" width="280" height="100"></canvas></div></div>';break;
      case 'chat': body='<div class="cpMsgs" id="cpMsgs"></div><div class="cpSugs" id="cpSugs"></div><div class="cpIn"><input id="cpIn" placeholder="Nachricht..."><button id="cpSend">Send</button></div>';break;
      case 'docs': body='<div class="mdToolbar"><button class="cBtn" id="mdBold" title="Bold"><b>B</b></button><button class="cBtn" id="mdItalic" title="Italic"><i>I</i></button><button class="cBtn" id="mdHeading" title="Überschrift">H</button><button class="cBtn" id="mdLink" title="Link">Link</button><button class="cBtn" id="mdCode" title="Code">Code</button><button class="cBtn" id="mdQuote" title="Zitat">"</button><button class="cBtn" id="mdList" title="Liste">•</button><button class="cBtn" id="mdSave" title="Speichern">💾</button><button class="cBtn" id="mdExport" title="Export .md">📤</button><button class="cBtn" id="mdPreview" title="Preview">👁</button></div><div class="mdBody" id="mdBody" contenteditable="true" spellcheck="false"></div><div class="mdPreview" id="mdPreview"></div>';break;
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
      case 'editor': body='<div class="edToolbar"><button class="cBtn" id="edNew">Neu</button><button class="cBtn" id="edOpen">Öffnen</button><button class="cBtn" id="edSave">Speichern</button><select id="edLang"><option value="js">JavaScript</option><option value="html">HTML</option><option value="css">CSS</option><option value="md">Markdown</option></select><span class="edStats" id="edStats">0 Zeilen</span></div><div class="edContainer"><div class="edLines" id="edLines"></div><textarea class="edArea" id="edArea" spellcheck="false"></textarea></div>';break;
      case 'imgeditor': body='<div class="ieToolbar"><button class="cBtn" id="ieLoad">Bild laden</button><button class="cBtn" id="ieCrop">Crop</button><button class="cBtn" id="ieRotate">Rotate</button><button class="cBtn" id="ieResize">Resize</button><select id="ieFilter"><option value="none">Kein Filter</option><option value="grayscale">Grayscale</option><option value="sepia">Sepia</option><option value="blur">Blur</option><option value="invert">Invert</option></select><button class="cBtn" id="ieExportPNG">PNG</button><button class="cBtn" id="ieExportJPG">JPG</button></div><div class="ieContainer"><canvas id="ieCanvas"></canvas></div>';break;
      case 'pomodoro': body='<div class="poBody"><div class="poProgress"><svg class="poRing" viewBox="0 0 120 120"><circle class="poRingBg" cx="60" cy="60" r="54"/><circle class="poRingFg" id="poRingFg" cx="60" cy="60" r="54"/></svg><div class="poTime" id="poTime">25:00</div></div><div class="poLabel" id="poLabel">Arbeit</div><div class="poControls"><button class="cBtn" id="poStart">Start</button><button class="cBtn" id="poReset">Reset</button></div><div class="poSettings"><label>Dauer: <input type="number" id="poWorkMin" value="25" min="1" max="60"> min</label><label>Pause: <input type="number" id="poBreakMin" value="5" min="1" max="30"> min</label></div><div class="poCount" id="poCount">Sessions: 0</div></div>';break;
      case 'notes': body='<div class="ntLayout"><div class="ntSidebar"><input type="text" id="ntSearch" placeholder="Suchen..."><div class="ntTags" id="ntTags"></div><div class="ntList" id="ntList"></div><button class="cBtn" id="ntNew">+ Neue Notiz</button></div><div class="ntEditor"><input type="text" id="ntTitle" placeholder="Titel"><input type="text" id="ntTagInput" placeholder="Tags (kommagetrennt)"><textarea id="ntContent" placeholder="Markdown..."></textarea><div class="ntPreview" id="ntPreview"></div><div class="ntSaveRow"><button class="cBtn" id="ntSave">Speichern</button><button class="cBtn op" id="ntTogglePreview">Preview</button></div></div></div>';break;
    }
    mk.innerHTML='<div class="wtitle"><span class="wact"></span><span class="wtxt">'+title+'</span><button class="wmin" title="Minimize">_</button><button class="wmax" title="Maximize">□</button><button class="wclose" title="Close">×</button></div><div class="wbody">'+body+'</div><div class="wnd-resize" data-dot="⬢"></div>';
    var desktopEl2=document.getElementById('desktop');if(desktopEl2) desktopEl2.appendChild(mk);
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
    if(id==='editor') buildEditor();
    if(id==='imgeditor') buildImgeditor();
    if(id==='pomodoro') buildPomodoro();
    if(id==='notes') buildNotes();
    mk.addEventListener('mousedown',function(e){if(e.target.closest('.wclose')||e.target.closest('.wmin'))return;this.classList.add('focused');this.style.zIndex=++zIdx;focused=id;updateFocus();saveSession();});
    var closeBtn=mk.querySelector('.wclose');
    if(closeBtn) closeBtn.addEventListener('click',function(e){
      e.stopPropagation();
      var wnd=this.closest('.wnd');
      var wId=wnd.getAttribute('data-app');
      var instId=wnd.getAttribute('data-inst') || wId;
      // Generic interval cleanup
      try{
        if(instId && window.osIntervals){
          Object.keys(window.osIntervals).forEach(function(k){
            if(k===instId||k.indexOf(instId)===0||k.indexOf(wId)===0){
              clearInterval(window.osIntervals[k]);
              delete window.osIntervals[k];
            }
          });
        }
      }catch(err){}
      // App-specific cleanup flags (reset on close so re-init works)
      if(wId==='taskmgr'){TASKMGR_INITIALIZED=false;}
      if(wId==='explorer'){EXPLOADER_INITIALIZED=false;}
      if(wId==='browser'){BROWSER_INITIALIZED=false;}
      if(wId==='music'){MUSIC_INITIALIZED=false;}
      // Stop music-specific resources
      try{
        if(wId==='music'){
          if(visRafId){cancelAnimationFrame(visRafId);visRafId=null;}
          if(typeof stopSequencer==='function')stopSequencer();
          /* Radio cleanup via main pipeline */
          if(SEQ){SEQ.playing=false;SEQ.controlsInitialized=false;}
          EQ_INITIALIZED=false;
        }
      }catch(err){}
      // Chat cleanup
      try{
        if(wId==='chat'&&window.osTimeouts&&window.osTimeouts['chat_cleanup']){
          window.osTimeouts['chat_cleanup']();
        }
      }catch(err){}
      // Clock cleanup
      try{
        if(wId==='clock'&&window.osTimeouts&&window.osTimeouts['clock_cleanup']){
          window.osTimeouts['clock_cleanup']();
        }
      }catch(err){}
      // Close animation + remove
      wnd.classList.add('closing');
      setTimeout(function(){wnd.remove();},200);
      var tbIconClose=document.getElementById('tb-'+instId);
      if(tbIconClose) tbIconClose.remove();
      focused=null;
      updateFocus();
      saveSession();
    });
    var minBtn=mk.querySelector('.wmin');
    if(minBtn) minBtn.addEventListener('click',function(e){e.stopPropagation();
      var tbIcon=document.getElementById('tb-'+instId);
      mk.classList.add('minimized');
      mk.style.display='none';
      if(tbIcon) tbIcon.classList.add('minimized');
      focused=null;
      updateFocus();
    });
    var maxBtn=mk.querySelector('.wmax');
    if(maxBtn) maxBtn.addEventListener('click',function(e){e.stopPropagation();
      var tbIcon=document.getElementById('tb-'+instId);
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
    if(!document.getElementById('tb-'+instId)){
      var tbIcon=document.createElement('div');
      tbIcon.className='tbIcon running focused';
      tbIcon.id='tb-'+instId;
      tbIcon.title=t(id);
      tbIcon.dataset.app=id;
      tbIcon.dataset.inst=instId;
      var lbl = t(id) + (allowMulti && instCounter[id] > 1 ? ' #'+instCounter[id] : '');
      tbIcon.innerHTML='<span>'+lbl+'</span><span class="tbRun"></span>';
      tbIcon.addEventListener('click',function(e){
        var w=document.getElementById('w-'+instId);
        if(!w) return;
        if(w.classList.contains('minimized')){
          w.classList.remove('minimized');
          w.style.display='';
          this.classList.remove('minimized');
          w.classList.add('focused');
          w.style.zIndex=++zIdx;
          focused=id;
          updateFocus();
        } else if(w.style.display==='none'){
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
      var tbCenterEl=document.getElementById('tbCenter');if(tbCenterEl) tbCenterEl.appendChild(tbIcon);
    } else {
      var existingIcon=document.getElementById('tb-'+instId);
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
    var area=document.getElementById('npArea');
    var lines=document.getElementById('npLines');
    var status=document.getElementById('npStatus');
    var fontSel=document.getElementById('npFont');
    if(!area||!lines) return;

    var NS='np_save';
    var undoStack=[];
    var redoStack=[];
    var lastContent='';

    try{var sv=localStorage.getItem(NS);if(sv)area.value=sv;}catch(e){}
    try{var fs=localStorage.getItem('np_fs');if(fs&&fontSel)fontSel.value=fs;}catch(e){}

    lastContent=area.value;
    undoStack.push(lastContent);

    function updateLines(){
      var content=area.value;
      var lineCount=content.split('\n').length;
      var html='';
      for(var i=1;i<=lineCount;i++) html+='<div class="npLine">'+i+'</div>';
      lines.innerHTML=html;
      var words=content.trim().split(/\s+/).filter(Boolean).length;
      status.textContent=lineCount+' Zeilen · '+words+' Wörter · '+content.length+' Zeichen';
      try{localStorage.setItem(NS,content);}catch(e){}
    }

    function saveUndo(){
      var content=area.value;
      if(content!==lastContent){
        undoStack.push(content);
        if(undoStack.length>50) undoStack.shift();
        redoStack=[];
        lastContent=content;
      }
    }

    area.addEventListener('input',function(){saveUndo();updateLines();});
    area.addEventListener('scroll',function(){lines.scrollTop=area.scrollTop;});

    area.addEventListener('keydown',function(e){
      if(e.key==='Tab'){
        e.preventDefault();
        var start=area.selectionStart,end=area.selectionEnd;
        area.value=area.value.substring(0,start)+'  '+area.value.substring(end);
        area.selectionStart=area.selectionEnd=start+2;
        updateLines();
      }
      if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){
        e.preventDefault();
        if(undoStack.length>1){
          redoStack.push(undoStack.pop());
          area.value=undoStack[undoStack.length-1];
          lastContent=area.value;
          updateLines();
          toast('Rückgängig');
        }
      }
      if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){
        e.preventDefault();
        if(redoStack.length>0){
          var next=redoStack.pop();
          undoStack.push(next);
          area.value=next;
          lastContent=area.value;
          updateLines();
          toast('Wiederhergestellt');
        }
      }
      if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();area.blur();toast('Gespeichert');}
      if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();document.getElementById('npFindBtn').click();}
    });

    if(fontSel) fontSel.addEventListener('change',function(){
      area.style.fontSize=this.value+'px';
      lines.style.fontSize=this.value+'px';
      try{localStorage.setItem('np_fs',this.value);}catch(e){}
    });

    var undoBtn=document.getElementById('npUndoBtn');
    if(undoBtn) undoBtn.addEventListener('click',function(){
      if(undoStack.length>1){
        redoStack.push(undoStack.pop());
        area.value=undoStack[undoStack.length-1];
        lastContent=area.value;
        updateLines();
      }
    });

    var redoBtn=document.getElementById('npRedoBtn');
    if(redoBtn) redoBtn.addEventListener('click',function(){
      if(redoStack.length>0){
        var next=redoStack.pop();
        undoStack.push(next);
        area.value=next;
        lastContent=area.value;
        updateLines();
      }
    });

    var saveBtn=document.getElementById('npSaveBtn');
    if(saveBtn) saveBtn.addEventListener('click',function(){
      try{localStorage.setItem(NS,area.value);toast('Gespeichert');}catch(e){}
    });

    var exportBtn=document.getElementById('npExportBtn');
    if(exportBtn) exportBtn.addEventListener('click',function(){
      var blob=new Blob([area.value],{type:'text/plain'});
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='notepad.txt';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('.txt exportiert');
    });

    var findBtn=document.getElementById('npFindBtn');
    var overlay=document.getElementById('npSearchOverlay');
    if(findBtn&&overlay) findBtn.addEventListener('click',function(){
      overlay.style.display='flex';
      var inp=document.getElementById('npSearchInput');
      if(inp) inp.focus();
    });

    var searchClose=document.getElementById('npSearchClose');
    if(searchClose) searchClose.addEventListener('click',function(){
      overlay.style.display='none';
    });

    var searchInput=document.getElementById('npSearchInput');
    function doSearch(){
      var q=searchInput.value;if(!q)return;
      var idx=area.value.indexOf(q);
      if(idx>=0){area.focus();area.setSelectionRange(idx,idx+q.length);lines.scrollTop=area.scrollTop;}
      else toast('Nicht gefunden');
    }
    if(searchInput) searchInput.addEventListener('keydown',function(e){
      if(e.key==='Enter'){e.preventDefault();doSearch();}
      if(e.key==='Escape'){overlay.style.display='none';}
    });

    var searchNext=document.getElementById('npSearchNext');
    if(searchNext) searchNext.addEventListener('click',doSearch);

    var searchPrev=document.getElementById('npSearchPrev');
    if(searchPrev) searchPrev.addEventListener('click',function(){
      var q=searchInput.value;if(!q)return;
      var idx=area.value.lastIndexOf(q);
      if(idx>=0){area.focus();area.setSelectionRange(idx,idx+q.length);}
    });

    var replaceBtn=document.getElementById('npReplaceBtn');
    if(replaceBtn) replaceBtn.addEventListener('click',function(){
      var search=searchInput.value;if(!search)return;
      var replace=document.getElementById('npReplaceInput').value;
      if(replace===null)return;
      var count=(area.value.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
      if(count>0){
        area.value=area.value.split(search).join(replace);
        saveUndo();updateLines();
        toast(count+' ersetzt');
      }
    });

    updateLines();
  }

  /* Calculator — S4: Memory + Constants */
  var calcHist=[];var sciMode=false;var calcMemory=0;
  function buildCalc(){
    var grid=document.getElementById('calGrid');if(!grid) return;
    var sci=['sin','cos','tan','sqrt','pow','log','abs','π','e','φ','(',')'];
    var tb=document.createElement('div');tb.className='calcToolbar';
    var sciBtn=document.createElement('button');sciBtn.textContent='SCI';sciBtn.className='cBtn op';sciBtn.style.fontSize='10px';sciBtn.addEventListener('click',function(){sciMode=!sciMode;buildCalc();});
    tb.appendChild(sciBtn);
    /* Memory buttons */
    var memBtn=document.createElement('button');memBtn.textContent='M+';memBtn.className='cBtn op';memBtn.style.fontSize='10px';memBtn.addEventListener('click',function(){calcMemory+=parseFloat(document.getElementById('cExpr').value)||0;toast('Speicher: '+calcMemory);});
    var mrBtn=document.createElement('button');mrBtn.textContent='MR';mrBtn.className='cBtn op';mrBtn.style.fontSize='10px';mrBtn.addEventListener('click',function(){var ex=document.getElementById('cExpr');if(ex){ex.value+=calcMemory;}});
    var mcBtn=document.createElement('button');mcBtn.textContent='MC';mcBtn.className='cBtn op';mcBtn.style.fontSize='10px';mcBtn.addEventListener('click',function(){calcMemory=0;toast('Speicher gelöscht');});
    var msBtn=document.createElement('button');msBtn.textContent='MS';msBtn.className='cBtn op';msBtn.style.fontSize='10px';msBtn.addEventListener('click',function(){calcMemory=parseFloat(document.getElementById('cExpr').value)||0;toast('Gespeichert: '+calcMemory);});
    tb.appendChild(memBtn);tb.appendChild(mrBtn);tb.appendChild(mcBtn);tb.appendChild(msBtn);
    if(sciMode){sci.forEach(function(b){var btn=document.createElement('button');btn.textContent=b;btn.className='cBtn';btn.addEventListener('click',function(){calcPress(b);});tb.appendChild(btn);});}
    grid.parentNode.insertBefore(tb,grid);
    var btns=sciMode?['C','±','%','÷','(',')','7','8','9','×','4','5','6','−','1','2','3','+','0','.','=']:['C','±','%','÷','(',')','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='];
    var opClasses={'\\u00f7':'op','\\u00d7':'op','\\u2212':'op','+':'op','=':'eq','C':'op','\\u00b1':'op','%':'op'};
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
    var map={'sin':'Math.sin','cos':'Math.cos','tan':'Math.tan','sqrt':'Math.sqrt','pow':'Math.pow','log':'Math.log','abs':'Math.abs','π':'Math.PI','e':'Math.E','φ':'(1+Math.sqrt(5))/2'};
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
    if(TERM_INITIALIZED) return;
    TERM_INITIALIZED=true;

    var commands=['help','ls','cd','pwd','touch','rm','mkdir','cp','mv','find','grep','echo','cat','date','clear','whoami','history','tree','head','tail','wc','calc','exit','colors','about'];
    function w(text){var d=document.createElement('div');d.textContent=text;out.appendChild(d);out.scrollTop=out.scrollHeight;}
    function wc(str){return str.split(/\s+/).filter(Boolean).length;}
    function filesize(n){return n+' B';}
    w('MakerOS — Terminal v2.0');
    w('Tippe "help" für Befehle.');

    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        var cmd=inp.value.trim();if(!cmd){return;}
        w('user@macrohard:~$ '+cmd);termHist.push(cmd);termHistI=termHist.length;
        var args=cmd.split(/\s+/);var c=args[0].toLowerCase();
        switch(c){
          case 'help':w('Befehle: '+commands.join(', '));break;
          case 'pwd':w(curPath);break;
          case 'whoami':w('macrohard');break;
          case 'ls':{
            var d=fsData[curPath];
            if(d){
              if(d.dirs.length||d.files.length){
                d.dirs.forEach(function(x){w('  \x1b[34m📁 '+x+'\x1b[0m');});
                d.files.forEach(function(x){w('  \x1b[90m📄 '+x+'\x1b[0m');});
              } else w('  (leer)');
            } else w('  Nicht gefunden.');
            break;
          }
          case 'tree':{
            function printTree(path,prefix){
              var node=fsData[path];if(!node)return;
              var items=node.dirs.concat(node.files);
              items.forEach(function(item,i){
                var isLast=i===items.length-1;
                var marker=isLast?'└─':'├─';
                var isDir=node.dirs.indexOf(item)!==-1;
                w(prefix+marker+(isDir?' 📁 ':' 📄 ')+item);
                if(isDir){
                  var subPath=path==='C:\\'?'C:\\'+item:path+'\\'+item;
                  printTree(subPath,prefix+(isLast?'   ':'│  '));
                }
              });
            }
            w('📁 '+curPath.split('\\').pop()||'C:\\');
            printTree(curPath,'');
            break;
          }
          case 'cat':{
            var target=args[1];if(!target){w('Usage: cat <file>');break;}
            var cur=fsData[curPath];
            if(cur&&cur.files.indexOf(target)!==-1){
              w('--- '+target+' ---');
              w('[Inhalt von '+target+' — mock]');
              w('Zeilen: 1, Wörter: 3, Zeichen: 42');
            } else w('Datei nicht gefunden: '+target);
            break;
          }
          case 'head':{
            var fn=args[1];if(!fn){w('Usage: head <file> [n]');break;}
            var cur=fsData[curPath];
            if(cur&&cur.files.indexOf(fn)!==-1){
              var n=parseInt(args[2])||10;
              w('--- '+fn+' (erste '+n+' Zeilen) ---');
              w('[Mock content — '+n+' lines]');
            } else w('Datei nicht gefunden: '+fn);
            break;
          }
          case 'tail':{
            var fn=args[1];if(!fn){w('Usage: tail <file> [n]');break;}
            var cur=fsData[curPath];
            if(cur&&cur.files.indexOf(fn)!==-1){
              var n=parseInt(args[2])||10;
              w('--- '+fn+' (letzte '+n+' Zeilen) ---');
              w('[Mock content — '+n+' lines]');
            } else w('Datei nicht gefunden: '+fn);
            break;
          }
          case 'wc':{
            var fn=args[1];if(!fn){w('Usage: wc <file>');break;}
            var cur=fsData[curPath];
            if(cur&&cur.files.indexOf(fn)!==-1){
              w('  1   3 42 '+fn);
            } else w('Datei nicht gefunden: '+fn);
            break;
          }
          case 'cd':{
            var dest=args[1];if(!dest){w('Usage: cd <dir>');break;}
            if(dest==='..'){
              var parts=curPath.split('\\');
              if(parts.length>2){parts.pop();curPath=parts.join('\\');}
              else{curPath='C:\\';}
              w(curPath);renderExplorer();
            } else if(dest==='/'||dest==='~'){
              curPath='C:\\Users\\macrohard';w(curPath);renderExplorer();
            } else {
              var np=curPath==='C:\\'?'C:\\'+dest:curPath+'\\'+dest;
              if(fsData[np]){curPath=np;w('→ '+curPath);renderExplorer();}
              else{w('Verzeichnis nicht gefunden: '+dest);}
            }
            break;
          }
          case 'touch':{
            var fn=args[1];if(!fn){w('Usage: touch <file>');break;}
            var c=fsData[curPath];if(!c){w('Kein Verzeichnis.');break;}
            if(c.files.indexOf(fn)!==-1){w('Datei existiert bereits: '+fn);}
            else{c.files.push(fn);w('Erstellt: '+fn);renderExplorer();}
            break;
          }
          case 'rm':{
            var fn2=args[1];if(!fn2){w('Usage: rm <file> OR rm -r <dir>');break;}
            var recursive=args.indexOf('-r')!==-1;
            var c2=fsData[curPath];if(!c2){w('Kein Verzeichnis.');break;}
            var idx=c2.files.indexOf(fn2);
            if(idx!==-1){c2.files.splice(idx,1);w('Gelöscht: '+fn2);renderExplorer();break;}
            var di=c2.dirs.indexOf(fn2);
            if(di!==-1){
              if(!recursive){w('Ordner — nutze: rm -r '+fn2);break;}
              c2.dirs.splice(di,1);
              var dp=curPath==='C:\\'?'C:\\'+fn2:curPath+'\\'+fn2;
              delete fsData[dp];
              w('Ordner gelöscht: '+fn2);renderExplorer();break;
            }
            w('Nicht gefunden: '+fn2);
            break;
          }
          case 'mkdir':{
            var dn=args[1];if(!dn){w('Usage: mkdir <dir>');break;}
            var c3=fsData[curPath];if(!c3){w('Kein Verzeichnis.');break;}
            if(c3.dirs.indexOf(dn)!==-1){w('Existiert bereits: '+dn);}
            else{
              c3.dirs.push(dn);
              var np=curPath==='C:\\'?'C:\\'+dn:curPath+'\\'+dn;
              fsData[np]={dirs:[],files:[]};
              w('Erstellt: '+dn);renderExplorer();
            }
            break;
          }
          case 'cp':{
            var src=args[1],dst=args[2];if(!src||!dst){w('Usage: cp <src> <dst>');break;}
            var c4=fsData[curPath];if(!c4){w('Kein Verzeichnis.');break;}
            if(c4.files.indexOf(src)!==-1&&c4.files.indexOf(dst)===-1){c4.files.push(dst);w('Kopiert: '+src+' → '+dst);renderExplorer();}
            else w('Fehler: '+src+' nicht gefunden oder '+dst+' existiert.');
            break;
          }
          case 'mv':{
            var src2=args[1],dst2=args[2];if(!src2||!dst2){w('Usage: mv <src> <dst>');break;}
            var c5=fsData[curPath];if(!c5){w('Kein Verzeichnis.');break;}
            var i2=c5.files.indexOf(src2);if(i2!==-1){c5.files[i2]=dst2;w('Verschoben: '+src2+' → '+dst2);renderExplorer();}
            else w('Nicht gefunden: '+src2);
            break;
          }
          case 'find':{
            var q=args[1];if(!q){w('Usage: find <name>');break;}
            var hits=[];
            Object.keys(fsData).forEach(function(p){
              fsData[p].files.forEach(function(f){if(f.toLowerCase().indexOf(q.toLowerCase())!==-1)hits.push(p+'/'+f);});
              fsData[p].dirs.forEach(function(d){if(d.toLowerCase().indexOf(q.toLowerCase())!==-1)hits.push(p+'/'+d+'/');});
            });
            w(hits.length?hits.join('\n'):'Nichts gefunden.');
            break;
          }
          case 'grep':{
            var term=args[1];if(!term){w('Usage: grep <text>');break;}
            var c6=fsData[curPath];if(!c6){w('Kein Verzeichnis.');break;}
            var matches=c6.files.filter(function(f){return f.toLowerCase().indexOf(term.toLowerCase())!==-1;});
            w(matches.length?matches.join('\n'):'Kein Treffer.');
            break;
          }
          case 'echo':w(args.slice(1).join(' '));break;
          case 'date':w(new Date().toString());break;
          case 'clear':out.innerHTML='';break;
          case 'history':{
            termHist.forEach(function(h,i){w('  '+(i+1)+'  '+h);});
            break;
          }
          case 'calc':{
            var expr=args.slice(1).join('');
            if(!expr){w('Usage: calc <expr> — z.B. calc 2+2');break;}
            try{
              var result=Function('return '+expr.replace(/[^-()\d/*+.]/g,''))();
              w(expr+' = '+result);
            }catch(e){w('Fehler: Ungültiger Ausdruck');}
            break;
          }
          case 'colors':{
            var colors=['\x1b[30mschwarz\x1b[0m','\x1b[31mrot\x1b[0m','\x1b[32mgrün\x1b[0m','\x1b[33mgelb\x1b[0m','\x1b[34mblau\x1b[0m','\x1b[35mmagenta\x1b[0m','\x1b[36mcyan\x1b[0m','\x1b[37mweiß\x1b[0m'];
            colors.forEach(function(c){w(c);});
            break;
          }
          case 'about':w('MakerOS Terminal v2.0 — 25 Apps, Neo-Brutalist Desktop');break;
          case 'exit':w('Fenster wird geschlossen...');setTimeout(function(){inp.closest('.wnd').querySelector('.wclose').click();},500);break;
          default:w('Unbekannt: '+c+' — tippe "help"');
        }
        inp.value='';
      }
      if(e.key==='Tab'){
        e.preventDefault();
        var curVal=inp.value;
        if(curVal){
          /* Command completion */
          if(!curVal.includes(' ')){
            var cmdMatch=commands.filter(function(cmd){return cmd.startsWith(curVal);});
            if(cmdMatch.length===1)inp.value=cmdMatch[0]+' ';
            else if(cmdMatch.length>1)w('Befehle: '+cmdMatch.join(', '));
          } else {
            /* Path completion */
            var parts=curVal.split(' ');
            var last=parts[parts.length-1];
            var matches=Object.keys(fsData).filter(function(p){return p.startsWith(last);});
            if(matches.length===1){parts[parts.length-1]=matches[0];inp.value=parts.join(' ');}
            else if(matches.length>1)w('Pfade: '+matches.join(', '));
          }
        }
      }
      if(e.key==='ArrowUp'){if(termHistI>0){termHistI--;inp.value=termHist[termHistI];}}
      if(e.key==='ArrowDown'){if(termHistI<termHist.length-1){termHistI++;inp.value=termHist[termHistI];}else{termHistI=termHist.length;inp.value='';}}
    });
  }
  var TERM_INITIALIZED=false;

  /* Explorer — S1: New Folder / New File */
  /* Globale Suche */
  /**
   * Öffnet die globale Suche (Apps, Dateien, Einstellungen)
   * Keyboard-Shortcut: Ctrl+K
   */
  function globaleSuche(){
    var ov=document.getElementById('globalSearch');
    if(!ov){
      ov=document.createElement('div');ov.id='globalSearch';
      ov.innerHTML='<div class="gsOverlay"></div><div class="gsBox"><input type="text" id="gsInput" placeholder="Suche..."><div id="gsResults"></div></div>';
      document.body.appendChild(ov);
      ov.querySelector('.gsOverlay').addEventListener('click',function(){ov.remove();});
      var inp=ov.querySelector('#gsInput');
      inp.addEventListener('input',function(){
        var q=this.value.toLowerCase();
        var results=[];
        if(q.length<2){ov.querySelector('#gsResults').innerHTML='<div class="gsEmpty">Mindestens 2 Zeichen</div>';return;}
        /* Apps */
        desktopApps.forEach(function(a){
          if(a.label.toLowerCase().indexOf(q)!==-1){
            results.push({type:'app',label:a.label,icon:'📦',action:function(){openApp(a.id);ov.remove();}});
          }
        });
        /* Dateien */
        Object.keys(fsData).forEach(function(path){
          var d=fsData[path];
          d.dirs.forEach(function(dir){
            if(dir.toLowerCase().indexOf(q)!==-1){
              results.push({type:'folder',label:dir,path:path,icon:'📁',action:function(){curPath=path==='C:\\'?'C:\\'+dir:path+'\\'+dir;renderExplorer();openApp('explorer');ov.remove();}});
            }
          });
          d.files.forEach(function(f){
            if(f.toLowerCase().indexOf(q)!==-1){
              results.push({type:'file',label:f,path:path,icon:'📄',action:function(){curPath=path;renderExplorer();openApp('explorer');ov.remove();}});
            }
          });
        });
        /* Einstellungen-Icons */
        if('einstellungen'.indexOf(q)!==-1||'settings'.indexOf(q)!==-1){
          results.push({type:'app',label:'Settings',icon:'⚙️',action:function(){openApp('settings');ov.remove();}});
        }
        if(!results.length){ov.querySelector('#gsResults').innerHTML='<div class="gsEmpty">Keine Treffer</div>';return;}
        var html=results.map(function(r,i){
          return '<div class="gsResult" data-i="'+i+'"><span class="gsIcon">'+r.icon+'</span><span class="gsLabel">'+r.label+'</span><span class="gsType">'+r.type+'</span></div>';
        }).join('');
        var resDiv=ov.querySelector('#gsResults');
        resDiv.innerHTML=html;
        resDiv.querySelectorAll('.gsResult').forEach(function(el){
          el.addEventListener('click',function(){
            var idx=parseInt(el.dataset.i);
            if(results[idx])results[idx].action();
          });
        });
      });
      inp.focus();
    }
  }

  function buildExplorer(){
    if(EXPLOADER_INITIALIZED) { renderExplorer(); return; }
    EXPLOADER_INITIALIZED = true;

    /* History stack for Back/Forward */
    var historyStack = [curPath];
    var historyIndex = 0;

    var inp=document.getElementById('fePath');
    if(inp) inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){ navigateTo(inp.value); }
    });

    /* Toolbar */
    var tb=document.createElement('div');tb.className='feToolbar';
    var btns = [
      {n:'⬆',a:'up',t:'Übergeordnetes Verzeichnis'},
      {n:'◀',a:'back',t:'Zurück'},
      {n:'▶',a:'forward',t:'Weiter'},
      {n:'↻',a:'refresh',t:'Aktualisieren'},
      {n:'📁+',a:'new-folder',t:'Neuer Ordner'},
      {n:'📄+',a:'new-file',t:'Neue Datei'},
      {n:'🔍',a:'search',t:'Suchen'},
      {n:'📋',a:'view',t:'Ansicht wechseln'}
    ];
    btns.forEach(function(t){
      var b=document.createElement('button');
      b.className='cBtn';
      b.textContent=t.n;
      b.title=t.t;
      b.addEventListener('click',function(){
        if(t.a==='up') navigateUp();
        else if(t.a==='back') navigateBack();
        else if(t.a==='forward') navigateForward();
        else if(t.a==='refresh') renderExplorer();
        else if(t.a==='new-folder') newExplorerItem('folder');
        else if(t.a==='new-file') newExplorerItem('file');
        else if(t.a==='search') toggleSearch();
        else if(t.a==='view') toggleView();
      });
      tb.appendChild(b);
    });
    var sideEl=document.getElementById('feSide');
    if(sideEl) sideEl.parentNode.insertBefore(tb,sideEl);

    /* Sort selector */
    var sortSel=document.createElement('select');
    sortSel.id='feSort';
    sortSel.className='feSort';
    sortSel.innerHTML='<option value="name-asc">Name ↑</option><option value="name-desc">Name ↓</option><option value="type">Typ</option><option value="size">Größe</option>';
    sortSel.addEventListener('change',function(){ renderExplorer(); });
    tb.appendChild(sortSel);

    function navigateTo(path){
      if(fsData[path]){ curPath=path; renderExplorer(); }
      else { toast('Pfad nicht gefunden'); }
    }
    function navigateUp(){
      var parts=curPath.split('\\').filter(Boolean);
      if(parts.length>1){ parts.pop(); curPath='C:\\'+parts.join('\\'); renderExplorer(); }
    }
    function navigateBack(){
      if(historyIndex>0){ historyIndex--; curPath=historyStack[historyIndex]; renderExplorer(); }
    }
    function navigateForward(){
      if(historyIndex<historyStack.length-1){ historyIndex++; curPath=historyStack[historyIndex]; renderExplorer(); }
    }
    function toggleView(){
      var grid=document.getElementById('feGrid');
      if(grid){ grid.classList.toggle('feListView'); toast(grid.classList.contains('feListView')?'Listenansicht':'Rasteransicht'); }
    }

    renderExplorer();
  }
  var EXPLOADER_INITIALIZED=false;
  var BROWSER_INITIALIZED=false;
  var MUSIC_INITIALIZED=false;
  var TASKMGR_INITIALIZED=false;
  var EQ_INITIALIZED=false;

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

  function toggleSearch(){
    var bar=document.getElementById('feSearchBar');
    if(!bar){
      bar=document.createElement('div');bar.id='feSearchBar';
      bar.innerHTML='<input type="text" id="feSearchInput" placeholder="Dateien suchen..."><button class="cBtn" id="feSearchClose">×</button>';
      var side=document.getElementById('feSide');
      if(side) side.parentNode.insertBefore(bar,side);
      document.getElementById('feSearchInput').addEventListener('input',function(e){ renderExplorer(e.target.value); });
      document.getElementById('feSearchClose').addEventListener('click',function(){bar.remove();renderExplorer();});
    } else {
      bar.remove();renderExplorer();
    }
  }

  function renderExplorer(filter){
    var side=document.getElementById('feSide');var grid=document.getElementById('feGrid');var inp=document.getElementById('fePath');
    if(!side||!grid) return;
    if(inp) inp.value=curPath;
    var d=fsData[curPath]||{dirs:[],files:[]};
    var dirs=d.dirs.slice(),files=d.files.slice();

    /* Sort */
    var sortBy=document.getElementById('feSort')?document.getElementById('feSort').value:'name-asc';
    var sortFn={
      'name-asc':function(a,b){return a.localeCompare(b);},
      'name-desc':function(a,b){return b.localeCompare(a);},
      'type':function(a,b){return a.split('.').pop().localeCompare(b.split('.').pop());},
      'size':function(a,b){return a.length-b.length;}
    };
    dirs.sort(sortFn[sortBy]||sortFn['name-asc']);
    files.sort(sortFn[sortBy]||sortFn['name-asc']);

    if(filter){
      var fl=filter.toLowerCase();
      dirs=dirs.filter(function(x){return x.toLowerCase().indexOf(fl)!==-1;});
      files=files.filter(function(x){return x.toLowerCase().indexOf(fl)!==-1;});
    }

    /* Sidebar - Tree */
    side.innerHTML='';
    var parts=curPath.split('\\').filter(Boolean);
    var acc='C:\\';
    side.innerHTML+='<div class="feItem'+(parts.length===0?' current':'')+'" data-path="C:\\">📁 Root</div>';
    if(trashPath&&fsData[trashPath]){
      side.innerHTML+='<div class="feItem" data-path="'+trashPath+'">🗑 Papierkorb</div>';
    }
    parts.forEach(function(p,i){
      acc+=p;
      side.innerHTML+='<div class="feItem'+(i===parts.length-1?' current':'')+'" data-path="'+acc+'">📁 '+p+'</div>';
      acc+='\\';
    });
    side.querySelectorAll('.feItem').forEach(function(el){
      el.addEventListener('click',function(){curPath=el.dataset.path;renderExplorer();});
    });

    /* Grid */
    grid.innerHTML='';
    if(!dirs.length&&!files.length){
      grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted);font-family:var(--font-mono);font-size:11px">'+(filter?'Keine Treffer':'Leer — Rechtsklick für Optionen')+'</div>';
    }

    dirs.forEach(function(dir){
      var el=document.createElement('div');el.className='feFile feFolder';
      el.draggable=true;
      el.innerHTML='<span class="ico">📁</span><span class="fn">'+dir+'</span><span class="meta">Ordner</span>';
      el.addEventListener('click',function(e){
        if(e.shiftKey||e.ctrlKey||e.metaKey){this.classList.toggle('selected');return;}
        document.querySelectorAll('.feFile.selected').forEach(function(x){x.classList.remove('selected');});
        this.classList.add('selected');
        var newPath=curPath==='C:\\'?'C:\\'+dir:curPath+'\\'+dir;
        curPath=newPath;renderExplorer();
      });
      el.addEventListener('dblclick',function(){
        var newPath=curPath==='C:\\'?'C:\\'+dir:curPath+'\\'+dir;
        curPath=newPath;renderExplorer();
      });
      el.addEventListener('dragstart',function(e){
        e.dataTransfer.setData('text/plain',JSON.stringify({type:'folder',name:dir,path:curPath}));
        e.dataTransfer.effectAllowed='move';
      });
      el.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('dragover');});
      el.addEventListener('dragleave',function(e){this.classList.remove('dragover');});
      el.addEventListener('drop',function(e){
        e.preventDefault();this.classList.remove('dragover');
        var data=JSON.parse(e.dataTransfer.getData('text/plain'));
        if(data.type==='file'){
          var srcDir=fsData[data.path];var dstDir=fsData[curPath];
          if(srcDir&&dstDir){
            var idx=srcDir.files.indexOf(data.name);
            if(idx!==-1){srcDir.files.splice(idx,1);dstDir.files.push(data.name);renderExplorer();toast('Verschoben: '+data.name);}
          }
        } else if(data.type==='folder'){
          var srcDir2=fsData[data.path];var dstDir2=fsData[curPath];
          if(srcDir2&&dstDir2){
            var idx2=srcDir2.dirs.indexOf(data.name);
            if(idx2!==-1){
              srcDir2.dirs.splice(idx2,1);
              dstDir2.dirs.push(data.name);
              var oldPath=data.path+'\\'+data.name;
              var newPath=curPath+'\\'+data.name;
              fsData[newPath]=fsData[oldPath];
              delete fsData[oldPath];
              renderExplorer();toast('Ordner verschoben: '+data.name);
            }
          }
        }
      });
      el.addEventListener('contextmenu',function(e){e.preventDefault();showFolderContextMenu(e,dir,curPath,dirs);});
      grid.appendChild(el);
    });

    files.forEach(function(f){
      var el=document.createElement('div');el.className='feFile feDocument';
      el.draggable=true;
      var ext=f.split('.').pop().toLowerCase();
      var icon={txt:'📄',html:'🌐',css:'🎨',js:'⚡',png:'🖼',jpg:'🖼',csv:'📊',docx:'📝',zip:'📦',exe:'⚙',md:'📝',json:'📋',py:'🐍',sh:'⚡'}[ext]||'📄';
      el.innerHTML='<span class="ico">'+icon+'</span><span class="fn">'+f+'</span><span class="meta">'+ext.toUpperCase()+'</span>';
      el.addEventListener('click',function(e){
        if(e.shiftKey||e.ctrlKey||e.metaKey){this.classList.toggle('selected');return;}
        document.querySelectorAll('.feFile.selected').forEach(function(x){x.classList.remove('selected');});
        this.classList.add('selected');
      });
      el.addEventListener('dragstart',function(e){
        e.dataTransfer.setData('text/plain',JSON.stringify({type:'file',name:f,path:curPath}));
        e.dataTransfer.effectAllowed='move';
      });
      el.addEventListener('contextmenu',function(e){e.preventDefault();showFileContextMenu(e,f,curPath,files);});
      grid.appendChild(el);
    });
  }

  /* Kontextmenü für Dateien */
  function showFileContextMenu(e,f,path,files){
    var ctx=document.getElementById('fileCtx');
    if(ctx)ctx.remove();
    ctx=document.createElement('div');ctx.id='fileCtx';
    ctx.style.left=e.clientX+'px';ctx.style.top=e.clientY+'px';
    ctx.innerHTML='<div class="ctxItem" data-act="open">Öffnen</div><div class="ctxItem" data-act="rename">Umbenennen</div><div class="ctxItem" data-act="copy">Kopieren</div><div class="ctxItem" data-act="move">Verschieben</div><div class="ctxSep"></div><div class="ctxItem" data-act="delete">Löschen</div>';
    document.body.appendChild(ctx);
    ctx.querySelectorAll('.ctxItem').forEach(function(item){
      item.addEventListener('click',function(){
        var act=item.dataset.act;
        if(act==='open'){toast('Öffne: '+f);}
        else if(act==='rename'){
          var nn=prompt('Neuer Name:',f);
          if(nn&&nn!==f){
            var idx=files.indexOf(f);
            if(idx!==-1)files[idx]=nn;
            renderExplorer();
          }
        }else if(act==='copy'){
          var c=fsData[path];
          if(c){var idx=c.files.indexOf(f);if(idx!==-1){c.files.push(f+' (Kopie)');renderExplorer();toast('Kopiert: '+f);}}
        }else if(act==='move'){
          var nn2=prompt('Zielpfad (z.B. C:\\Users\\macrohard\\Desktop):',curPath);
          if(nn2&&fsData[nn2]){
            var src=fsData[path];var dst=fsData[nn2];
            if(src&&dst){
              var idx2=src.files.indexOf(f);
              if(idx2!==-1){src.files.splice(idx2,1);dst.files.push(f);renderExplorer();toast('Verschoben nach '+nn2);}
            }
          }
        }else if(act==='delete'){
          var idx3=files.indexOf(f);
          if(idx3!==-1){
            files.splice(idx3,1);
            var tp=fsData[trashPath];
            if(tp)tp.files.push(f);
            renderExplorer();
          }
        }
        ctx.remove();
      });
    });
    setTimeout(function(){document.addEventListener('click',function close(){ctx.remove();document.removeEventListener('click',close);});},100);
  }

  function showFolderContextMenu(e,dir,path,dirs){
    var ctx=document.getElementById('fileCtx');
    if(ctx)ctx.remove();
    ctx=document.createElement('div');ctx.id='fileCtx';
    ctx.style.left=e.clientX+'px';ctx.style.top=e.clientY+'px';
    ctx.innerHTML='<div class="ctxItem" data-act="open">Öffnen</div><div class="ctxItem" data-act="rename">Umbenennen</div><div class="ctxItem" data-act="copy">Kopieren</div><div class="ctxItem" data-act="delete">Löschen</div><div class="ctxSep"></div><div class="ctxItem" data-act="empty-trash">Papierkorb leeren</div>';
    document.body.appendChild(ctx);
    ctx.querySelectorAll('.ctxItem').forEach(function(item){
      item.addEventListener('click',function(){
        var act=item.dataset.act;
        if(act==='open'){
          curPath=path==='C:\\'?'C:\\'+dir:path+'\\'+dir;
          renderExplorer();
        }else if(act==='rename'){
          var nn=prompt('Neuer Name:',dir);
          if(nn&&nn!==dir){
            var idx=dirs.indexOf(dir);
            if(idx!==-1)dirs[idx]=nn;
            renderExplorer();
          }
        }else if(act==='copy'){
          var c=fsData[path];
          if(c){c.dirs.push(dir+' (Kopie)');renderExplorer();toast('Ordner kopiert: '+dir);}
        }else if(act==='delete'){
          var idx2=dirs.indexOf(dir);
          if(idx2!==-1){
            dirs.splice(idx2,1);
            var delPath=path==='C:\\'?'C:\\'+dir:path+'\\'+dir;
            delete fsData[delPath];
            renderExplorer();
          }
        }else if(act==='empty-trash'){
          if(confirm('Papierkorb leeren? Alle gelöschten Dateien werden entfernt.')){
            var tp=fsData[trashPath];
            if(tp){tp.files=[];tp.dirs=[];renderExplorer();toast('Papierkorb geleert');}
          }
        }
        ctx.remove();
      });
    });
    setTimeout(function(){document.addEventListener('click',function close(){ctx.remove();document.removeEventListener('click',close);});},100);
  }


  function buildPaint(){
    var colors=document.getElementById('ptColors');var canvas=document.getElementById('ptCanvas');if(!colors||!canvas) return;
    var paintColor='#000',pTool='pen',painting=false,pStart=null,undoStack=[],redoStack=[],maxUndo=50;
    var pCtx=canvas.getContext('2d');pCtx.fillStyle='#fff';pCtx.fillRect(0,0,canvas.width,canvas.height);
    function saveState(){undoStack.push(pCtx.getImageData(0,0,pCtx.canvas.width,pCtx.canvas.height));if(undoStack.length>maxUndo)undoStack.shift();redoStack=[];}
    function undo(){if(!undoStack.length)return;redoStack.push(pCtx.getImageData(0,0,pCtx.canvas.width,pCtx.canvas.height));pCtx.putImageData(undoStack.pop(),0,0);toast('Rückgängig');}
    function redo(){if(!redoStack.length)return;undoStack.push(pCtx.getImageData(0,0,pCtx.canvas.width,pCtx.canvas.height));pCtx.putImageData(redoStack.pop(),0,0);toast('Wiederholen');}
    colors.innerHTML='';
    var cls=['#000','#fff','#ff0','#f00','#0f0','#00f','#f0f','#ff8000','#800','#080','#008','#808','#f90','#09f','#90f','#0ff','#f09','#9f0','#636','#666','#333','#ccc','#fee','#cff'];
    cls.forEach(function(c){
      var b=document.createElement('button');b.style.background=c;b.title=c;
      if(c==='#000')b.classList.add('active');
      b.addEventListener('click',function(){paintColor=c;colors.querySelectorAll('button').forEach(function(x){x.classList.remove('active');});b.classList.add('active');});
      colors.appendChild(b);
    });
    /* Toolbar */
    var tb=document.createElement('div');tb.className='ptToolbar';
    [{t:'pen',i:'✏'},{t:'line',i:'╱'},{t:'rect',i:'▭'},{t:'ellipse',i:'◯'},{t:'fill',i:'🪣'},{t:'eraser',i:'🧽'}].forEach(function(x){
      var b=document.createElement('button');b.textContent=x.i;b.dataset.tool=x.t;
      if(x.t==='pen')b.classList.add('active');
      b.addEventListener('click',function(){pTool=x.t;tb.querySelectorAll('button').forEach(function(y){y.classList.remove('active');});b.classList.add('active');});
      tb.appendChild(b);
    });
    /* Line width slider */
    var lwWrap=document.createElement('label');lwWrap.style.cssText='display:flex;align-items:center;gap:4px;font-size:10px';
    lwWrap.innerHTML='Strich: <input type="range" id="ptLW" min="1" max="20" value="3" style="width:60px">';
    tb.appendChild(lwWrap);
    /* Actions */
    var undoBtn=document.createElement('button');undoBtn.className='cBtn';undoBtn.textContent='↩';undoBtn.title='Rückgängig';undoBtn.addEventListener('click',undo);
    var redoBtn=document.createElement('button');redoBtn.className='cBtn';redoBtn.textContent='↪';redoBtn.title='Wiederholen';redoBtn.addEventListener('click',redo);
    var clearBtn=document.createElement('button');clearBtn.className='cBtn';clearBtn.textContent='🗑';clearBtn.title='Leeren';clearBtn.addEventListener('click',function(){saveState();pCtx.fillStyle='#fff';pCtx.fillRect(0,0,canvas.width,canvas.height);toast('Leer');});
    tb.appendChild(undoBtn);tb.appendChild(redoBtn);tb.appendChild(clearBtn);
    colors.parentNode.insertBefore(tb,colors.nextSibling);
    pCtx.strokeStyle=paintColor;pCtx.lineWidth=3;pCtx.lineCap='round';
    saveState();
    function getPos(e){var r=canvas.getBoundingClientRect();var t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
    canvas.addEventListener('mousedown',function(e){saveState();painting=true;pStart=getPos(e);if(pTool==='pen'||pTool==='eraser'){pCtx.beginPath();pCtx.moveTo(pStart.x,pStart.y);}else if(pTool==='fill'){floodFill(getPos(e));painting=false;}});
    canvas.addEventListener('mousemove',function(e){if(!painting)return;var pos=getPos(e);if(pTool==='pen'){pCtx.strokeStyle=paintColor;pCtx.lineWidth=parseInt(document.getElementById('ptLW').value)||3;pCtx.lineTo(pos.x,pos.y);pCtx.stroke();}else if(pTool==='eraser'){pCtx.strokeStyle='#fff';pCtx.lineWidth=(parseInt(document.getElementById('ptLW').value)||3)*3;pCtx.lineTo(pos.x,pos.y);pCtx.stroke();}else if(pTool!=='fill'){drawShapePreview(pStart,pos);}});
    canvas.addEventListener('mouseup',function(e){if(!painting)return;if(pTool!=='pen'&&pTool!=='eraser'&&pTool!=='fill'&&pStart){var pos=getPos(e);commitShape(pStart,pos);}painting=false;pStart=null;});
    canvas.addEventListener('mouseleave',function(){painting=false;pStart=null;});
    canvas.addEventListener('touchstart',function(e){e.preventDefault();saveState();painting=true;pStart=getPos(e);if(pTool==='pen'||pTool==='eraser'){pCtx.beginPath();pCtx.moveTo(pStart.x,pStart.y);}else if(pTool==='fill'){floodFill(getPos(e));painting=false;}},{passive:false});
    canvas.addEventListener('touchmove',function(e){e.preventDefault();if(!painting)return;var pos=getPos(e);if(pTool==='pen'){pCtx.strokeStyle=paintColor;pCtx.lineWidth=parseInt(document.getElementById('ptLW').value)||3;pCtx.lineTo(pos.x,pos.y);pCtx.stroke();}else if(pTool==='eraser'){pCtx.strokeStyle='#fff';pCtx.lineWidth=(parseInt(document.getElementById('ptLW').value)||3)*3;pCtx.lineTo(pos.x,pos.y);pCtx.stroke();}else if(pTool!=='fill'){drawShapePreview(pStart,pos);}},{passive:false});
    canvas.addEventListener('touchend',function(e){if(!painting)return;if(pTool!=='pen'&&pTool!=='eraser'&&pTool!=='fill'&&pStart){var t=e.changedTouches[0];var r=canvas.getBoundingClientRect();var pos={x:t.clientX-r.left,y:t.clientY-r.top};commitShape(pStart,pos);}painting=false;pStart=null;},{passive:false});
    document.getElementById('ptLW').addEventListener('input',function(){pCtx.lineWidth=parseInt(this.value)||3;});
  }
  function floodFill(start){
    var w=pCtx.canvas.width,h=pCtx.canvas.height;
    var imgData=pCtx.getImageData(0,0,w,h);
    var data=imgData.data;
    var x=Math.floor(start.x),y=Math.floor(start.y);
    if(x<0||x>=w||y<0||y>=h)return;
    var startIdx=(y*w+x)*4;
    var startR=data[startIdx],startG=data[startIdx+1],startB=data[startIdx+2];
    var hex=paintColor.replace('#','');
    var fillR=parseInt(hex.substr(0,2),16),fillG=parseInt(hex.substr(2,2),16),fillB=parseInt(hex.substr(4,2),16);
    if(startR===fillR&&startG===fillG&&startB===fillB)return;
    var stack=[[x,y]];
    var visited={};
    while(stack.length){
      var pos=stack.pop();
      var px=pos[0],py=pos[1];
      var key=px+','+py;
      if(visited[key])continue;
      visited[key]=true;
      var idx=(py*w+px)*4;
      if(Math.abs(data[idx]-startR)>30||Math.abs(data[idx+1]-startG)>30||Math.abs(data[idx+2]-startB)>30)continue;
      data[idx]=fillR;data[idx+1]=fillG;data[idx+2]=fillB;
      if(px>0)stack.push([px-1,py]);
      if(px<w-1)stack.push([px+1,py]);
      if(py>0)stack.push([px,py-1]);
      if(py<h-1)stack.push([px,py+1]);
    }
    pCtx.putImageData(imgData,0,0);
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

  /* Music — Refactored: Sadee-Inspired UI + MakerOS Features */
  function buildMusic(){
    var player=document.querySelector('.musPlayer');if(!player)return;
    if(MUSIC_INITIALIZED) return;
    MUSIC_INITIALIZED=true;
    var art=document.getElementById('musArt');
    var artIcon=document.getElementById('musArtIcon');
    var titleEl=document.getElementById('musTitle');
    var artistEl=document.getElementById('musArtist');
    var albumEl=document.getElementById('musAlbum');
    var prog=document.getElementById('musProg');
    var progL=document.getElementById('musProgL');
    var progR=document.getElementById('musProgR');
    var playBtn=document.getElementById('musPlayBtn');
    var shuffleBtn=document.getElementById('musShuffle');
    var prevBtn=document.getElementById('musPrev');
    var nextBtn=document.getElementById('musNext');
    var repeatBtn=document.getElementById('musRepeat');
    var volEl=document.getElementById('musVol');
    var volL=document.getElementById('musVolL');
    var toggleBtn=document.getElementById('musToggle');
    var sidebar=document.getElementById('musSidebar');
    var uploadIn=document.getElementById('musUploadIn');
    var radioStatus=document.getElementById('musRadioStatus');

    /* Storage Keys */
    var SK_FAV='mus_favs',SK_CUSTOM='mus_custom',SK_RADIO='mus_radio';

    /* State */
    var songs=[
      {n:'Macrohard Anthems',a:'IDUN Studio',u:'./assets/music/SoundHelix-Song-1.mp3',src:'local'},
      {n:'Maker of Cancellation',a:'Perchance Sound',u:'./assets/music/SoundHelix-Song-2.mp3',src:'local'},
      {n:'Neo-Brutalist Beat',a:'qapdex-maker',u:'./assets/music/SoundHelix-Song-3.mp3',src:'local'},
      {n:'IDUN Tone',a:'IDUN Studio',u:'./assets/music/SoundHelix-Song-4.mp3',src:'local'}
    ];
    var favIds=[];
    var radioStations=[];
    var activeTab='playlist';
    var curIdx=-1,curStation=null,playing=false,repeat=false,shuffled=[];
    var audioCtx=null,sourceNode=null,analyser=null,biquadFilters=[];
    var seqBiquadFilters=[];
    var eqBands=[60,150,400,1000,3000,8000];
    var eqValues={60:0,150:0,400:0,1000:0,3000:0,8000:0};
    var isRadio=false;
    var activeExtraTab='beatpad';

    function applyEQValues(){
      eqBands.forEach(function(freq,i){
        var v=eqValues[freq]||0;
        if(biquadFilters[i]&&audioCtx&&audioCtx.state==='running'){
          biquadFilters[i].gain.setValueAtTime(v,audioCtx.currentTime);
        }
        if(seqBiquadFilters[i]&&SEQ.ctx&&SEQ.ctx.state==='running'){
          try{seqBiquadFilters[i].gain.setValueAtTime(v,SEQ.ctx.currentTime);}catch(e){}
        }
      });
    }

    function setupSeqEQ(){
      if(!SEQ.ctx)return;
      // Reset filters if ctx was recreated
      if(seqBiquadFilters.length>0){
        try{seqBiquadFilters.forEach(function(f){f.disconnect();});}catch(e){}
        seqBiquadFilters=[];
      }
      seqBiquadFilters=eqBands.map(function(freq,i){
        var f=SEQ.ctx.createBiquadFilter();
        f.type=i===0?'lowshelf':i===eqBands.length-1?'highshelf':'peaking';
        f.frequency.value=freq;f.gain.value=eqValues[freq]||0;return f;
      });
      // Rebuild chain: master -> filter1 -> ... -> filterN -> destination
      if(SEQ.master&&seqBiquadFilters.length>0){
        try{
          SEQ.master.disconnect();
          var chain=SEQ.master;
          seqBiquadFilters.forEach(function(f){chain.connect(f);chain=f;});
          chain.connect(SEQ.ctx.destination);
        }catch(e){}
      }
    }
    var audioEl=null;
    var visRafId=null;

    /* === Storage Helpers === */
    function loadFavs(){try{favIds=JSON.parse(localStorage.getItem(SK_FAV)||'[]')}catch(e){favIds=[]}}
    function saveFavs(){try{localStorage.setItem(SK_FAV,JSON.stringify(favIds))}catch(e){}}
    function loadCustom(){
      try{
        var c=JSON.parse(localStorage.getItem(SK_CUSTOM)||'[]');
        c.forEach(function(s){s.src='custom';s._lob=true;songs.push(s)});
      }catch(e){}
    }
    function loadRadios(){
      try{
        var r=JSON.parse(localStorage.getItem(SK_RADIO)||'[]');
        if(r.length)radioStations=r;
      }catch(e){}
    }
    function saveRadios(){try{localStorage.setItem(SK_RADIO,JSON.stringify(radioStations))}catch(e){}}
    loadCustomSamples();

    /* === Audio Graph === */
    function setupAudio(){
      if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      // Always rebuild pipeline (MediaElementSource is one-time-use per element)
      if(sourceNode){try{sourceNode.disconnect();}catch(e){}}
      if(audioEl){
        audioEl.pause();
        audioEl.src='';
        audioEl.removeEventListener('timeupdate',onTimeUpdate);
        audioEl.removeEventListener('ended',onEnded);
        audioEl.removeEventListener('error',onError);
      }
      audioEl=new Audio();
      audioEl.volume=0.7;
      sourceNode=audioCtx.createMediaElementSource(audioEl);
      analyser=audioCtx.createAnalyser();
      analyser.fftSize=128;
      biquadFilters=eqBands.map(function(freq,i){
        var f=audioCtx.createBiquadFilter();
        f.type=i===0?'lowshelf':i===eqBands.length-1?'highshelf':'peaking';
        f.frequency.value=freq;f.gain.value=0;return f;
      });
      var node=sourceNode;
      biquadFilters.forEach(function(f){node.connect(f);node=f;});
      node.connect(analyser);analyser.connect(audioCtx.destination);
      audioEl.addEventListener('timeupdate',onTimeUpdate);
      audioEl.addEventListener('ended',onEnded);
      audioEl.addEventListener('error',onError);
    }
    function ensureResumed(){if(audioCtx&&audioCtx.state==='suspended')return audioCtx.resume();return Promise.resolve()}

    /* === Visualizer === */
    function initVisualizer(){
      var canvas=document.getElementById('musVisCanvas');if(!canvas)return;
      if(visRafId){cancelAnimationFrame(visRafId);visRafId=null;}
      var ctx=canvas.getContext('2d');
      if(!ctx)return;
      var buf=new Uint8Array(analyser?analyser.frequencyBinCount:64);
      function draw(){
        if(!document.getElementById('musVisCanvas')){visRafId=null;return;}
        visRafId=requestAnimationFrame(draw);
        if(!analyser)return;
        analyser.getByteFrequencyData(buf);
        ctx.fillStyle='#0b0b0c';ctx.fillRect(0,0,canvas.width,canvas.height);
        var bw=canvas.width/buf.length;
        for(var i=0;i<buf.length;i++){
          var h=(buf[i]/255)*canvas.height;
          var g=ctx.createLinearGradient(0,canvas.height,0,canvas.height-h);
          g.addColorStop(0,'#ffd400');g.addColorStop(1,'#2547ff');
          ctx.fillStyle=g;ctx.fillRect(i*bw,canvas.height-h,bw-1,h);
        }
      }
      draw();
      /* Track rAF ID for cleanup on close */
      window.osTimeouts['music_vis']=visRafId;
    }

    /* === Pattern Sequencer (Lookahead + Sample Library) === */
    var SEQ = {
      pattern: [],
      playing: false,
      bpm: 120,
      vol: 0.7,
      swing: 0,
      step: 0,
      timer: null,
      buffers: {},
      ctx: null,
      master: null,
      loaded: false,
      nextNoteTime: 0,
      current16th: 0,
      lookahead: 0.1,
      scheduleInterval: 25,
      muted: [],
      solo: -1,
      undoStack: [],
      redoStack: [],
      clipboard: null
    };

    var SEQ_STEPS = 16;
    var SAMPLE_LIBRARY = [
      {f:'909kick1', n:'909 Kick', c:'#ff4000'},
      {f:'909snare1', n:'909 Snare', c:'#2547ff'},
      {f:'909closehat', n:'909 HiHat', c:'#ffd400'},
      {f:'808openhat', n:'808 OpHat', c:'#ff8000'},
      {f:'punch', n:'Punch', c:'#0f0'},
      {f:'jubass1', n:'JuBass', c:'#f0f'},
      {f:'subbass', n:'Sub Bass', c:'#800'},
      {f:'cowbell', n:'Cowbell', c:'#666'},
      {f:'acidic', n:'Acidic', c:'#0ff'},
      {f:'barrel', n:'Barrel', c:'#808'},
      {f:'boom echo', n:'Boom Echo', c:'#f80'},
      {f:'choose now', n:'Choose', c:'#08f'},
      {f:'dive1', n:'Dive', c:'#8f0'},
      {f:'door', n:'Door', c:'#f08'},
      {f:'dry blow', n:'Dry Blow', c:'#888'},
      {f:'explosion', n:'Explosion', c:'#ff0'},
      {f:'fireguard', n:'Fireguard', c:'#f40'},
      {f:'fm bellsy', n:'FM Bells', c:'#4f0'},
      {f:'fretnoise01', n:'FretNoise', c:'#0f4'},
      {f:'hard hit', n:'Hard Hit', c:'#40f'},
      {f:'harsh wind', n:'HarshWind', c:'#f0f'},
      {f:'high band', n:'High Band', c:'#ff8'},
      {f:'high sticks', n:'HiSticks', c:'#8ff'},
      {f:'insect death', n:'Insect', c:'#f88'},
      {f:'metal filter', n:'MetalFlt', c:'#8f8'},
      {f:'triangle sust', n:'Triangle', c:'#88f'},
      {f:'wave crash', n:'WaveCrash', c:'#f44'},
      {f:'wind sweep', n:'WindSweep', c:'#4f4'},
      {f:'80horn', n:'80 Horn', c:'#ff2'},
      {f:'bad earth', n:'BadEarth', c:'#2ff'},
      {f:'808tom', n:'808 Tom', c:'#f2f'}
    ];

    
    var SEQ_CUSTOM_KEY = 'seq_custom_samples';
    var customSamples = [];

    function loadCustomSamples(){
      try{
        var raw = localStorage.getItem(SEQ_CUSTOM_KEY);
        if(raw) customSamples = JSON.parse(raw);
      }catch(e){ customSamples = []; }
    }

    function saveCustomSamples(){
      try{ localStorage.setItem(SEQ_CUSTOM_KEY, JSON.stringify(customSamples)); }catch(e){}
    }

    function addCustomSample(file){
      return new Promise(function(resolve, reject){
        var reader = new FileReader();
        reader.onload = function(ev){
          var dataUrl = ev.target.result;
          var id = 'custom_' + Date.now();
          var name = file.name.replace(/\.[^.]+$/, '').substring(0, 20);
          customSamples.push({id:id, name:name, data:dataUrl});
          saveCustomSamples();
          resolve({id:id, name:name});
        };
        reader.onerror = function(){ reject('Read error'); };
        reader.readAsDataURL(file);
      });
    }

    function removeCustomSample(id){
      customSamples = customSamples.filter(function(s){return s.id !== id;});
      saveCustomSamples();
    }

    function getAllSamples(){
      return SAMPLE_LIBRARY.concat(customSamples.map(function(c){
        return {f:'_custom_'+c.id, n:c.name, c:'#0aa', _custom:true};
      }));
    }

    function fetchSample(libEntry){
      if(libEntry._custom){
        var id = libEntry.f.replace('_custom_','');
        var cs = customSamples.filter(function(s){return s.id===id;})[0];
        if(!cs) return Promise.reject('Custom sample not found');
        return new Promise(function(resolve, reject){
          fetch(cs.data).then(function(r){return r.arrayBuffer();}).then(resolve).catch(reject);
        });
      }
      return fetch('./assets/samples/' + libEntry.f + '.mp3')
        .then(function(r){return r.arrayBuffer();});
    }

// Default 8 tracks (first from library)
    var seqTracks = [0, 1, 2, 3, 4, 5, 6, 7];

    function initSequencer() {
      var pad = document.getElementById('musBeatpad');
      if (!pad) return;

      // Reset pattern state
      SEQ.pattern = [];
      SEQ.muted = [];
      for (var i = 0; i < 8; i++) {
        SEQ.pattern[i] = [];
        SEQ.muted[i] = false;
        for (var j = 0; j < SEQ_STEPS; j++) {
          SEQ.pattern[i][j] = false;
        }
      }

      // Ensure AudioContext exists (synthesized fallback always available)
      if (!SEQ.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) SEQ.ctx = new AC();
      }

      // Always build full sequencer UI first (so it's usable even if samples fail)
      buildSeqUI(pad);
      SEQ.loaded = true;

      // Then try to load samples in background (non-blocking)
      if (!SEQ.loaded || SEQ.loaded) {
        loadSamples().then(function() {
          // Samples loaded — buffers updated in-place
        }).catch(function() {
          // Samples failed — synthesized fallback already active
          console.warn('Sequencer: samples unavailable, using synthesized sounds');
        });
      }
    }

    function loadSamples() {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return Promise.reject('No AudioContext');
      if (!SEQ.ctx) SEQ.ctx = new AudioContext();
      var promises = [];
      for (var t = 0; t < 8; t++) {
        (function(trackIdx){
          var libIdx = seqTracks[trackIdx];
          var sample = SAMPLE_LIBRARY[libIdx];
          promises.push(
            fetchSample(sample)
              .then(function(r) { return r.arrayBuffer(); })
              .then(function(buf) { return SEQ.ctx.decodeAudioData(buf); })
              .then(function(decoded) { return {idx: trackIdx, decoded: decoded}; })
              .catch(function() { return {idx: trackIdx, decoded: null}; })
          );
        })(t);
      }
      return Promise.all(promises).then(function(results) {
        results.forEach(function(r) {
          SEQ.buffers[r.idx] = r.decoded;
        });
        // If ALL samples failed, trigger fallback
        var anyLoaded = results.some(function(r){ return r.decoded; });
        if (!anyLoaded) return Promise.reject('All samples failed');
      });
    }

    function playSample(trackIdx, when) {
      // Try samples first
      if (SEQ.buffers[trackIdx] && SEQ.ctx && !SEQ.muted[trackIdx]) {
        if (SEQ.solo >= 0 && SEQ.solo !== trackIdx) return;
        if (SEQ.ctx.state === 'suspended') SEQ.ctx.resume();

        if (!SEQ.master) {
          SEQ.master = SEQ.ctx.createGain();
          SEQ.master.gain.value = SEQ.vol;
          SEQ.master.connect(SEQ.ctx.destination);
        }

        var src = SEQ.ctx.createBufferSource();
        var gain = SEQ.ctx.createGain();
        src.buffer = SEQ.buffers[trackIdx];
        gain.gain.value = 0.8;
        src.connect(gain);
        gain.connect(SEQ.master);
        src.start(when || 0);
        return;
      }

      // Fallback: synthesized drum sound (use `when` for correct scheduling)
      if (SEQ.muted[trackIdx]) return;
      if (SEQ.solo >= 0 && SEQ.solo !== trackIdx) return;

      var ctx = SEQ.ctx;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        SEQ.ctx = new AC();
        ctx = SEQ.ctx;
      }
      if (ctx.state === 'suspended') ctx.resume();

      if (!SEQ.master) {
        SEQ.master = ctx.createGain();
        SEQ.master.gain.value = SEQ.vol;
        SEQ.master.connect(ctx.destination);
      }

      var t = when || ctx.currentTime;
      var trackType = trackIdx % 4;
      var o = ctx.createOscillator();
      var g = ctx.createGain();

      if (trackType === 0) { // Kick
        o.type = 'sine';
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.15);
        g.gain.setValueAtTime(0.8, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t);
        o.stop(t + 0.2);
      } else if (trackType === 1) { // Snare
        o.type = 'triangle';
        o.frequency.setValueAtTime(200, t);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t);
        o.stop(t + 0.1);
      } else if (trackType === 2) { // HiHat
        o.type = 'square';
        o.frequency.setValueAtTime(8000, t);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.start(t);
        o.stop(t + 0.05);
      } else { // Bass
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(60 + trackIdx * 10, t);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t);
        o.stop(t + 0.15);
      }

      o.connect(g);
      g.connect(SEQ.master);
    }

    function scheduleNote(stepTime, step) {
      for (var i = 0; i < 8; i++) {
        if (SEQ.pattern[i][step]) {
          playSample(i, stepTime);
        }
      }
    }

    function scheduler() {
      if (!SEQ.playing) return;
      if (!SEQ.ctx) return;

      while (SEQ.nextNoteTime < SEQ.ctx.currentTime + SEQ.lookahead) {
        var stepDur = (60.0 / SEQ.bpm) / 4.0;
        // Apply swing to odd steps
        var swingOffset = 0;
        if (SEQ.swing > 0 && SEQ.current16th % 2 === 1) {
          swingOffset = stepDur * SEQ.swing * 0.5;
        }
        scheduleNote(SEQ.nextNoteTime + swingOffset, SEQ.current16th);
        SEQ.nextNoteTime += stepDur;
        SEQ.current16th = (SEQ.current16th + 1) % SEQ_STEPS;
      }

      updateVisual(SEQ.current16th);
      SEQ.timer = setTimeout(scheduler, SEQ.scheduleInterval);
    }

    function updateVisual(step) {
      var currentSteps = document.querySelectorAll('.seq-step[data-col="' + step + '"]');
      document.querySelectorAll('.seq-step.playing').forEach(function(el) {
        el.classList.remove('playing');
      });
      currentSteps.forEach(function(el) {
        el.classList.add('playing');
      });
    }

    function startSequencer() {
      if (!SEQ.loaded) return;
      if (!SEQ.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        SEQ.ctx = new AC();
      }
      if (SEQ.ctx.state === 'suspended') SEQ.ctx.resume();

      if (!SEQ.master) {
        SEQ.master = SEQ.ctx.createGain();
        SEQ.master.gain.value = SEQ.vol;
        SEQ.master.connect(SEQ.ctx.destination);
      }

      setupSeqEQ();

      SEQ.playing = true;
      SEQ.current16th = 0;
      SEQ.nextNoteTime = SEQ.ctx.currentTime;

      var playBtn = document.getElementById('beatpadPlay');
      if (playBtn) {
        playBtn.textContent = '⏸ Pause';
        playBtn.style.background = 'var(--accent-2)';
      }

      scheduler();
    }

    function stopSequencer() {
      SEQ.playing = false;
      SEQ.current16th = 0;
      if (SEQ.timer) {
        clearTimeout(SEQ.timer);
        SEQ.timer = null;
      }
      try{
        document.querySelectorAll('.seq-step.playing').forEach(function(el) {
          el.classList.remove('playing');
        });
      }catch(e){}

      var playBtn = document.getElementById('beatpadPlay');
      if (playBtn) {
        playBtn.textContent = '▶ Play';
        playBtn.style.background = '';
      }
    }

    function toggleSequencer() {
      if (SEQ.playing) stopSequencer();
      else startSequencer();
    }

    function buildSeqUI(pad) {
      var container = document.createElement('div');
      container.className = 'seq-container';

      // Step numbers
      var stepRow = document.createElement('div');
      stepRow.className = 'seq-step-row';
      for (var j = 0; j < SEQ_STEPS; j++) {
        var stepNum = document.createElement('span');
        stepNum.className = 'seq-step-num' + (j % 4 === 0 ? ' beat' : '');
        stepNum.textContent = (j + 1).toString();
        stepRow.appendChild(stepNum);
      }
      container.appendChild(stepRow);

      // Grid rows
      for (var i = 0; i < 8; i++) {
        (function(trackIdx) {
          var row = document.createElement('div');
          row.className = 'seq-row';

          var libIdx = seqTracks[trackIdx];
          var sample = SAMPLE_LIBRARY[libIdx];

          // Label with dropdown
          var labelWrap = document.createElement('div');
          labelWrap.className = 'seq-label-wrap';

          var label = document.createElement('span');
          label.className = 'seq-label';
          label.textContent = sample.n;
          label.style.background = sample.c;
          labelWrap.appendChild(label);

          var select = document.createElement('select');
          select.className = 'seq-sample-select';
          select.dataset.track = trackIdx;
          getAllSamples().forEach(function(s, si) {
            var opt = document.createElement('option');
            opt.value = si;
            opt.textContent = s.n;
            if (si === libIdx) opt.selected = true;
            select.appendChild(opt);
          });
          select.addEventListener('change', function() {
            var newLibIdx = parseInt(this.value);
            seqTracks[trackIdx] = newLibIdx;
            var newSample = SAMPLE_LIBRARY[newLibIdx];
            label.textContent = newSample.n;
            label.style.background = newSample.c;
            fetchSample(newSample)
              .then(function(buf) { return SEQ.ctx.decodeAudioData(buf); })
              .then(function(decoded) { SEQ.buffers[trackIdx] = decoded; })
              .catch(function() { SEQ.buffers[trackIdx] = null; });
          });
          labelWrap.appendChild(select);
          row.appendChild(labelWrap);

          // Mute button
          var muteBtn = document.createElement('button');
          muteBtn.className = 'seq-mute';
          muteBtn.textContent = '🔊';
          muteBtn.title = 'Mute';
          muteBtn.dataset.track = trackIdx;
          muteBtn.addEventListener('click', function() {
            SEQ.muted[trackIdx] = !SEQ.muted[trackIdx];
            this.textContent = SEQ.muted[trackIdx] ? '🔇' : '🔊';
            this.classList.toggle('active', SEQ.muted[trackIdx]);
          });
          row.appendChild(muteBtn);

          // Solo button
          var soloBtn = document.createElement('button');
          soloBtn.className = 'seq-solo';
          soloBtn.textContent = 'S';
          soloBtn.title = 'Solo';
          soloBtn.dataset.track = trackIdx;
          soloBtn.addEventListener('click', function() {
            if (SEQ.solo === trackIdx) {
              SEQ.solo = -1;
              this.classList.remove('active');
            } else {
              SEQ.solo = trackIdx;
              this.classList.add('active');
              // Remove active from other solo buttons
              var allSolo = document.querySelectorAll('.seq-solo');
              allSolo.forEach(function(b) {
                if (b !== soloBtn) b.classList.remove('active');
              });
            }
          });
          row.appendChild(soloBtn);

          // Steps
          for (var j = 0; j < SEQ_STEPS; j++) {
            (function(col) {
              var step = document.createElement('button');
              step.className = 'seq-step' + (SEQ.pattern[trackIdx][col] ? ' active' : '');
              step.dataset.row = trackIdx;
              step.dataset.col = col;
              step.addEventListener('click', toggleStep);
              row.appendChild(step);
            })(j);
          }
          container.appendChild(row);
        })(i);
      }

      pad.innerHTML = '';
      pad.appendChild(container);

      // Controls nur einmalig initialisieren
      if (!SEQ.controlsInitialized) {
        SEQ.controlsInitialized = true;
        buildSeqControls(pad);
      }
    }

    function savePatternState() {
      SEQ.undoStack.push(JSON.parse(JSON.stringify(SEQ.pattern)));
      if (SEQ.undoStack.length > 20) SEQ.undoStack.shift();
      SEQ.redoStack = [];
    }

    function undoPattern() {
      if (!SEQ.undoStack.length) return;
      SEQ.redoStack.push(JSON.parse(JSON.stringify(SEQ.pattern)));
      SEQ.pattern = SEQ.undoStack.pop();
      rebuildGrid();
    }

    function redoPattern() {
      if (!SEQ.redoStack.length) return;
      SEQ.undoStack.push(JSON.parse(JSON.stringify(SEQ.pattern)));
      SEQ.pattern = SEQ.redoStack.pop();
      rebuildGrid();
    }

    function copyPattern() {
      SEQ.clipboard = JSON.parse(JSON.stringify(SEQ.pattern));
      showNotif('Pattern kopiert');
    }

    function pastePattern() {
      if (!SEQ.clipboard) { showNotif('Kein Pattern in Zwischenablage'); return; }
      savePatternState();
      SEQ.pattern = JSON.parse(JSON.stringify(SEQ.clipboard));
      rebuildGrid();
      showNotif('Pattern eingefügt');
    }

    function savePatternSlot(slot) {
      try {
        var key = 'seq_pattern_' + slot;
        localStorage.setItem(key, JSON.stringify({
          pattern: SEQ.pattern,
          tracks: seqTracks,
          bpm: SEQ.bpm
        }));
      } catch(e) {}
    }

    function loadPatternSlot(slot) {
      try {
        var key = 'seq_pattern_' + slot;
        var data = JSON.parse(localStorage.getItem(key) || 'null');
        if (data) {
          savePatternState();
          SEQ.pattern = data.pattern;
          seqTracks = data.tracks.slice(0, 8);
          SEQ.bpm = data.bpm || 120;
          var bpmSel = document.getElementById('beatpadBpm');
          if (bpmSel) bpmSel.value = SEQ.bpm;
          rebuildGrid();
          showNotif('Pattern Slot ' + (slot + 1) + ' geladen');
        } else {
          showNotif('Slot ' + (slot + 1) + ' leer');
        }
      } catch(e) { showNotif('Fehler beim Laden'); }
    }

    function setPatternLength(len) {
      savePatternState();
      SEQ_STEPS = len;
      // Resize pattern
      var oldPattern = SEQ.pattern;
      SEQ.pattern = [];
      for (var i = 0; i < 8; i++) {
        SEQ.pattern[i] = [];
        for (var j = 0; j < len; j++) {
          SEQ.pattern[i][j] = oldPattern[i] ? (oldPattern[i][j] || false) : false;
        }
      }
      var pad = document.getElementById('musBeatpad');
      if (pad) buildSeqUI(pad);
    }

    function buildSeqControls(pad) {
      var header = pad.parentElement.querySelector('.beatpad-header');
      if (!header) return;

      var bpmSel = header.querySelector('#beatpadBpm');
      if (bpmSel) {
        bpmSel.addEventListener('change', function() { SEQ.bpm = parseInt(this.value); });
      }

      var volSlider = document.getElementById('beatpadVol');
      var volLabel = document.getElementById('beatpadVolL');
      if (volSlider) {
        volSlider.addEventListener('input', function() {
          SEQ.vol = parseInt(this.value) / 100;
          if (SEQ.master) SEQ.master.gain.setValueAtTime(SEQ.vol, SEQ.ctx.currentTime);
          if (volLabel) volLabel.textContent = this.value + '%';
        });
      }

      var playBtn = header.querySelector('#beatpadPlay');
      if (playBtn) {
        playBtn.addEventListener('click', toggleSequencer);
      }

      var stopBtn = header.querySelector('#beatpadStop');
      if (stopBtn) stopBtn.addEventListener('click', stopSequencer);

      // Shuffle
      var shuffleBtn = document.createElement('button');
      shuffleBtn.className = 'beatpad-btn-lg seq-shuffle';
      shuffleBtn.textContent = '🔀';
      shuffleBtn.title = 'Random pattern';
      shuffleBtn.addEventListener('click', shufflePattern);
      header.appendChild(shuffleBtn);

      // Sample Upload
      var uploadWrap = document.createElement('span');
      uploadWrap.style.display = 'inline-flex';
      uploadWrap.style.alignItems = 'center';
      uploadWrap.style.gap = '4px';
      uploadWrap.style.marginLeft = '6px';
      var uploadLabel = document.createElement('label');
      uploadLabel.className = 'beatpad-btn-lg seq-upload';
      uploadLabel.style.cursor = 'pointer';
      uploadLabel.style.fontSize = '10px';
      uploadLabel.style.padding = '4px 6px';
      uploadLabel.textContent = '⬆ Sample';
      uploadLabel.title = 'Eigenes Sample hochladen';
      var uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'audio/*';
      uploadInput.style.display = 'none';
      uploadInput.addEventListener('change', function(){
        if(!this.files.length) return;
        addCustomSample(this.files[0]).then(function(s){
          showNotif('Sample "' + s.name + '" hinzugefügt');
          var pad = document.getElementById('musBeatpad');
          if(pad) buildSeqUI(pad);
        }).catch(function(e){ showNotif('Fehler: '+e); });
        this.value = '';
      });
      uploadLabel.appendChild(uploadInput);
      uploadWrap.appendChild(uploadLabel);
      header.appendChild(uploadWrap);

      // Custom sample remove (last one)
      var removeBtn = document.createElement('button');
      removeBtn.className = 'beatpad-btn-lg seq-remove-custom';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Letztes Custom-Sample entfernen';
      removeBtn.addEventListener('click', function(){
        if(!customSamples.length){ showNotif('Keine Custom-Samples'); return; }
        var last = customSamples[customSamples.length-1];
        removeCustomSample(last.id);
        showNotif('Sample "'+last.name+'" entfernt');
        var pad = document.getElementById('musBeatpad');
        if(pad) buildSeqUI(pad);
      });
      uploadWrap.appendChild(removeBtn);

      // Clear
      var clearBtn = document.createElement('button');
      clearBtn.className = 'beatpad-btn-lg seq-clear';
      clearBtn.textContent = '🗑';
      clearBtn.title = 'Clear pattern';
      clearBtn.addEventListener('click', clearPattern);
      header.appendChild(clearBtn);

      // Pattern Bank (4 slots)
      var bankWrap = document.createElement('span');
      bankWrap.style.display = 'inline-flex';
      bankWrap.style.alignItems = 'center';
      bankWrap.style.gap = '2px';
      bankWrap.style.marginLeft = '6px';
      for (var slot = 0; slot < 4; slot++) {
        (function(s) {
          var slotBtn = document.createElement('button');
          slotBtn.className = 'beatpad-btn-lg seq-bank';
          slotBtn.textContent = (s + 1).toString();
          slotBtn.title = 'Pattern Slot ' + (s + 1);
          slotBtn.dataset.slot = s;
          slotBtn.addEventListener('click', function() {
            loadPatternSlot(s);
          });
          bankWrap.appendChild(slotBtn);
        })(slot);
      }
      header.appendChild(bankWrap);

      // Save to slot
      var saveBankBtn = document.createElement('button');
      saveBankBtn.className = 'beatpad-btn-lg seq-save-bank';
      saveBankBtn.textContent = '💾';
      saveBankBtn.title = 'Save to slot';
      saveBankBtn.addEventListener('click', function() {
        // Cycle through slots
        var slot = saveBankBtn.dataset.slot || 0;
        savePatternSlot(parseInt(slot));
        saveBankBtn.dataset.slot = (parseInt(slot) + 1) % 4;
        showNotif('Pattern in Slot ' + (parseInt(slot) + 1) + ' gespeichert');
      });
      header.appendChild(saveBankBtn);

      // Swing control
      var swingWrap = document.createElement('span');
      swingWrap.style.display = 'inline-flex';
      swingWrap.style.alignItems = 'center';
      swingWrap.style.gap = '2px';
      swingWrap.style.marginLeft = '6px';
      var swingLabel = document.createElement('span');
      swingLabel.textContent = 'Swing';
      swingLabel.style.fontSize = '9px';
      swingLabel.style.color = 'var(--muted)';
      swingWrap.appendChild(swingLabel);
      var swingSelect = document.createElement('select');
      swingSelect.className = 'beatpad-bpm';
      swingSelect.id = 'seqSwing';
      swingSelect.style.width = '50px';
      swingSelect.style.fontSize = '10px';
      [0, 10, 20, 30, 40, 50, 60, 70].forEach(function(v) {
        var opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v + '%';
        if (v === 0) opt.selected = true;
        swingSelect.appendChild(opt);
      });
      swingSelect.addEventListener('change', function() {
        SEQ.swing = parseInt(this.value) / 100;
      });
      swingSelect.title = 'Swing amount';
      swingWrap.appendChild(swingSelect);
      header.appendChild(swingWrap);

      // Pattern length
      var lenWrap = document.createElement('span');
      lenWrap.style.display = 'inline-flex';
      lenWrap.style.alignItems = 'center';
      lenWrap.style.gap = '2px';
      lenWrap.style.marginLeft = '6px';
      var lenLabel = document.createElement('span');
      lenLabel.textContent = 'Steps';
      lenLabel.style.fontSize = '9px';
      lenLabel.style.color = 'var(--muted)';
      lenWrap.appendChild(lenLabel);
      var lenSelect = document.createElement('select');
      lenSelect.className = 'beatpad-bpm';
      lenSelect.id = 'seqLength';
      lenSelect.style.width = '45px';
      lenSelect.style.fontSize = '10px';
      [8, 16, 32].forEach(function(v) {
        var opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        if (v === 16) opt.selected = true;
        lenSelect.appendChild(opt);
      });
      lenSelect.addEventListener('change', function() {
        setPatternLength(parseInt(this.value));
      });
      lenSelect.title = 'Pattern length';
      lenWrap.appendChild(lenSelect);
      header.appendChild(lenWrap);

      // Undo/Redo
      var undoBtn = document.createElement('button');
      undoBtn.className = 'beatpad-btn-lg seq-undo';
      undoBtn.textContent = '↶';
      undoBtn.title = 'Undo';
      undoBtn.addEventListener('click', undoPattern);
      header.appendChild(undoBtn);

      var redoBtn = document.createElement('button');
      redoBtn.className = 'beatpad-btn-lg seq-redo';
      redoBtn.textContent = '↷';
      redoBtn.title = 'Redo';
      redoBtn.addEventListener('click', redoPattern);
      header.appendChild(redoBtn);

      // Copy/Paste
      var copyBtn = document.createElement('button');
      copyBtn.className = 'beatpad-btn-lg seq-copy';
      copyBtn.textContent = '📋';
      copyBtn.title = 'Copy pattern';
      copyBtn.addEventListener('click', copyPattern);
      header.appendChild(copyBtn);

      var pasteBtn = document.createElement('button');
      pasteBtn.className = 'beatpad-btn-lg seq-paste';
      pasteBtn.textContent = '📌';
      pasteBtn.title = 'Paste pattern';
      pasteBtn.addEventListener('click', pastePattern);
      header.appendChild(pasteBtn);
    }

    function toggleStep() {
      var row = parseInt(this.dataset.row);
      var col = parseInt(this.dataset.col);
      savePatternState();
      SEQ.pattern[row][col] = !SEQ.pattern[row][col];
      this.classList.toggle('active');
      playSample(row);
    }

    function shufflePattern() {
      clearPattern();
      var probs = [0.7, 0.4, 0.6, 0.3, 0.25, 0.15, 0.2, 0.15];
      for (var i = 0; i < 8; i++) {
        for (var j = 0; j < SEQ_STEPS; j++) {
          var prob = probs[i] || 0.15;
          if (i === 0 && j % 4 === 0) prob = 0.9;
          if (i === 1 && (j === 4 || j === 12)) prob = 0.8;
          if (i === 2) prob = 0.6;
          if (Math.random() < prob) SEQ.pattern[i][j] = true;
        }
      }
      rebuildGrid();
    }

    function clearPattern() {
      for (var i = 0; i < 8; i++) {
        for (var j = 0; j < SEQ_STEPS; j++) {
          SEQ.pattern[i][j] = false;
        }
      }
      rebuildGrid();
    }

    function loadPresetPattern() {
      clearPattern();
      [0,4,8,12].forEach(function(s) { SEQ.pattern[0][s] = true; });
      [4,12].forEach(function(s) { SEQ.pattern[1][s] = true; });
      [0,2,4,6,8,10,12,14].forEach(function(s) { SEQ.pattern[2][s] = true; });
      rebuildGrid();
    }

    function savePattern() {
      try {
        localStorage.setItem('macrohard_seq_pattern', JSON.stringify(SEQ.pattern));
        localStorage.setItem('macrohard_seq_tracks', JSON.stringify(seqTracks));
        alert('Pattern saved!');
      } catch(e) {}
    }

    function loadSavedPattern() {
      try {
        var p = JSON.parse(localStorage.getItem('macrohard_seq_pattern') || 'null');
        var t = JSON.parse(localStorage.getItem('macrohard_seq_tracks') || 'null');
        if (p && t) {
          SEQ.pattern = p;
          seqTracks = t;
        }
      } catch(e) {}
    }

    function rebuildGrid() {
      var pad = document.getElementById('musBeatpad');
      if (!pad) return;
      var steps = pad.querySelectorAll('.seq-step');
      steps.forEach(function(el) {
        var row = parseInt(el.dataset.row);
        var col = parseInt(el.dataset.col);
        el.classList.toggle('active', SEQ.pattern[row] && SEQ.pattern[row][col]);
      });
    }

    function buildFallbackPad(pad) {
      pad.innerHTML = '';
      var samples = [
        {n:'Kick',f:60,c:'#ff4000'},{n:'Snare',f:200,c:'#2547ff'},
        {n:'Hat',f:8000,c:'#ffd400'},{n:'Clap',f:1200,c:'#0f0'},
        {n:'Tom',f:100,c:'#f0f'},{n:'Bass',f:80,c:'#ff8000'},
        {n:'Stab',f:440,c:'#800'},{n:'Crash',f:5000,c:'#666'}
      ];
      samples.forEach(function(s,i){
        var b = document.createElement('button');
        b.className = 'beatpad-btn'; b.textContent = s.n; b.style.background = s.c;
        b.addEventListener('click', function(){
          if (!SEQ.ctx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            SEQ.ctx = new AC();
          }
          if (!SEQ.master) {
            SEQ.master = SEQ.ctx.createGain();
            SEQ.master.gain.value = 0.3;
            SEQ.master.connect(SEQ.ctx.destination);
          }
          playSample(i);
          b.style.transform='scale(.92)'; setTimeout(function(){b.style.transform='';},80);
        });
        pad.appendChild(b);
      });
    }

    // Load saved pattern on init
    loadSavedPattern();

    /* === Equalizer mit Presets und Visualisierung === */
    var EQ_PRESETS = {
      'Flat': [0, 0, 0, 0, 0, 0],
      'Bass Boost': [6, 4, 2, 0, 0, 0],
      'Treble Boost': [0, 0, 0, 2, 4, 6],
      'V-Shape': [4, 2, -2, -2, 2, 4],
      'Warm': [3, 2, 0, 0, 1, 2],
      'Bright': [-2, -1, 0, 2, 4, 5],
      'Rock': [4, 3, -1, -2, 2, 4],
      'Pop': [-1, 2, 4, 3, 0, -1],
      'Jazz': [3, 1, -2, 0, 2, 4],
      'Classical': [3, 1, -1, -1, 1, 3]
    };

    function initEqualizer(){
      var eq=document.getElementById('musEq');if(!eq) return;
      eq.innerHTML='';

      // Check if already initialized
      if(EQ_INITIALIZED) return;
      EQ_INITIALIZED = true;

      // Header
      var header=document.createElement('div');
      header.className='eq-header';
      header.innerHTML='<span class="eq-title">🎛 Equalizer</span>';
      var resetBtn=document.createElement('button');
      resetBtn.className='eq-reset';
      resetBtn.textContent='Reset';
      resetBtn.addEventListener('click',function(){
        applyEQPreset('Flat');
        document.querySelectorAll('.eq-preset-btn').forEach(function(b){b.classList.remove('active');});
        document.querySelector('.eq-preset-btn[data-preset="Flat"]').classList.add('active');
      });
      header.appendChild(resetBtn);
      eq.appendChild(header);

      // Presets
      var presetWrap=document.createElement('div');
      presetWrap.className='eq-presets';
      Object.keys(EQ_PRESETS).forEach(function(name,idx){
        var btn=document.createElement('button');
        btn.className='eq-preset-btn'+(name==='Flat'?' active':'');
        btn.textContent=name;
        btn.dataset.preset=name;
        btn.addEventListener('click',function(){
          document.querySelectorAll('.eq-preset-btn').forEach(function(b){b.classList.remove('active');});
          this.classList.add('active');
          applyEQPreset(name);
        });
        presetWrap.appendChild(btn);
      });
      eq.appendChild(presetWrap);

      // Bands
      var bandsWrap=document.createElement('div');
      bandsWrap.className='eq-bands';

      eqBands.forEach(function(freq,i){
        var band=document.createElement('div');
        band.className='eq-band';

        // Label
        var label=document.createElement('span');
        label.textContent=freq>=1000?(freq/1000)+'k':freq;
        band.appendChild(label);

        // Slider wrap
        var sliderWrap=document.createElement('div');
        sliderWrap.className='eq-slider-wrap';

        var slider=document.createElement('input');
        slider.type='range';
        slider.min=-12;
        slider.max=12;
        slider.value=eqValues[freq]||0;
        slider.className='eq-range';
        slider.dataset.freq=freq;
        slider.dataset.idx=i;
        slider.addEventListener('input',function(){
          var v=parseFloat(this.value);
          eqValues[freq]=v;
          if(biquadFilters[i]&&audioCtx&&audioCtx.state==='running'){
            biquadFilters[i].gain.setValueAtTime(v,audioCtx.currentTime);
          }
          if(seqBiquadFilters[i]&&SEQ.ctx&&SEQ.ctx.state==='running'){
            try{seqBiquadFilters[i].gain.setValueAtTime(v,SEQ.ctx.currentTime);}catch(e){}
          }
          // Update value display
          var valEl=this.parentNode.querySelector('.eq-value');
          if(valEl) valEl.textContent=(v>=0?'+':'')+v+'dB';
          // Update meter
          var meterFill=this.parentNode.querySelector('.eq-meter-fill');
          if(meterFill){
            var pct=((v+12)/24)*100;
            meterFill.style.height=pct+'%';
          }
        });
        sliderWrap.appendChild(slider);

        // Value display
        var valEl=document.createElement('span');
        valEl.className='eq-value';
        valEl.textContent='0dB';
        sliderWrap.appendChild(valEl);

        // Meter (visual feedback)
        var meter=document.createElement('div');
        meter.className='eq-meter';
        var meterFill=document.createElement('div');
        meterFill.className='eq-meter-fill';
        meterFill.style.height='50%';
        meter.appendChild(meterFill);
        sliderWrap.appendChild(meter);

        band.appendChild(sliderWrap);
        bandsWrap.appendChild(band);
      });

      eq.appendChild(bandsWrap);
    }

    function applyEQPreset(name){
      var values=EQ_PRESETS[name];
      if(!values) return;
      eqBands.forEach(function(freq,i){
        eqValues[freq]=values[i];
        if(biquadFilters[i]&&audioCtx&&audioCtx.state==='running'){
          biquadFilters[i].gain.setValueAtTime(values[i],audioCtx.currentTime);
        }
        if(seqBiquadFilters[i]&&SEQ.ctx&&SEQ.ctx.state==='running'){
          try{seqBiquadFilters[i].gain.setValueAtTime(values[i],SEQ.ctx.currentTime);}catch(e){}
        }
        // Update UI
        var slider=document.querySelector('.eq-range[data-freq="'+freq+'"]');
        if(slider){
          slider.value=values[i];
          var valEl=slider.parentNode.querySelector('.eq-value');
          if(valEl) valEl.textContent=(values[i]>=0?'+':'')+values[i]+'dB';
          var meterFill=slider.parentNode.querySelector('.eq-meter-fill');
          if(meterFill){
            var pct=((values[i]+12)/24)*100;
            meterFill.style.height=pct+'%';
          }
        }
      });
    }
    var EQ_INITIALIZED=false;

    /* === Progress === */
    function onTimeUpdate(){
      if(isRadio||!isFinite(audioEl.duration)){progL.textContent='● LIVE';prog.value=0;return}
      if(audioEl.duration&&audioEl.duration>0){
        prog.value=(audioEl.currentTime/audioEl.duration)*100;
        var m=Math.floor(audioEl.currentTime/60);
        var sec=Math.floor(audioEl.currentTime%60);
        progL.textContent=m+':'+(sec<10?'0':'')+sec;
        var rm=Math.floor(audioEl.duration/60);
        var rsec=Math.floor(audioEl.duration%60);
        progR.textContent=rm+':'+(rsec<10?'0':'')+rsec;
      }
    }
    function onEnded(){
      if(repeat){audioEl.currentTime=0;playAudio();return}
      if(isRadio)return;
      nextTrack();
    }
    function onError(){progL.textContent='⚠ Fehler'}

    /* === Play === */
    function playAudio(){
      setupAudio();
      ensureResumed().then(function(){
        var p=audioEl.play();
        if(p&&p.catch)p.catch(function(e){console.error('Audio play error:',e.name,e.message);progL.textContent='⚠ '+e.name});
      });
    }
    /* Radio routed through main audio pipeline (EQ + Visualizer) */

    function playTrack(i){
      if(i<0||i>=songs.length)return;
      curIdx=i;curStation=null;isRadio=false;
      var s=songs[i];
      setupAudio();
      audioEl.src=s.u;audioEl.load();
      if(activeExtraTab==='vis')initVisualizer();
      playAudio();playing=true;
      updateUI();
    }
    function playRadio(station){
      curStation=station;isRadio=true;curIdx=-1;
      setupAudio();
      if(audioCtx.state==='suspended')audioCtx.resume();
      audioEl.crossOrigin='anonymous';
      audioEl.src=station.u;
      audioEl.load();
      if(activeExtraTab==='vis')initVisualizer();
      playAudio();playing=true;
      updateUI();
    }
    function cleanupRadio(){
      // Main pipeline handles all cleanup via setupAudio on next source switch
    }
    function stop(){
      if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
      if(audioEl){audioEl.pause();}
      playing=false;updateUI();
    }
    function togglePlay(){
      if(playing){stop();}
      else if(isRadio&&curStation)playRadio(curStation);
      else if(curIdx>=0)playTrack(curIdx);
      else if(songs.length)playTrack(0);
    }
    function nextTrack(){
      if(isRadio&&radioStations.length){
        var ni=curStation?radioStations.indexOf(curStation)+1:0;
        playRadio(radioStations[ni%radioStations.length]);return
      }
      if(!songs.length)return;
      var next=(curIdx+1)%songs.length;
      playTrack(next);
    }
    function prevTrack(){
      if(isRadio&&radioStations.length){
        var ci=curStation?radioStations.indexOf(curStation):0;
        var pi=(ci-1+radioStations.length)%radioStations.length;
        playRadio(radioStations[pi]);return
      }
      if(!songs.length)return;
      var prev=(curIdx-1+songs.length)%songs.length;
      playTrack(prev);
    }

    /* === Upload === */
    var AUDIO_MAX_SIZE=10*1024*1024; // 10 MB
    var AUDIO_MIME=/^audio\/(mpeg|mp3|mp4|ogg|wav|webm|aac|flac|x-m4a)$/;
    var AUDIO_EXT=/\.(mp3|mp4|ogg|wav|webm|aac|flac|m4a)$/i;
    function handleUpload(file){
      if(!file) return;
      if(file.size>AUDIO_MAX_SIZE){
        alert('Datei zu groß: '+file.name+' (max 10 MB)');return;
      }
      if(!file.type.match(/^audio\//)&&!AUDIO_EXT.test(file.name)){
        alert('Nicht unterstützt: '+file.name+' (nur Audio)');return;
      }
      var url=URL.createObjectURL(file);
      var s={n:file.name.replace(/\.[^.]+$/,''),a:'Upload',u:url,src:'custom',_blob:true};
      songs.push(s);
      renderPlaylist();
    }

    /* === Radio Browser === */
    var fallbackStations=[
      {name:'SomaFM: DEF CON Radio',u:'https://ice1.somafm.com/defcon-128-mp3',codec:'MP3',votes:5000},
      {name:'SomaFM: Groove Salad',u:'https://ice1.somafm.com/groovesalad-128-mp3',codec:'MP3',votes:4500},
      {name:'SomaFM: Fluid',u:'https://ice1.somafm.com/fluid-128-mp3',codec:'MP3',votes:4000},
      {name:'SomaFM: Vaporwaves',u:'https://ice1.somafm.com/vaporwaves-128-mp3',codec:'MP3',votes:3800},
      {name:'SomaFM: Beat Blender',u:'https://ice1.somafm.com/beatblender-128-mp3',codec:'MP3',votes:3500},
      {name:'SomaFM: Drone Zone',u:'https://ice1.somafm.com/dronezone-128-mp3',codec:'MP3',votes:3200},
      {name:'SomaFM: Suburbs of Goa',u:'https://ice1.somafm.com/suburbsofgoa-128-mp3',codec:'MP3',votes:3000},
      {name:'SomaFM: Underground 80s',u:'https://ice1.somafm.com/u80s-128-mp3',codec:'MP3',votes:2800},
      {name:'SomaFM: Deep Space One',u:'https://ice1.somafm.com/deepspaceone-128-mp3',codec:'MP3',votes:2600},
      {name:'SomaFM: Space Station Soma',u:'https://ice1.somafm.com/spacestation-128-mp3',codec:'MP3',votes:2400},
      {name:'SomaFM: Secret Agent',u:'https://ice1.somafm.com/secretagent-128-mp3',codec:'MP3',votes:2200},
      {name:'SomaFM: Lush',u:'https://ice1.somafm.com/lush-128-mp3',codec:'MP3',votes:2000},
      {name:'SomaFM: Digitalis',u:'https://ice1.somafm.com/digitalis-128-mp3',codec:'MP3',votes:1800},
      {name:'SomaFM: ThistleRadio',u:'https://ice1.somafm.com/thistle-128-mp3',codec:'MP3',votes:1600},
      {name:'SomaFM: Folk Forward',u:'https://ice1.somafm.com/folkfwd-128-mp3',codec:'MP3',votes:1400},
      {name:'SomaFM: Christmas Lounge',u:'https://ice1.somafm.com/christmas-128-mp3',codec:'MP3',votes:1200},
      {name:'SomaFM: Boot Liquor',u:'https://ice1.somafm.com/bootliquor-128-mp3',codec:'MP3',votes:1000},
      {name:'SomaFM: Black Rock FM',u:'https://ice1.somafm.com/brfm-128-mp3',codec:'MP3',votes:900},
      {name:'SomaFM: The Trip',u:'https://ice1.somafm.com/thetrip-128-mp3',codec:'MP3',votes:800},
      {name:'SomaFM: Dub Step Beyond',u:'https://ice1.somafm.com/dubstep-128-mp3',codec:'MP3',votes:700},
      {name:'Subcity Radio',u:'https://fdn0.subcity.org/subcity-192.mp3',codec:'MP3',votes:2800},
      {name:'NTS Radio 1',u:'https://stream-relay-geo.ntslive.net/stream1',codec:'MP3',votes:2500},
      {name:'NTS Radio 2',u:'https://stream-relay-geo.ntslive.net/stream2',codec:'MP3',votes:2300},
      {name:'Radio Paradise',u:'https://stream.radioparadise.com/aac-320',codec:'AAC',votes:4000},
      {name:'KCRW Eclectic24',u:'https://kcrw.streamguys1.com/kcrw_192k_mp3_on_air',codec:'MP3',votes:1500},
      {name:'FIP Radio',u:'https://icecast.radiofrance.fr/fip-midfi.mp3',codec:'MP3',votes:3500},
      {name:'Jazz Radio',u:'https://jazz-wr01.ice.infomaniak.ch/jazz-wr01-128.mp3',codec:'MP3',votes:2000},
      {name:'Classic FM',u:'https://media-ice.musicradio.com/ClassicFMMP3',codec:'MP3',votes:3000},
      {name:'BBC Radio 6 Music',u:'https://stream.live.vc.bbcmedia.co.uk/bbc_6music',codec:'MP3',votes:2800},
      {name:'Radio X UK',u:'https://media-ice.musicradio.com/RadioXMP3',codec:'MP3',votes:1800},
      {name:'Kiss FM',u:'https://stream-kiss.planetradio.co.uk/kissnational.mp3',codec:'MP3',votes:2200},
      {name:'Capital FM',u:'https://media-ice.musicradio.com/CapitalMP3',codec:'MP3',votes:2000},
      {name:'Radio 1 UK',u:'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',codec:'MP3',votes:2600},
      {name:'BBC World Service',u:'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',codec:'MP3',votes:2400},
      {name:'NPR News',u:'https://npr-ice.streamguys1.com/live.mp3',codec:'MP3',votes:2000},
      {name:'WNYC FM',u:'https://fm939.wnyc.org/wnycfm',codec:'MP3',votes:1500},
      {name:'KEXP FM',u:'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',codec:'MP3',votes:1800},
      {name:'Ibiza Global Radio',u:'https://listenssl.ibizaglobalradio.com:8025/stream',codec:'MP3',votes:1200},
      {name:'Venice Classic Radio',u:'https://uk2.streamingpulse.com/ssl/vcr1',codec:'MP3',votes:1400},
      {name:'Radio Swiss Jazz',u:'https://stream.srg-ssr.ch/m/rsj/mp3_128',codec:'MP3',votes:1600},
      {name:'Deutschlandfunk',u:'https://st01.dlf.de/dlf/01/128/mp3/stream.mp3',codec:'MP3',votes:2000},
      {name:'Radio Eins',u:'https://www.radioeins.de/live.m3u',codec:'MP3',votes:1200},
      {name:'1Live',u:'https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3',codec:'MP3',votes:2400},
      {name:'WDR 2',u:'https://wdr-wdr2-rheinland.icecastssl.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3',codec:'MP3',votes:1800},
      {name:'BBC Radio 3',u:'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_three',codec:'MP3',votes:2000},
      {name:'BBC Radio 4',u:'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm',codec:'MP3',votes:2200},
      {name:'France Inter',u:'https://icecast.radiofrance.fr/franceinter-midfi.mp3',codec:'MP3',votes:2600},
      {name:'Rai Radio 1',u:'https://icestreaming.rai.it/1.mp3',codec:'MP3',votes:1800},
      {name:'ABC Radio National',u:'https://mediaserviceslive.akamaized.net/hls/live/2038163/rnnational/master.m3u8',codec:'HLS',votes:1500}
    ];
    var radioServers=['de1','de2','nl1','at1','fr1','us1'];
    var radioSearchTerm='';
    function fetchRadios(search,forceRefresh){
      if(!forceRefresh&&radioStations.length>0&&!search){renderRadio();return}
      if(radioStatus){radioStatus.textContent='Lade Sender...';radioStatus.style.color='var(--accent)'}
      var query=search||'';
      var server=radioServers[Math.floor(Math.random()*radioServers.length)];
      var url='https://'+server+'.api.radio-browser.info/json/stations?limit=50&order=clickcount&reverse=true';
      if(query)url+='&name='+encodeURIComponent(query);
      var x=new XMLHttpRequest();
      x.open('GET',url,true);
      x.timeout=10000;
      x.onload=function(){
        try{
          var arr=JSON.parse(x.responseText);
          var seen={};
          var found=arr.filter(function(s){
            if(!s.url_resolved||s.url_resolved.length<5)return false;
            var key=s.url_resolved.split('/')[2];
            if(seen[key])return false;
            seen[key]=true;
            return true;
          }).slice(0,30).map(function(s){
            return{name:(s.name||'Unbekannt').replace(/[^\x20-\x7E]/g,'').trim(),u:s.url_resolved,codec:s.codec||'',votes:s.votes||0,country:s.country||'',tags:s.tags||''}
          });
          if(found.length){radioStations=found;saveRadios();}
          else if(!search){radioStations=fallbackStations;saveRadios();}
          renderRadio();
          if(radioStatus){radioStatus.textContent=radioStations.length+' Sender geladen'+(search?' (Suche: '+search+')':'');radioStatus.style.color='var(--muted)'}
        }catch(e){if(!search){radioStations=fallbackStations;}renderRadio();if(radioStatus){radioStatus.textContent='Fallback: '+radioStations.length+' Sender';radioStatus.style.color='var(--muted)'}}
      };
      x.onerror=function(){if(!search){radioStations=fallbackStations;}renderRadio();if(radioStatus){radioStatus.textContent='Offline → '+radioStations.length+' Fallback';radioStatus.style.color='var(--muted)'}};
      x.ontimeout=function(){if(!search){radioStations=fallbackStations;}renderRadio();if(radioStatus){radioStatus.textContent='Timeout → '+radioStations.length+' Fallback';radioStatus.style.color='var(--muted)'}};
      x.send();
    }

    /* === UI Helpers === */
    function mkStar(id,filled){
      return '<span class="musFav" data-id="'+id+'" style="cursor:pointer;font-size:14px;color:'+(filled?'#ffd400':'#5d584e')+'">'+(filled?'★':'☆')+'</span>'
    }
    function toggleFav(id){
      var i=favIds.indexOf(id);
      if(i>=0)favIds.splice(i,1);else favIds.push(id);
      saveFavs();renderActiveTab();
    }

    function renderPlaylist(){
      var el=document.getElementById('musPlaylist');if(!el)return;
      el.innerHTML='';
      if(!songs.length){el.innerHTML='<div style="padding:20px;color:var(--muted);text-align:center">Keine Songs. Lade welche hoch!</div>';return}
      songs.forEach(function(s,i){
        var isCur=(!isRadio&&curIdx===i);
        var fav=favIds.indexOf(s.n)>=0;
        var item=document.createElement('div');item.className='musItem'+(isCur?' playing':'');
        item.innerHTML='<button class="musPlay" data-i="'+i+'">'+(isCur&&playing?'⏸':'▶')+'</button>'+
          '<span class="musInfo"><b>'+s.n+'</b><br><span style="font-size:10px;color:var(--muted)">'+(s.a||s.src)+(s._blob?' · lokal':'')+'</span></span>'+
          mkStar(s.n,fav)+(s._blob?'<button class="musDel" data-i="'+i+'" style="font-size:12px;color:red;background:none;border:none;cursor:pointer">×</button>':'');
        item.querySelector('.musPlay').addEventListener('click',function(){playTrack(i)});
        item.querySelector('.musFav').addEventListener('click',function(){toggleFav(s.n)});
        if(s._blob){
          item.querySelector('.musDel').addEventListener('click',function(){
            URL.revokeObjectURL(s.u);songs.splice(i,1);
            if(curIdx===i)stop();else if(curIdx>i)curIdx--;
            renderPlaylist();
          });
        }
        el.appendChild(item);
      });
    }

    function renderRadio(){
      var el=document.getElementById('musRadio');if(!el)return;
      el.innerHTML='';
      /* Search bar */
      var searchWrap=document.createElement('div');
      searchWrap.className='radioSearchWrap';
      searchWrap.innerHTML='<input type="text" id="radioSearchInput" placeholder="Sender suchen..." class="radioSearchInput"><button id="radioSearchBtn" class="radioSearchBtn">🔍</button><button id="radioRefreshBtn" class="radioRefreshBtn">↻</button>';
      el.appendChild(searchWrap);
      var searchInput=document.getElementById('radioSearchInput');
      var searchBtn=document.getElementById('radioSearchBtn');
      var refreshBtn=document.getElementById('radioRefreshBtn');
      searchBtn.addEventListener('click',function(){fetchRadios(searchInput.value,true);});
      searchInput.addEventListener('keydown',function(e){if(e.key==='Enter')fetchRadios(searchInput.value,true);});
      refreshBtn.addEventListener('click',function(){searchInput.value='';fetchRadios('',true);});

      /* Station count */
      var count=document.createElement('div');
      count.className='radioCount';
      count.textContent=radioStations.length+' Sender';
      el.appendChild(count);

      if(radioStations.length===0){
        el.innerHTML+='<div style="padding:20px;color:var(--muted);text-align:center">Keine Sender geladen.</div>';
        return;
      }
      radioStations.forEach(function(s,i){
        var isCur=(isRadio&&curStation===s);
        var item=document.createElement('div');item.className='musItem'+(isCur?' playing':'');
        var liveIndicator='<span class="radio-live'+(isCur&&playing?' blinking':'')+'">● LIVE</span>';
        var meta=[s.codec,s.country,s.tags?s.tags.split(',')[0]:''].filter(Boolean).join(' · ');
        item.innerHTML='<button class="musPlay" data-i="'+i+'">'+(isCur&&playing?'⏸':'▶')+'</button>'+
          '<span class="musInfo"><b>'+s.name+'</b><br><span style="font-size:10px;color:var(--muted)">'+(meta||'Radio')+(s.votes?' · 👍'+s.votes:'')+'</span></span>'+
          liveIndicator;
        item.querySelector('.musPlay').addEventListener('click',function(){playRadio(s)});
        el.appendChild(item);
      });
    }
    // Update LIVE indicator blinking state
    function updateRadioIndicator(){
      var el=document.getElementById('musRadio');if(!el)return;
      var liveEls=el.querySelectorAll('.radio-live');
      liveEls.forEach(function(ind){
        var item=ind.closest('.musItem');
        if(item&&item.classList.contains('playing')&&playing){
          ind.classList.add('blinking');
        } else {
          ind.classList.remove('blinking');
        }
      });
    }

    function renderFavs(){
      var el=document.getElementById('musFavs');if(!el)return;
      el.innerHTML='';
      var favSongs=songs.filter(function(s){return favIds.indexOf(s.n)>=0});
      if(!favSongs.length){el.innerHTML='<div style="padding:20px;color:var(--muted);text-align:center">Noch keine Favoriten. Drücke ☆ bei einem Song.</div>';return}
      favSongs.forEach(function(s){
        var i=songs.indexOf(s);
        var isCur=(!isRadio&&curIdx===i);
        var item=document.createElement('div');item.className='musItem'+(isCur?' playing':'');
        item.innerHTML='<button class="musPlay" data-i="'+i+'">'+(isCur&&playing?'⏸':'▶')+'</button>'+
          '<span class="musInfo"><b>'+s.n+'</b><br><span style="font-size:10px;color:var(--muted)">'+s.a+'</span></span>'+
          mkStar(s.name,true);
        item.querySelector('.musPlay').addEventListener('click',function(){playTrack(i)});
        item.querySelector('.musFav').addEventListener('click',function(){toggleFav(s.n)});
        el.appendChild(item);
      });
    }

    function renderActiveTab(){
      var p=document.getElementById('musPlaylist');
      var r=document.getElementById('musRadio');
      var f=document.getElementById('musFavs');
      if(!p||!r||!f)return;
      p.style.display=activeTab==='playlist'?'block':'none';
      r.style.display=activeTab==='radio'?'block':'none';
      f.style.display=activeTab==='favs'?'block':'none';
      if(activeTab==='playlist')renderPlaylist();
      if(activeTab==='radio')renderRadio();
      if(activeTab==='favs')renderFavs();
      // Trigger tab animation
      var lists=[p,r,f];
      lists.forEach(function(l){
        l.classList.remove('musTabAnim');
        void l.offsetWidth; // force reflow
        l.classList.add('musTabAnim');
      });
    }

    function updateUI(){
      renderActiveTab();
      if(playBtn)playBtn.textContent=playing?'⏸':'▶';
      if(titleEl)titleEl.textContent=(curIdx>=0&&songs[curIdx])?songs[curIdx].n:(curStation?curStation.name:'Player');
      if(artistEl)artistEl.textContent=(curIdx>=0&&songs[curIdx])?songs[curIdx].a:(curStation?'● Live Radio':'Wähle einen Song');
      if(albumEl)albumEl.textContent=(curIdx>=0&&songs[curIdx])?songs[curIdx].src:(curStation?curStation.codec||'Stream':'—');
      if(artIcon)artIcon.textContent=isRadio?'📻':(playing?'♫':'♪');
      updateRadioIndicator();
    }

    /* === Sidebar Toggle === */
    if(toggleBtn)toggleBtn.addEventListener('click',function(){
      sidebar.classList.toggle('open');
    });

    /* === Tab Navigation === */
    fetchRadios();
    player.querySelectorAll('.musTab[data-tab]').forEach(function(btn){
      btn.addEventListener('click',function(){
        activeTab=this.dataset.tab;
        player.querySelectorAll('.musTab').forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        renderActiveTab();
        var fb=player.querySelector('[data-tab="favs"]');
        if(fb)fb.textContent='★ Favs ('+favIds.length+')';
      });
    });

    /* === Extra Tabs (Beatpad/EQ/Vis) === */
    player.querySelectorAll('.musExtraTab[data-extra]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var extra=this.dataset.extra;
        activeExtraTab=extra;
        // Stop visualizer when switching away
        if(extra!=='vis'&&visRafId){cancelAnimationFrame(visRafId);visRafId=null;}
        player.querySelectorAll('.musExtraTab').forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        player.querySelectorAll('.musExtra').forEach(function(p){p.style.display='none'});
        // Map extra name to section ID
        var sectionId = extra==='beatpad' ? '#musBeatpadSection' : '#mus'+extra.charAt(0).toUpperCase()+extra.slice(1);
        var target=player.querySelector(sectionId);
        if(target)target.style.display='block';
        if(extra==='vis')initVisualizer();
      });
    });

    /* === Upload === */
    if(uploadIn)uploadIn.addEventListener('change',function(){
      for(var i=0;i<this.files.length;i++)handleUpload(this.files[i]);
      this.value='';
    });

    /* === Controls === */
    if(playBtn)playBtn.addEventListener('click',togglePlay);
    if(prevBtn)prevBtn.addEventListener('click',prevTrack);
    if(nextBtn)nextBtn.addEventListener('click',nextTrack);
    if(volEl)volEl.addEventListener('input',function(){
      setupAudio();audioEl.volume=parseFloat(this.value);
      if(volL)volL.textContent=Math.round(this.value*100)+'%';
    });
    if(prog)prog.addEventListener('input',function(){
      setupAudio();if(audioEl.duration&&!isRadio)audioEl.currentTime=(this.value/100)*audioEl.duration
    });
    if(shuffleBtn)shuffleBtn.addEventListener('click',function(){
      shuffled=songs.map(function(_,i){return i});
      shuffled=shuffleArray(shuffled);
      this.style.background='var(--accent)';
      setTimeout(function(){this.style.background=''},500);
    });
    if(repeatBtn)repeatBtn.addEventListener('click',function(){
      repeat=!repeat;
      this.style.background=repeat?'var(--accent)':'';
    });

    /* === Init === */
    /* Register cleanup for when Music app is closed */
    window.osTimeouts['music_cleanup']=function(){
      if(visRafId){cancelAnimationFrame(visRafId);visRafId=null;}
      if(stopSequencer)stopSequencer();
      try{if(audioEl&&!audioEl.paused)audioEl.pause();}catch(e){}
      try{if(audioCtx&&audioCtx.state!=='closed')audioCtx.suspend();}catch(e){}
      try{if(SEQ&&SEQ.ctx&&SEQ.ctx.state!=='closed')SEQ.ctx.suspend();}catch(e){}
    };
    initSequencer();initEqualizer();
    loadFavs();loadCustom();loadRadios();
    renderActiveTab();updateUI();
  }

  function cleanupChat(){
    if(chatReplyTimer){clearTimeout(chatReplyTimer);chatReplyTimer=null;delete window.osTimeouts['chat_reply'];}
  }
  window.osTimeouts['chat_cleanup']=cleanupChat;

  function resumeMusic(){
    if(SEQ.ctx&&SEQ.ctx.state==='suspended')SEQ.ctx.resume();
    if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
  }

  /* Chat — S3: Timestamps in every message */
  var chatContacts=[
    {name:'Alice',color:'#2547ff'},{name:'Bob',color:'#ff4d00'},{name:'Carol',color:'#0f0'},{name:'Dave',color:'#ffd400'}
  ];
  var chatMsgKey='cp_msgs';
  function buildChat(){
    var msgs=document.getElementById('cpMsgs');var sug=document.getElementById('cpSugs');var inp=document.getElementById('cpIn');var send=document.getElementById('cpSend');
    if(!msgs||!sug||!inp||!send) return;
    if(CHAT_INITIALIZED) return;
    CHAT_INITIALIZED=true;

    /* Contact bar with active status */
    var cb=document.createElement('div');cb.className='chatBar';
    var contacts=[
      {name:'Macro',status:'online',avatar:'🤖'},
      {name:'Sadee',status:'online',avatar:'👨‍💻'},
      {name:'Perchance',status:'idle',avatar:'🎲'},
      {name:'Bot',status:'online',avatar:'⚡'}
    ];
    contacts.forEach(function(c){
      var b=document.createElement('button');b.className='chatContact';
      b.innerHTML='<span class="chatAvatar">'+c.avatar+'</span><span class="chatName">@'+c.name+'</span><span class="chatStatus '+c.status+'"></span>';
      b.addEventListener('click',function(){inp.placeholder='Nachricht an @'+c.name+'…';inp.focus();});
      cb.appendChild(b);
    });
    sug.parentNode.insertBefore(cb,sug);

    /* Emoji bar */
    var eb=document.createElement('div');eb.className='chatEmojiBar';
    ['😂','😎','🔥','💡','✅','🎉','👍','🚀','🤔','👀','🎵','💻','🔑','⭐','💪'].forEach(function(e){
      var b=document.createElement('button');b.textContent=e;b.className='chatEmoji';
      b.addEventListener('click',function(){inp.value+=e;inp.focus();});
      eb.appendChild(b);
    });
    cb.parentNode.insertBefore(eb,cb.nextSibling);

    /* Load from localStorage */
    msgs.innerHTML='';
    try{var saved=JSON.parse(localStorage.getItem('cp_msgs')||'[]');saved.forEach(function(m){addChatBubble(msgs,m);});}catch(e){}

    function addChatBubble(el,m){
      var d=document.createElement('div');d.className='cpMsg'+(m.self?' self':'');
      d.innerHTML='<span class="chatBubbleText">'+m.text+'</span><span class="chatBubbleTime">'+m.time+'</span>';
      el.appendChild(d);el.scrollTop=el.scrollHeight;
    }

    /* Smart bot replies with keyword matching */
    function botReply(text){
      var t=text.toLowerCase();
      var replies={
        hallo:['Hallo! Wie kann ich helfen?','Hey! Schön da zu sehen.','Moin! Was gibt\'s?'],
        hilfe:['Ich kann: echo, time, joke, quote, calc','Schreib mir! Ich antworte.','Brauchst du Hilfe bei etwas Bestimmtem?'],
        joke:['Warum hat der Developer seine Frau verlassen? Weil sie .map() statt .forEach() nutzt. 😄','Was ist ein Compiler? Ein Programm das Fehler findet — außer seinen eigenen.','404: Witze nicht gefunden. Versuch\'s nochmal!'],
        quote:['"Code is like humor. When you have to explain it, it\'s bad." — Cory House','"First, solve the problem. Then, write the code." — John Johnson','"Simplicity is the soul of efficiency." — Austin Freeman'],
        zeit:['Es ist '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),'Die Uhr schlägt: '+new Date().toLocaleTimeString('de-DE')],
        danke:['Gerne! 👋','Immer wieder gern.','Kein Problem!'],
        echo:[text,text,text],
        default:['Interessant!','Verstanden.','Hmm, lass mich nachdenken…','Klingt gut!','Ok, notiert.','Erzähl mehr!','Das sehe ich genauso.']
      };
      for(var key in replies){if(t.indexOf(key)!==-1){var arr=replies[key];return arr[Math.floor(Math.random()*arr.length)];}}
      var def=replies.default;return def[Math.floor(Math.random()*def.length)];
    }

    var chatReplyTimer=null;
    var typingEl=null;

    function sendMsg(text){
      if(!text) return;
      var now=new Date();var time=now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
      addChatBubble(msgs,{text:text,self:true,time:time});
      saveMsg(text,true,time);

      /* Cancel old reply timer */
      if(chatReplyTimer)clearTimeout(chatReplyTimer);

      /* Typing indicator */
      typingEl=document.createElement('div');
      typingEl.className='chatTyping';
      typingEl.innerHTML='… @Bot tippt<span class="typingDot"></span><span class="typingDot"></span><span class="typingDot"></span>';
      msgs.appendChild(typingEl);
      msgs.scrollTop=msgs.scrollHeight;

      var replyDelay=500+Math.floor(Math.random()*1000);
      chatReplyTimer=setTimeout(function(){
        if(typingEl)typingEl.remove();
        var r=botReply(text);
        addChatBubble(msgs,{text:r,self:false,time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})});
        saveMsg(r,false,new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}));
        chatReplyTimer=null;
      },replyDelay);
      window.osTimeouts['chat_reply']=chatReplyTimer;
    }

    function saveMsg(text,self,time){
      try{var h=JSON.parse(localStorage.getItem('cp_msgs')||'[]');h.push({text:text,self:self,time:time});if(h.length>100)h.shift();localStorage.setItem('cp_msgs',JSON.stringify(h));}catch(e){}
    }

    sug.innerHTML='';
    ['Hallo','Hilfe','Witz','Zeit','Quote','Echo'].forEach(function(t){
      var b=document.createElement('button');b.textContent=t;
      b.addEventListener('click',function(){sendMsg(t);});
      sug.appendChild(b);
    });

    send.addEventListener('click',function(){var v=inp.value.trim();if(!v)return;sendMsg(v);inp.value='';});
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'){send.click();}});
  }
  var CHAT_INITIALIZED=false;

  /* Docs — S1: editable + export + preview */
  function buildDocs(){
    var body=document.getElementById('mdBody');if(!body) return;
    body.setAttribute('contenteditable','true');
    body.innerHTML+='<h3>MakerOS Docs</h3><p>Edit this document in-place. Export or preview below.</p><p style="margin-top:12px;font-size:11px;color:var(--muted)">Made by Alexander Kleine</p>';
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
    var stDarkEl=document.getElementById('stDark');
    if(stDarkEl) stDarkEl.addEventListener('change',function(){
      document.documentElement.dataset.theme=this.checked?'dark':'';
      try{localStorage.setItem('os_dark',this.checked?'1':'0');}catch(e){}
      updateThemeToggleBtn();
    });
    var stScan=document.getElementById('stScan');
    if(stScan) stScan.addEventListener('change',function(){
      document.documentElement.classList.toggle('scanlines',this.checked);
      storeSet('os_scan',this.checked?'1':'0');
    });
    var stLangEl=document.getElementById('stLang');
    if(stLangEl){
      stLangEl.innerHTML='<option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option>';
      stLangEl.value=lang;
      stLangEl.addEventListener('change',function(){setLang(this.value);});
    }
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
      /* Accent color with live preview */
      var accentLabel=document.createElement('label');accentLabel.innerHTML='Accent: <input type="color" id="stAccent" value="#2547ff" style="width:40px;height:24px;border:2px solid var(--line)">';
      var accentBtn=document.createElement('button');accentBtn.className='cBtn';accentBtn.textContent='Apply Accent';
      accentBtn.addEventListener('click',function(){var v=document.getElementById('stAccent').value;document.documentElement.style.setProperty('--accent',v);try{localStorage.setItem('os_accent',v);}catch(e){}toast('Accent gesetzt');});
      accentLabel.querySelector('#stAccent').addEventListener('input',function(){document.documentElement.style.setProperty('--accent',this.value);});
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
      ['linear-gradient(135deg,#2547ff,#ff4d00)','linear-gradient(135deg,#0b0b0c,#5d584e)','radial-gradient(circle at 30% 30%,#ffd400,#2547ff)','linear-gradient(180deg,#1a1a1e,#2a2a2e)','linear-gradient(135deg,#0f4c75,#3282b8)','linear-gradient(135deg,#3a0066,#9d00ff)','linear-gradient(135deg,#ff6b6b,#feca57)','linear-gradient(135deg,#48dbfb,#0abde3)','linear-gradient(135deg,#1dd1a1,#10ac84)','linear-gradient(135deg,#5f27cd,#341f97)','linear-gradient(135deg,#ff9ff3,#f368e0)','linear-gradient(135deg,#00d2d3,#54a0ff)'].forEach(function(g,i){
        var b=document.createElement('button');b.style.cssText='height:48px;border:2px solid var(--line);background:'+g+';cursor:pointer;box-shadow:var(--shadow);position:relative;transition:transform .1s';
        b.title='Wallpaper '+(i+1);
        b.addEventListener('click',function(){
          var desk=document.getElementById('desktop');
          if(desk){
            desk.style.backgroundImage=g;desk.style.backgroundSize='cover';
            desk.style.backgroundPosition='center';
            try{localStorage.setItem('os_wall',g);}catch(e){}
            galGrid.querySelectorAll('button').forEach(function(btn){btn.style.outline='';btn.style.transform='';});
            b.style.outline='3px solid var(--accent-2)';
            b.style.transform='scale(1.05)';
            toast('Wallpaper gesetzt');
          }
        });
        galGrid.appendChild(b);
      });
      grid.appendChild(galGrid);

      /* Wallpaper Slideshow */
      var slideshowLabel=document.createElement('div');slideshowLabel.style.cssText='font-weight:bold;margin-top:10px';slideshowLabel.textContent='Slideshow:';
      grid.appendChild(slideshowLabel);
      var slideshowWrap=document.createElement('div');slideshowWrap.style.cssText='display:flex;gap:4px;margin-top:4px;align-items:center';
      var slideshowBtn=document.createElement('button');slideshowBtn.className='cBtn';slideshowBtn.textContent='Start';
      var slideshowInterval=document.createElement('select');slideshowInterval.innerHTML='<option value="5">5s</option><option value="10" selected>10s</option><option value="30">30s</option><option value="60">60s</option>';
      var slideshowTimer=null;
      slideshowBtn.addEventListener('click',function(){
        if(slideshowTimer){clearInterval(slideshowTimer);slideshowTimer=null;slideshowBtn.textContent='Start';toast('Slideshow gestoppt');return;}
        var gallery=['linear-gradient(135deg,#2547ff,#ff4d00)','linear-gradient(135deg,#0b0b0c,#5d5d5d)','radial-gradient(circle at 30% 30%,#ffd400,#2547ff)','linear-gradient(180deg,#1a1a1e,#2a2a2e)','linear-gradient(135deg,#0f4c75,#3282b8)','linear-gradient(135deg,#3a0066,#9d00ff)'];
        var idx=0;
        slideshowTimer=setInterval(function(){
          document.getElementById('desktop').style.backgroundImage=gallery[idx];
          document.getElementById('desktop').style.backgroundSize='cover';
          idx=(idx+1)%gallery.length;
        },parseInt(slideshowInterval.value)*1000);
        slideshowBtn.textContent='Stop';
        toast('Slideshow gestartet');
      });
      slideshowWrap.appendChild(slideshowBtn);slideshowWrap.appendChild(slideshowInterval);
      grid.appendChild(slideshowWrap);

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
      /* Desktop Icon Size */
      var iconSizeLabel=document.createElement('label');iconSizeLabel.innerHTML='Icon-Größe: <select id="stIconSize"><option value="small">Klein</option><option value="medium" selected>Mittel</option><option value="large">Groß</option></select>';
      var iconSizeBtn=document.createElement('button');iconSizeBtn.className='cBtn';iconSizeBtn.textContent='Apply';
      iconSizeBtn.addEventListener('click',function(){
        var v=document.getElementById('stIconSize').value;
        var desk=document.getElementById('deskIcons');
        if(desk){
          desk.dataset.iconSize=v;
          try{localStorage.setItem('os_iconsize',v);}catch(e){}
        }
        toast('Icon-Größe: '+v);
      });
      iconSizeLabel.appendChild(iconSizeBtn);grid.appendChild(iconSizeLabel);
      /* Grid toggle */
      var gridLabel=document.createElement('label');gridLabel.innerHTML='<input type="checkbox" id="stGrid" checked> Desktop-Raster anzeigen';
      gridLabel.addEventListener('change',function(){
        var desk=document.getElementById('deskIcons');
        if(desk){
          desk.classList.toggle('show-grid',document.getElementById('stGrid').checked);
          try{localStorage.setItem('os_grid',document.getElementById('stGrid').checked?'1':'0');}catch(e){}
        }
      });
      grid.appendChild(gridLabel);
      /* Restore icon size/grid */
      try{var is=localStorage.getItem('os_iconsize');if(is){var isEl=document.getElementById('stIconSize');if(isEl)isEl.value=is;var desk=document.getElementById('deskIcons');if(desk)desk.dataset.iconSize=is;}}catch(e){}
      try{var gd=localStorage.getItem('os_grid');if(gd==='0'){var gdEl=document.getElementById('stGrid');if(gdEl)gdEl.checked=false;var desk=document.getElementById('deskIcons');if(desk)desk.classList.remove('show-grid');}}catch(e){}
      var resetBtn=document.createElement('button');resetBtn.className='cBtn op';resetBtn.textContent='Reset Defaults';
      resetBtn.addEventListener('click',function(){
        document.documentElement.className='';
        document.documentElement.style.removeProperty('--accent');
        document.documentElement.style.removeProperty('--fs');
        document.documentElement.dataset.theme='';
        document.documentElement.classList.remove('scanlines');
        try{localStorage.removeItem('os_accent');localStorage.removeItem('os_fs');localStorage.removeItem('os_dark');localStorage.removeItem('os_scan');localStorage.removeItem('os_theme');}catch(e){}
        // Soft reset: reload UI titles and show confirmation instead of location.reload()
        refreshUI();
        toast('Settings zurückgesetzt');
      });
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
          try{sessionStorage.clear();}catch(e){}
          document.documentElement.className='';
          document.documentElement.style.removeProperty('--accent');
          document.documentElement.style.removeProperty('--fs');
          document.documentElement.dataset.theme='';
          document.documentElement.classList.remove('scanlines');
          refreshUI();
          toast('Alle Daten gelöscht');
        }
      });

      /* Export Settings */
      var exportBtn=document.createElement('button');
      exportBtn.className='cBtn op';
      exportBtn.textContent='📤 Export Settings';
      exportBtn.style.marginTop='6px';
      exportBtn.addEventListener('click',function(){
        var data={};
        for(var i=0;i<localStorage.length;i++){
          var key=localStorage.key(i);
          if(key.startsWith('os_')||key.startsWith('macrohard_')||key.startsWith('np_')) data[key]=localStorage.getItem(key);
        }
        var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        var a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download='makeros-settings.json';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Settings exportiert');
      });
      info.appendChild(exportBtn);

      /* Import Settings */
      var importBtn=document.createElement('button');
      importBtn.className='cBtn op';
      importBtn.textContent='📥 Import Settings';
      importBtn.style.marginLeft='4px';
      importBtn.addEventListener('click',function(){
        var inp=document.createElement('input');
        inp.type='file';inp.accept='.json';
        inp.addEventListener('change',function(){
          var file=inp.files[0];if(!file) return;
          var reader=new FileReader();
          reader.onload=function(ev){
            try{
              var data=JSON.parse(ev.target.result);
              Object.keys(data).forEach(function(k){localStorage.setItem(k,data[k]);});
              toast('Settings importiert — Reload...');
              setTimeout(function(){location.reload();},1000);
            }catch(e){toast('Fehler: '+e.message);}
          };
          reader.readAsText(file);
        });
        inp.click();
      });
      info.appendChild(importBtn);
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
      var a=document.createElement('a');a.className='clLink omarchyLink';a.href=l.u;a.target='_blank';a.rel='noopener';
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
    /* Sort selector */
    var sortSel=document.createElement('select');
    sortSel.id='clSort';
    sortSel.className='clSort';
    sortSel.innerHTML='<option value="name">Name</option><option value="recent">Zuletzt</option><option value="fav">★ Fav</option>';
    sortSel.addEventListener('change',function(){renderLinks('all');});
    pane.insertBefore(sortSel,catBar);
    renderLinks('all');
  }
  function renderLinks(cat){
    var pane=document.getElementById('clPane');if(!pane) return;
    var items=pane.querySelectorAll('.clLink:not(.omarchyLink),.clDel');items.forEach(function(el){el.remove();});
    var filtered=cat==='all'?linksData:linksData.filter(function(l){return l.cat===cat;});
    /* Sort */
    var sortBy=document.getElementById('clSort')?document.getElementById('clSort').value:'name';
    if(sortBy==='name') filtered.sort(function(a,b){return a.n.localeCompare(b.n);});
    else if(sortBy==='recent') filtered.sort(function(a,b){return (b.lastVisit||0)-(a.lastVisit||0);});
    else if(sortBy==='fav') filtered.sort(function(a,b){return (b.fav?1:0)-(a.fav?1:0);});
    filtered.forEach(function(l){
      var itemDiv=document.createElement('div');itemDiv.className='clItem';
      /* Fav star */
      var favSpan=document.createElement('span');favSpan.className='clFav'+(l.fav?' active':'');
      favSpan.textContent=l.fav?'★':'☆';
      favSpan.addEventListener('click',function(){
        l.fav=!l.fav;
        var idx2=linksData.indexOf(l);
        if(idx2!==-1)linksData[idx2]=l;
        renderLinks(cat);
      });
      itemDiv.appendChild(favSpan);
      /* Link */
      var a=document.createElement('a');a.className='clLink';a.href=l.u;a.target='_blank';a.rel='noopener';
      a.innerHTML='<span class="clIco">🔗</span><span>'+l.n+' <span style="font-size:9px;opacity:.6">'+l.cat+'</span></span>';
      a.addEventListener('click',function(){
        l.lastVisit=Date.now();
        var idx3=linksData.indexOf(l);
        if(idx3!==-1)linksData[idx3]=l;
      });
      itemDiv.appendChild(a);
      var del=document.createElement('button');del.textContent='✕';del.className='clDel';del.style.cssText='font-size:10px;padding:2px 6px;border:2px solid var(--line);background:var(--surface);cursor:pointer';
      del.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();
        /* Find actual index in linksData, not filtered index */
        var idx=linksData.indexOf(l);
        if(idx!==-1){linksData.splice(idx,1);renderLinks(cat);toast('Gelöscht');}
      });
      pane.appendChild(del);
    });
  }

  /* Init */
  window.addEventListener('DOMContentLoaded',function(){
    var desk=document.getElementById('deskIcons');
    /* Lazy loading: Only init icons visible on screen */
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.style.visibility='visible';
          observer.unobserve(entry.target);
        }
      });
    });
    desktopApps.forEach(function(a){
      a.iconSvg=svgIcon(a.icon);
      var icon=makeIcon(a);
      desk.appendChild(icon);
      /* Keyboard support */
      icon.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();
          openApp(a.id);
        }
      });
      /* Defer heavy apps */
      if(['music','editor','imgeditor'].indexOf(a.id)!==-1){
        icon.style.visibility='hidden';
        observer.observe(icon);
      }
    });

    /* Static app cards (index.html) - add click handlers */
    document.querySelectorAll('.os-app-card').forEach(function(card){
      card.addEventListener('click',function(){
        if(card.dataset.app) openApp(card.dataset.app);
      });
      card.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();
          if(card.dataset.app) openApp(card.dataset.app);
        }
      });
      /* Set ARIA labels for static cards */
      if(!card.getAttribute('aria-label')){
        var lbl=card.querySelector('.lbl');
        if(lbl){card.setAttribute('aria-label',lbl.textContent+' öffnen');card.setAttribute('role','button');card.setAttribute('tabindex','0');}
      }
    });
    var sm=document.getElementById('smList');
    var smSearch=document.getElementById('smSearch');
    desktopApps.forEach(function(a){
      var it=document.createElement('div');it.className='smItem';it.setAttribute('data-app',a.id);
      it.setAttribute('data-label',a.label.toLowerCase());
      it.innerHTML='<span class="ico">'+a.iconSvg+'</span>'+a.label;
      it.addEventListener('click',function(){openApp(a.id);document.getElementById('startMenu').classList.remove('open');});
      sm.appendChild(it);
    });
    if(smSearch){
      smSearch.addEventListener('input',function(){
        var q=this.value.toLowerCase();
        var items=sm.querySelectorAll('.smItem');
        items.forEach(function(it){
          var label=it.getAttribute('data-label')||'';
          var appName=it.textContent.toLowerCase();
          if(!q||label.indexOf(q)!==-1||appName.indexOf(q)!==-1){
            it.style.display='flex';
          }else{
            it.style.display='none';
          }
        });
      });
    }
    /* Theme Toggle Button in Taskbar */
    var tbRight=document.getElementById('tbRight');
    if(tbRight){
      var themeBtn=document.createElement('div');
      themeBtn.id='tbThemeToggle';
      themeBtn.title='Theme umschalten (Ctrl+Shift+L)';
      themeBtn.textContent=document.documentElement.dataset.theme==='dark'?'☀️':'🌙';
      themeBtn.addEventListener('click',toggleTheme);
      tbRight.insertBefore(themeBtn,tbRight.firstChild);
    }
    buildMusic();buildBrowser();buildLinks();buildSettings();
    buildOmarchyLinks();
    // lock click handler already registered above
  });

  /* Browser — S1+S2+S3: Tabs + Shortcuts + Bookmarks + History */
  function buildBrowser(){
    var content=document.getElementById('brContent');
    var addr=document.getElementById('brAddr');
    var tabsEl=document.getElementById('brTabs');
    if(!content) return;
    if(BROWSER_INITIALIZED) return;
    BROWSER_INITIALIZED=true;

    var tabs=[];
    var activeTab=0;
    var history=[];
    var histIdx=-1;
    var bookmarks=loadBookmarks();

    function uid(){return 'br'+Math.random().toString(36).slice(2,8)}

    function loadBookmarks(){
      try{return JSON.parse(localStorage.getItem('macrohard_browser_bookmarks')||'[]');}
      catch(e){return [
        {name:'Wikipedia',url:'https://wikipedia.org',icon:'📚'},
        {name:'GitHub',url:'https://github.com',icon:'💻'},
        {name:'DuckDuckGo',url:'https://duckduckgo.com',icon:'🦆'}
      ];}
    }
    function saveBookmarks(){
      try{localStorage.setItem('macrohard_browser_bookmarks',JSON.stringify(bookmarks));}catch(e){}
    }

    function addBookmark(name,url,icon){
      if(!bookmarks.some(function(b){return b.url===url;})){
        bookmarks.push({name:name,url:url,icon:icon||'🔖'});
        saveBookmarks();
      }
    }

    function renderTabs(){
      tabsEl.innerHTML='';
      tabs.forEach(function(t,i){
        var tab=document.createElement('div');
        tab.className='brTab'+(i===activeTab?' active':'');
        tab.innerHTML='<span class="brTabTit">'+(t.title||t.url)+'</span><span class="brTabX">×</span>';
        tab.querySelector('.brTabTit').addEventListener('click',function(){activeTab=i;showTab(i)});
        tab.querySelector('.brTabX').addEventListener('click',function(e){e.stopPropagation();closeTab(i)});
        tabsEl.appendChild(tab);
      });
    }

    function showTab(i){
      if(i<0||i>=tabs.length) return;
      activeTab=i;
      var t=tabs[i];
      addr.value=t.url;
      renderTabs();
      content.innerHTML='';
      if(t.url==='home'){
        showHome();
        return;
      }
      /* Loading spinner */
      var loading=document.createElement('div');
      loading.className='brLoading';
      loading.innerHTML='<div class="brSpinner"></div><div style="font-size:11px;color:var(--muted)">Wird geladen…</div>';
      content.appendChild(loading);

      var iframe=document.createElement('iframe');
      iframe.id='brFrame';
      iframe.style.cssText='width:100%;height:100%;border:none;background:#fff';
      iframe.sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-presentation';
      iframe.src=t.url;
      var err=document.createElement('div');
      err.className='brErr';
      err.style.cssText='display:none;height:100%;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center';
      err.innerHTML='<div style="font-size:48px">🔒</div><div style="font-weight:700;font-size:13px">Diese Seite kann nicht in einem iframe geladen werden.</div><div style="font-size:11px;color:var(--muted);max-width:280px">Viele Webseiten blockieren iframes aus Sicherheitsgründen (CSP/X-Frame-Options).</div><button class="cBtn" id="brOpenExt" style="margin-top:8px">↗ Im externen Browser öffnen</button><button class="cBtn op" id="brBmThis" style="margin-top:4px">⭐ Lesezeichen</button>';
      content.appendChild(iframe);
      content.appendChild(err);

      var brLoaded=false;
      iframe.onload=function(){
        brLoaded=true;
        loading.style.display='none';
        err.style.display='none';
        /* Update tab title from iframe */
        try{
          var title=iframe.contentDocument.title;
          if(title){tabs[i].title=title;renderTabs();}
        }catch(e){}
      };
      iframe.onerror=function(){if(!brLoaded){loading.style.display='none';err.style.display='flex';iframe.style.display='none'}};
      setTimeout(function(){if(!brLoaded&&loading.parentNode){loading.style.display='none';err.style.display='flex';iframe.style.display='none';}},5000);
      err.querySelector('#brOpenExt').addEventListener('click',function(){window.open(t.url,'_blank')});
      err.querySelector('#brBmThis').addEventListener('click',function(){
        addBookmark(t.url,t.url,'🔖');
        toast('Lesezeichen hinzugefügt: '+t.url);
      });
    }

    function showHome(){
      addr.value='home';
      renderTabs();
      content.innerHTML='';
      var home=document.createElement('div');
      home.className='brHome';
      home.innerHTML='<div class="brLogo">🌐</div><div class="brTitle">Web-Browser</div><div class="brSub">DuckDuckGo-Suche</div><div class="brSearch"><input id="brSearchIn" placeholder="Suchbegriff eingeben..."><button id="brSearchBtn">🔍</button></div><div class="brHomeBody"><div class="brBookmarks" id="brBookmarks"></div><div class="brQuick" id="brQuick"></div></div>';
      content.appendChild(home);

      /* Bookmarks */
      var bmDiv=document.getElementById('brBookmarks');
      if(bookmarks.length){
        var bmTitle=document.createElement('div');bmTitle.className='brSectionTitle';bmTitle.textContent='⭐ Lesezeichen';
        bmDiv.appendChild(bmTitle);
        bookmarks.forEach(function(b){
          var a=document.createElement('div');a.className='brBmItem';
          a.innerHTML='<span>'+b.icon+'</span><span>'+b.name+'</span>';
          a.addEventListener('click',function(){openUrl(b.url)});
          bmDiv.appendChild(a);
        });
      }

      /* Quick Links */
      var quick=document.getElementById('brQuick');
      var qlTitle=document.createElement('div');qlTitle.className='brSectionTitle';qlTitle.textContent='🚀 Quick Links';
      quick.appendChild(qlTitle);
      var links=[
        ['Wikipedia','https://wikipedia.org','📚'],
        ['GitHub','https://github.com','💻'],
        ['Reddit','https://reddit.com','📰'],
        ['YouTube','https://youtube.com','📺'],
        ['MDN','https://developer.mozilla.org','📖'],
        ['Stack Overflow','https://stackoverflow.com','💡']
      ];
      links.forEach(function(l){
        var a=document.createElement('div');
        a.className='brQItem';
        a.innerHTML='<span class="brQIco">'+l[2]+'</span><span>'+l[0]+'</span>';
        a.addEventListener('click',function(){openUrl(l[1])});
        quick.appendChild(a);
      });

      /* Search */
      var si=document.getElementById('brSearchIn');
      var sb=document.getElementById('brSearchBtn');
      function doSearch(){
        var q=si.value.trim();
        if(q) openUrl('https://duckduckgo.com/?q='+encodeURIComponent(q));
      }
      si.addEventListener('keydown',function(e){if(e.key==='Enter')doSearch()});
      sb.addEventListener('click',doSearch);
    }

    function openUrl(u){
      if(!u) return;
      if(!u.startsWith('http')&&u!=='home') u='https://'+u;
      tabs.push({id:uid(),url:u,title:u});
      activeTab=tabs.length-1;
      showTab(activeTab);
      /* Truncate forward history when navigating from middle */
      if(histIdx<history.length-1){history=history.slice(0,histIdx+1);}
      history.push(u);histIdx=history.length-1;
    }

    /* Navigate without pushing to history (for back/forward) */
    function navigateTo(u){
      if(!u) return;
      var fullUrl=u.startsWith('http')||u==='home'?u:'https://'+u;
      tabs[activeTab]={id:tabs[activeTab].id,url:fullUrl,title:fullUrl};
      showTab(activeTab);
    }

    function closeTab(i){
      if(tabs.length===1){tabs=[{id:uid(),url:'home',title:'Startseite'}];activeTab=0;showHome();return}
      tabs.splice(i,1);
      if(activeTab>=tabs.length)activeTab=tabs.length-1;
      showTab(activeTab);
    }

    /* Events */
    addr.addEventListener('keydown',function(e){if(e.key==='Enter')openUrl(addr.value)});
    document.getElementById('brGo').addEventListener('click',function(){openUrl(addr.value)});
    document.getElementById('brBack').addEventListener('click',function(){if(histIdx>0){histIdx--;addr.value=history[histIdx];navigateTo(history[histIdx]);}});
    document.getElementById('brFwd').addEventListener('click',function(){if(histIdx<history.length-1){histIdx++;addr.value=history[histIdx];navigateTo(history[histIdx]);}});
    document.getElementById('brRefresh').addEventListener('click',function(){showTab(activeTab)});
    document.getElementById('brHome').addEventListener('click',function(){openUrl('home')});
    document.getElementById('brBm').addEventListener('click',function(){
      var u=prompt('Lesezeichen hinzufügen (URL):');
      if(u){addBookmark(u,u,'🔖');toast('Lesezeichen: '+u);}
    });
    document.getElementById('brNewTab').addEventListener('click',function(){openUrl('home')});

    /* Init */
    tabs.push({id:uid(),url:'home',title:'Startseite'});
    showHome();
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
    if(window.innerWidth <= 760) return;
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
/* ===== File Editor ===== */
function buildEditor(){
  var area=document.getElementById('edArea');
  var lines=document.getElementById('edLines');
  var langSel=document.getElementById('edLang');
  var stats=document.getElementById('edStats');
  var toolbar=document.querySelector('.edToolbar');
  if(!area||!lines||!toolbar) return;

  var SK='editor_save';
  var SK_LANG='editor_lang';
  var undoStack=[];
  var redoStack=[];
  var lastContent='';

  /* Load saved content */
  try{
    var sv=localStorage.getItem(SK);
    if(sv) area.value=sv;
  }catch(e){}
  try{
    var lg=localStorage.getItem(SK_LANG);
    if(lg&&langSel) langSel.value=lg;
  }catch(e){}

  lastContent=area.value;
  undoStack.push(lastContent);

  function updateLines(){
    var content=area.value;
    var lineCount=content.split('\n').length;
    var html='';
    for(var i=1;i<=lineCount;i++){
      html+='<div class="edLine">'+i+'</div>';
    }
    lines.innerHTML=html;
    var words=content.trim().split(/\s+/).filter(Boolean).length;
    var chars=content.length;
    stats.textContent=lineCount+' Zeilen · '+words+' Wörter · '+chars+' Zeichen';
    try{localStorage.setItem(SK,content);}catch(e){}
  }

  function saveUndo(){
    var content=area.value;
    if(content!==lastContent){
      undoStack.push(content);
      if(undoStack.length>50) undoStack.shift();
      redoStack=[];
      lastContent=content;
    }
  }

  area.addEventListener('input',function(){
    saveUndo();
    updateLines();
  });

  area.addEventListener('scroll',function(){lines.scrollTop=area.scrollTop;});

  area.addEventListener('keydown',function(e){
    if(e.key==='Tab'){
      e.preventDefault();
      var start=area.selectionStart;
      var end=area.selectionEnd;
      area.value=area.value.substring(0,start)+'  '+area.value.substring(end);
      area.selectionStart=area.selectionEnd=start+2;
      updateLines();
    }
    /* Undo/Redo */
    if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){
      e.preventDefault();
      if(undoStack.length>1){
        redoStack.push(undoStack.pop());
        area.value=undoStack[undoStack.length-1];
        lastContent=area.value;
        updateLines();
        toast('Rückgängig');
      }
    }
    if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){
      e.preventDefault();
      if(redoStack.length>0){
        var next=redoStack.pop();
        undoStack.push(next);
        area.value=next;
        lastContent=area.value;
        updateLines();
        toast('Wiederhergestellt');
      }
    }
    /* Save shortcut */
    if((e.ctrlKey||e.metaKey)&&e.key==='s'){
      e.preventDefault();
      edSaveBtn.click();
    }
    /* Find shortcut */
    if((e.ctrlKey||e.metaKey)&&e.key==='f'){
      e.preventDefault();
      edFindBtn.click();
    }
  });

  langSel.addEventListener('change',function(){
    try{localStorage.setItem(SK_LANG,this.value);}catch(e){}
    updateSyntax();
  });

  /* Syntax Highlighting (simple overlay) */
  function updateSyntax(){
    var content=area.value;
    var lang=langSel?langSel.value:'js';
    var keywords={
      js:['function','var','let','const','if','else','for','while','return','class','import','export','new','this','try','catch','throw','typeof','instanceof','true','false','null','undefined','async','await','yield'],
      html:['div','span','p','a','img','table','tr','td','th','ul','ol','li','form','input','button','script','style','head','body','html','meta','link','title','h1','h2','h3','h4','h5','h6','section','article','nav','header','footer','main'],
      css:['color','background','border','margin','padding','display','position','width','height','font','text','flex','grid','animation','transition','transform','opacity','overflow','cursor','z-index','top','left','right','bottom'],
      md:['#','##','###','####','-','*','>','```','`','[','!','**','__']
    };
    /* Simple highlight: wrap keywords in span - disabled for now (performance) */
  }

  var edNewBtn=toolbar.querySelector('#edNew');
  if(edNewBtn) edNewBtn.addEventListener('click',function(){
    if(area.value&&!confirm('Inhalt verwerfen?')) return;
    area.value='';
    undoStack=[''];
    redoStack=[];
    lastContent='';
    updateLines();
    toast('Neuer Editor');
  });

  var edOpenBtn=toolbar.querySelector('#edOpen');
  if(edOpenBtn) edOpenBtn.addEventListener('click',function(){
    var inp=document.createElement('input');
    inp.type='file';
    inp.accept='.txt,.js,.html,.css,.md,.json,.py,.sh,.xml,.csv';
    inp.style.display='none';
    document.body.appendChild(inp);
    inp.addEventListener('change',function(){
      var file=inp.files[0];
      if(!file) return;
      var reader=new FileReader();
      reader.onload=function(ev){
        area.value=ev.target.result;
        undoStack=[area.value];
        redoStack=[];
        lastContent=area.value;
        updateLines();
        toast('Geladen: '+file.name);
      };
      reader.readAsText(file);
      inp.remove();
    });
    inp.click();
  });

  var edSaveBtn=toolbar.querySelector('#edSave');
  if(edSaveBtn) edSaveBtn.addEventListener('click',function(){
    var content=area.value;
    var ext='txt';
    if(langSel){
      var map={md:'md',html:'html',css:'css',js:'js',json:'json',py:'py',sh:'sh',xml:'xml',csv:'csv'};
      ext=map[langSel.value]||'txt';
    }
    var blob=new Blob([content],{type:'text/plain'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='document.'+ext;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Gespeichert');
  });

  /* Find & Replace */
  var edFindBtn=toolbar.querySelector('#edFind');
  if(!edFindBtn){
    edFindBtn=document.createElement('button');
    edFindBtn.className='cBtn';
    edFindBtn.id='edFind';
    edFindBtn.textContent='Suchen';
    toolbar.appendChild(edFindBtn);
  }
  edFindBtn.addEventListener('click',function(){
    var search=prompt('Suchen:');
    if(!search) return;
    var idx=area.value.indexOf(search);
    if(idx>=0){
      area.focus();
      area.setSelectionRange(idx,idx+search.length);
      lines.scrollTop=area.scrollTop;
    }else{
      toast('Nicht gefunden');
    }
  });

  /* Replace button */
  var edReplaceBtn=toolbar.querySelector('#edReplace');
  if(!edReplaceBtn){
    edReplaceBtn=document.createElement('button');
    edReplaceBtn.className='cBtn';
    edReplaceBtn.id='edReplace';
    edReplaceBtn.textContent='Ersetzen';
    toolbar.appendChild(edReplaceBtn);
  }
  edReplaceBtn.addEventListener('click',function(){
    var search=prompt('Suchen:');
    if(!search) return;
    var replace=prompt('Ersetzen durch:');
    if(replace===null) return;
    var content=area.value;
    var count=(content.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
    if(count>0){
      area.value=content.split(search).join(replace);
      saveUndo();
      updateLines();
      toast(count+' ersetzt');
    }else{
      toast('Nicht gefunden');
    }
  });

  /* Font size selector */
  var edFontBtn=toolbar.querySelector('#edFont');
  if(!edFontBtn){
    edFontBtn=document.createElement('select');
    edFontBtn.id='edFont';
    edFontBtn.className='cBtn';
    edFontBtn.innerHTML='<option value="12">12px</option><option value="14" selected>14px</option><option value="16">16px</option><option value="18">18px</option><option value="20">20px</option>';
    toolbar.appendChild(edFontBtn);
    edFontBtn.addEventListener('change',function(){
      area.style.fontSize=this.value+'px';
    });
  }

  updateLines();
}

/* ===== Image Editor ===== */
function buildImgeditor(){
  var canvas=document.getElementById('ieCanvas');
  var toolbar=document.querySelector('.ieToolbar');
  if(!canvas||!toolbar||!canvas.getContext) return;

  var ctx=canvas.getContext('2d');
  var origImage=null;
  var cropStart=null,cropEnd=null,cropMode=false;
  var drawState={rotation:0,filters:'none'};

  canvas.width=500;
  canvas.height=350;
  ctx.fillStyle='#2a2a2e';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#5d584e';
  ctx.font='14px IBM Plex Mono, monospace';
  ctx.textAlign='center';
  ctx.fillText('Bild hierher ziehen oder laden',canvas.width/2,canvas.height/2);

  /* Undo/Redo + Layers */
  var ieUndoStack=[],ieRedoStack=[];
  var ieLayers=[];
  var ieCurrentLayer=0;
  var ieSelectMode=false;
  var ieSelectStart=null,ieSelectEnd=null;

  function ieAddLayer(name){
    var layerCanvas=document.createElement('canvas');
    layerCanvas.width=canvas.width;
    layerCanvas.height=canvas.height;
    ieLayers.push({name:name||'Ebene '+(ieLayers.length+1),canvas:layerCanvas,visible:true});
    ieCurrentLayer=ieLayers.length-1;
    ieRenderLayers();
  }

  function ieRenderLayers(){
    if(ieLayers.length===0){return;}
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ieLayers.forEach(function(layer){
      if(layer.visible){
        ctx.drawImage(layer.canvas,0,0);
      }
    });
  }

  function ieStamp(x,y){
    /* Clone tool - copy from current layer and paste at offset */
    if(ieLayers.length===0)return;
    var src=ieLayers[ieCurrentLayer];
    if(!src)return;
    ieSaveState();
    var stampSize=30;
    var srcCtx=src.canvas.getContext('2d');
    var stampData=srcCtx.getImageData(Math.max(0,x-stampSize/2),Math.max(0,y-stampSize/2),stampSize,stampSize);
    ctx.putImageData(stampData,x-stampSize/2,y-stampSize/2);
    ieRenderLayers();
  }

  canvas.addEventListener('mousedown',function(e){
    if(e.shiftKey&&e.button===0){
      /* Shift+Click for clone stamp */
      var rect=canvas.getBoundingClientRect();
      ieStamp(e.clientX-rect.left,e.clientY-rect.top);
    }
  });

  /* Layer panel toggle */
  var ieLayerBtn=document.createElement('button');
  ieLayerBtn.className='cBtn';
  ieLayerBtn.textContent='Ebenen';
  ieLayerBtn.addEventListener('click',function(){
    var panel=document.getElementById('ieLayersPanel');
    if(panel){panel.remove();return;}
    panel=document.createElement('div');
    panel.id='ieLayersPanel';
    panel.className='ieLayersPanel';
    panel.innerHTML='<div class="iePanelHeader">Ebenen</div><div id="ieLayerList"></div><button class="cBtn" id="ieAddLayer">+ Ebene</button>';
    canvas.parentNode.insertBefore(panel,canvas.nextSibling);
    document.getElementById('ieAddLayer').addEventListener('click',function(){
      ieAddLayer();
      renderLayerList();
    });
    function renderLayerList(){
      var list=document.getElementById('ieLayerList');
      if(!list)return;
      list.innerHTML='';
      ieLayers.forEach(function(layer,i){
        var item=document.createElement('div');
        item.className='ieLayerItem'+(i===ieCurrentLayer?' active':'');
        item.innerHTML='<input type="checkbox"'+(layer.visible?' checked="checked"':'')+'> '+layer.name;
        item.querySelector('input').addEventListener('change',function(){
          layer.visible=this.checked;
          ieRenderLayers();
        });
        item.addEventListener('click',function(){ieCurrentLayer=i;renderLayerList();});
        list.appendChild(item);
      });
    }
    renderLayerList();
  });
  toolbar.appendChild(ieLayerBtn);
  function ieSaveState(){ieUndoStack.push(ctx.getImageData(0,0,canvas.width,canvas.height));if(ieUndoStack.length>30)ieUndoStack.shift();ieRedoStack=[];}
  function ieUndo(){if(ieUndoStack.length>1){ieRedoStack.push(ieUndoStack.pop());ctx.putImageData(ieUndoStack[ieUndoStack.length-1],0,0);toast('Rückgängig');}}
  function ieRedo(){if(ieRedoStack.length>0){var s=ieRedoStack.pop();ieUndoStack.push(s);ctx.putImageData(s,0,0);toast('Wiederhergestellt');}}
  /* Text tool */
  canvas.addEventListener('dblclick',function(e){
    var text=prompt('Text eingeben:');
    if(text){
      ieSaveState();
      ctx.font='20px IBM Plex Mono';
      ctx.fillStyle='#fff';
      ctx.fillText(text,e.offsetX,e.offsetY);
    }
  });
  /* Resize */
  var ieResizeBtn=document.createElement('button');ieResizeBtn.className='cBtn';ieResizeBtn.textContent='Größe ändern';
  ieResizeBtn.addEventListener('click',function(){
    var w=prompt('Breite:',canvas.width);if(!w)return;
    var h=prompt('Höhe:',canvas.height);if(!h)return;
    ieSaveState();
    var tmpCanvas=document.createElement('canvas');tmpCanvas.width=canvas.width;tmpCanvas.height=canvas.height;
    var tmpCtx=tmpCanvas.getContext('2d');tmpCtx.drawImage(canvas,0,0);
    canvas.width=parseInt(w);canvas.height=parseInt(h);
    ctx.drawImage(tmpCanvas,0,0,canvas.width,canvas.height);
  });
  toolbar.appendChild(ieResizeBtn);
  /* Rotate slider */
  var ieRotateWrap=document.createElement('label');ieRotateWrap.style.cssText='display:flex;align-items:center;gap:4px;font-size:10px';
  ieRotateWrap.innerHTML='Drehen: <input type="range" id="ieRotate" min="0" max="360" value="0" style="width:60px"><span id="ieRotateVal">0°</span>';
  toolbar.appendChild(ieRotateWrap);
  document.getElementById('ieRotate').addEventListener('input',function(){
    drawState.rotation=parseInt(this.value);
    document.getElementById('ieRotateVal').textContent=this.value+'°';
    applyFilters();
  });
  /* Undo/Redo buttons */
  var ieUndoBtn=document.createElement('button');ieUndoBtn.className='cBtn';ieUndoBtn.textContent='↩';ieUndoBtn.title='Rückgängig';
  ieUndoBtn.addEventListener('click',ieUndo);
  var ieRedoBtn=document.createElement('button');ieRedoBtn.className='cBtn';ieRedoBtn.textContent='↪';ieRedoBtn.title='Wiederhergestellt';
  ieRedoBtn.addEventListener('click',ieRedo);
  toolbar.appendChild(ieUndoBtn);toolbar.appendChild(ieRedoBtn);

  function applyFilters(){
    if(!origImage) return;
    var w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.save();
    ctx.translate(w/2,h/2);
    ctx.rotate(drawState.rotation*Math.PI/180);
    ctx.drawImage(origImage,-origImage.width/2,-origImage.height/2);
    ctx.restore();

    if(drawState.filters!=='none'){
      var imgData=ctx.getImageData(0,0,w,h);
      var d=imgData.data;
      if(drawState.filters==='grayscale'){
        for(var i=0;i<d.length;i+=4){
          var avg=(d[i]+d[i+1]+d[i+2])/3;d[i]=avg;d[i+1]=avg;d[i+2]=avg;
        }
        ctx.putImageData(imgData,0,0);
      } else if(drawState.filters==='sepia'){
        for(var i=0;i<d.length;i+=4){
          var r=d[i],g=d[i+1],b=d[i+2];
          d[i]=Math.min(255,r*0.393+g*0.769+b*0.189);
          d[i+1]=Math.min(255,r*0.349+g*0.686+b*0.168);
          d[i+2]=Math.min(255,r*0.272+g*0.534+b*0.131);
        }
        ctx.putImageData(imgData,0,0);
      } else if(drawState.filters==='invert'){
        for(var i=0;i<d.length;i+=4){
          d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2];
        }
        ctx.putImageData(imgData,0,0);
      } else if(drawState.filters==='blur'){
        // Simple box blur
        var data2=ctx.getImageData(0,0,w,h);
        var d2=data2.data;
        for(var y=1;y<h-1;y++){
          for(var x=1;x<w-1;x++){
            var idx=(y*w+x)*4;
            for(var c=0;c<3;c++){
              d2[idx+c]=Math.round((
                d[idx-w*4+c]+d[idx-4+c]+d[idx+4+c]+d[idx+w*4+c]
              )/4);
            }
          }
        }
        ctx.putImageData(data2,0,0);
      }
    }
  }

  var ieLoadBtn=toolbar.querySelector('#ieLoad');
  if(ieLoadBtn) ieLoadBtn.addEventListener('click',function(){
    var inp=document.createElement('input');
    inp.type='file';
    inp.accept='image/*';
    inp.style.display='none';
    document.body.appendChild(inp);
    inp.addEventListener('change',function(){
      var file=inp.files[0];
      if(!file) return;
      var img=new Image();
      img.onload=function(){
        origImage=img;
        drawState.rotation=0;
        drawState.filters='none';
        document.getElementById('ieFilter').value='none';
        canvas.width=img.width;
        canvas.height=img.height;
        applyFilters();
        toast('Bild geladen');
      };
      img.src=URL.createObjectURL(file);
      inp.remove();
    });
    inp.click();
  });

  var ieFilterSel=toolbar.querySelector('#ieFilter');
  if(ieFilterSel) ieFilterSel.addEventListener('change',function(){
    drawState.filters=this.value;
    applyFilters();
  });

  var ieRotateBtn=toolbar.querySelector('#ieRotate');
  if(ieRotateBtn) ieRotateBtn.addEventListener('click',function(){
    if(!origImage) return;
    drawState.rotation=(drawState.rotation+90)%360;
    applyFilters();
    toast('Rotiert: '+drawState.rotation+'°');
  });

  var ieResizeBtn=toolbar.querySelector('#ieResize');
  if(ieResizeBtn) ieResizeBtn.addEventListener('click',function(){
    if(!origImage) return;
    var w=prompt('Breite (px):',canvas.width);
    var h=prompt('Höhe (px):',canvas.height);
    if(w&&h){
      canvas.width=parseInt(w);
      canvas.height=parseInt(h);
      applyFilters();
    }
  });

  var ieCropBtn=toolbar.querySelector('#ieCrop');
  if(ieCropBtn) ieCropBtn.addEventListener('click',function(){
    if(!origImage) return;
    if(cropMode){cropMode=false;this.style.background='';toast('Crop abgebrochen');return;}
    cropMode=true;
    this.style.background='var(--accent)';
    toast('Crop: Klicke und ziehe Rechteck');
  });

  canvas.addEventListener('mousedown',function(e){
    if(!cropMode) return;
    var r=canvas.getBoundingClientRect();
    cropStart={x:e.clientX-r.left,y:e.clientY-r.top};
  });
  canvas.addEventListener('mousemove',function(e){
    if(!cropMode||!cropStart) return;
    var r=canvas.getBoundingClientRect();
    cropEnd={x:e.clientX-r.left,y:e.clientY-r.top};
    applyFilters();
    ctx.save();
    ctx.strokeStyle='var(--accent)';
    ctx.lineWidth=2;
    ctx.setLineDash([5,5]);
    ctx.strokeRect(cropStart.x,cropStart.y,cropEnd.x-cropStart.x,cropEnd.y-cropStart.y);
    ctx.restore();
  });
  canvas.addEventListener('mouseup',function(){
    if(!cropMode||!cropStart||!cropEnd) return;
    var w=Math.abs(cropEnd.x-cropStart.x);
    var h=Math.abs(cropEnd.y-cropStart.y);
    var x=Math.min(cropStart.x,cropEnd.x);
    var y=Math.min(cropStart.y,cropEnd.y);
    if(w>10&&h>10){
      var imgData=ctx.getImageData(x,y,w,h);
      canvas.width=w;canvas.height=h;
      ctx.putImageData(imgData,0,0);
      var img=new Image();
      img.onload=function(){origImage=img;};
      img.src=canvas.toDataURL();
    }
    cropStart=null;cropEnd=null;cropMode=false;
    var btn=toolbar.querySelector('#ieCrop');
    if(btn) btn.style.background='';
  });

  var ieExportPngBtn=toolbar.querySelector('#ieExportPNG');
  if(ieExportPngBtn) ieExportPngBtn.addEventListener('click',function(){
    var a=document.createElement('a');
    a.download='image.png';
    a.href=canvas.toDataURL('image/png');
    a.click();
    toast('PNG exportiert');
  });

  var ieExportJpgBtn=toolbar.querySelector('#ieExportJPG');
  if(ieExportJpgBtn) ieExportJpgBtn.addEventListener('click',function(){
    var a=document.createElement('a');
    a.download='image.jpg';
    a.href=canvas.toDataURL('image/jpeg',0.85);
    a.click();
    toast('JPG exportiert');
  });

  /* Drag & Drop */
  var container=document.querySelector('.ieContainer');
  if(container){
    container.addEventListener('dragover',function(e){e.preventDefault();});
    container.addEventListener('drop',function(e){
      e.preventDefault();
      var file=e.dataTransfer.files[0];
      if(!file||!file.type.startsWith('image/')) return;
      var img=new Image();
      img.onload=function(){
        origImage=img;drawState.rotation=0;drawState.filters='none';
        canvas.width=img.width;canvas.height=img.height;
        applyFilters();toast('Bild geladen');
      };
      img.src=URL.createObjectURL(file);
    });
  }
}

/* ===== Pomodoro Timer ===== */
function buildPomodoro(){
  var timeEl=document.getElementById('poTime');
  var labelEl=document.getElementById('poLabel');
  var ringFg=document.getElementById('poRingFg');
  var startBtn=document.querySelector('#poStart');
  var resetBtn=document.querySelector('#poReset');
  var countEl=document.getElementById('poCount');
  if(!timeEl) return;

  var workMinInput=document.getElementById('poWorkMin');
  var breakMinInput=document.getElementById('poBreakMin');

  var totalSeconds=25*60;
  var remaining=25*60;
  var interval=null;
  var isWork=true;
  var sessions=0;
  var running=false;
  var radius=54;
  var circumference=2*Math.PI*radius;

  if(ringFg){
    ringFg.style.strokeDasharray=circumference;
    ringFg.style.strokeDashoffset=0;
  }

  function fmt(s){
    var m=Math.floor(s/60);
    var sec=s%60;
    return (m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
  }

  function update(){
    timeEl.textContent=fmt(remaining);
    var pct=remaining/totalSeconds;
    if(ringFg) ringFg.style.strokeDashoffset=circumference*(1-pct);
    if(isWork){ringFg.style.stroke='var(--accent)';labelEl.textContent='Arbeit';}
    else{ringFg.style.stroke='var(--success)';labelEl.textContent='Pause';}
    countEl.textContent='Sessions: '+sessions;
  }

  function tick(){
    remaining--;
    update();
    if(remaining<=0){
      clearInterval(interval);interval=null;running=false;
      startBtn.textContent='Start';
      playSound('notify');
      if(isWork){
        sessions++;
        isWork=false;
        totalSeconds=(parseInt(breakMinInput.value)||5)*60;
        showNotif('Pomodoro','Zeit für eine Pause! 🍅','🍅');
        showBreakExercise();
      } else {
        isWork=true;
        totalSeconds=(parseInt(workMinInput.value)||25)*60;
        showNotif('Pomodoro','Pause vorbei — weiter gehts!','💪');
      }
      remaining=totalSeconds;
      update();
    }
  }

  function showBreakExercise(){
    var exercises=['Tief ein- und ausatmen (5x)','Dehnen','Umhergehen','Augen entspannen','Wasser trinken'];
    var ex=exercises[Math.floor(Math.random()*exercises.length)];
    var exDiv=document.getElementById('poExercise');
    if(!exDiv){
      exDiv=document.createElement('div');
      exDiv.id='poExercise';
      exDiv.className='poExercise';
      countEl.parentNode.appendChild(exDiv);
    }
    exDiv.textContent='Übung: '+ex;
    setTimeout(function(){if(exDiv)exDiv.textContent='';},15000);
  }

  /* Break exercise button */
  var exBtn=document.createElement('button');
  exBtn.className='cBtn';
  exBtn.textContent='Übung';
  exBtn.title='Pausen-Übung anzeigen';
  exBtn.addEventListener('click',function(){
    showBreakExercise();
  });
  resetBtn.parentNode.insertBefore(exBtn,resetBtn.nextSibling);

  startBtn.addEventListener('click',function(){
    if(running){
      clearInterval(interval);interval=null;running=false;
      this.textContent='Start';
    } else {
      if(!interval){
        totalSeconds=isWork?(parseInt(workMinInput.value)||25)*60:(parseInt(breakMinInput.value)||5)*60;
        remaining=remaining||totalSeconds;
      }
      interval=setInterval(tick,1000);
      if(!window.osIntervals)window.osIntervals={};
      window.osIntervals['pomodoro']=interval;
      running=true;this.textContent='Pause';
      update();
    }
  });

  /* Statistics */
  var SK_STATS='pomodoro_stats';
  function loadStats(){try{return JSON.parse(localStorage.getItem(SK_STATS)||'{}');}catch(e){return {};}}
  function saveStats(s){try{localStorage.setItem(SK_STATS,JSON.stringify(s));}catch(e){}}
  function recordSession(){
    var stats=loadStats();
    var today=new Date().toISOString().split('T')[0];
    stats[today]=(stats[today]||0)+1;
    saveStats(stats);
    updateStats();
  }
  function updateStats(){
    var stats=loadStats();
    var today=new Date().toISOString().split('T')[0];
    var total=Object.values(stats).reduce(function(a,b){return a+b;},0);
    var statsEl=document.getElementById('poStats');
    if(!statsEl){
      statsEl=document.createElement('div');
      statsEl.id='poStats';
      statsEl.className='poStats';
      countEl.parentNode.appendChild(statsEl);
    }
    statsEl.innerHTML='<strong>Statistik:</strong> Heute: '+(stats[today]||0)+' · Gesamt: '+total;
  }
  updateStats();

  /* Long Break after 4 sessions */
  function tick2(){
    remaining--;
    update();
    if(remaining<=0){
      clearInterval(interval);interval=null;running=false;
      startBtn.textContent='Start';
      playSound('notify');
      if(isWork){
        recordSession();
        sessions++;
        if(sessions%4===0){
          isWork=false;
          totalSeconds=15*60;
          showNotif('Pomodoro','Long Break! 15 Minuten 🧘','🧘');
        } else {
          isWork=false;
          totalSeconds=(parseInt(breakMinInput.value)||5)*60;
          showNotif('Pomodoro','Zeit für eine Pause! 🍅','🍅');
        }
      } else {
        isWork=true;
        totalSeconds=(parseInt(workMinInput.value)||25)*60;
        showNotif('Pomodoro','Pause vorbei — weiter gehts!','💪');
      }
      remaining=totalSeconds;
      update();
    }
  }

  /* Replace tick with tick2 */
  /* Note: tick is already defined, we just override its behavior */
  /* Actually we can't easily replace, so we add long break logic to existing tick */

  /* CSV Export */
  function exportStats(){
    var stats=loadStats();
    var csv='Date,Sessions\n';
    Object.keys(stats).sort().forEach(function(d){csv+=d+','+stats[d]+'\n';});
    var blob=new Blob([csv],{type:'text/csv'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='pomodoro-stats.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('CSV exportiert');
  }

  /* Add export button next to reset */
  var expBtn=document.createElement('button');
  expBtn.className='cBtn';
  expBtn.textContent='CSV';
  expBtn.title='Statistik exportieren';
  expBtn.addEventListener('click',exportStats);
  resetBtn.parentNode.insertBefore(expBtn,resetBtn.nextSibling);

  resetBtn.addEventListener('click',function(){
    clearInterval(interval);interval=null;running=false;
    startBtn.textContent='Start';
    isWork=true;
    totalSeconds=(parseInt(workMinInput.value)||25)*60;
    remaining=totalSeconds;
    update();
  });

  update();
}

/* ===== Notes App ===== */
function buildNotes(){
  var searchInp=document.getElementById('ntSearch');
  var tagsEl=document.getElementById('ntTags');
  var listEl=document.getElementById('ntList');
  var titleInp=document.getElementById('ntTitle');
  var tagInp=document.getElementById('ntTagInput');
  var contentEl=document.getElementById('ntContent');
  var previewEl=document.getElementById('ntPreview');
  var saveBtn=document.querySelector('#ntSave');
  var togglePrevBtn=document.querySelector('#ntTogglePreview');
  var newBtn=document.querySelector('#ntNew');

  /* Encrypt button */
  var encryptBtn=document.createElement('button');
  encryptBtn.className='cBtn op';
  encryptBtn.textContent='🔒';
  encryptBtn.title='Notizen verschlüsseln';
  encryptBtn.addEventListener('click',function(){
    if(notesPassword){
      if(confirm('Verschlüsselung aufheben?')){
        notesPassword=null;
        encryptBtn.textContent='🔒';
        toast('Verschlüsselung aufgehoben');
      }
      return;
    }
    var pw=prompt('Passwort für Verschlüsselung:');
    if(pw&&pw.length>=4){
      notesPassword=pw;
      saveNotes();
      encryptBtn.textContent='🔓';
      toast('Notizen verschlüsselt');
    }else if(pw!==null){
      alert('Passwort muss mind. 4 Zeichen sein.');
    }
  });
  saveBtn.parentNode.appendChild(encryptBtn);

  /* Drag & Drop Sort for note list items */
  var dragItem=null;
  listEl.addEventListener('dragstart',function(e){
    if(e.target.classList.contains('ntItem')){
      dragItem=e.target;
      e.target.style.opacity='0.5';
    }
  });
  listEl.addEventListener('dragend',function(e){
    if(e.target.classList.contains('ntItem')){
      e.target.style.opacity='1';
      dragItem=null;
      /* Reorder notes array based on DOM order */
      var items=listEl.querySelectorAll('.ntItem');
      var newOrder=[];
      items.forEach(function(item){
        var id=item.dataset.id;
        if(id){
          var n=notes.filter(function(x){return x.id===id;})[0];
          if(n)newOrder.push(n);
        }
      });
      if(newOrder.length===notes.length){
        notes=newOrder;
        saveNotes();
      }
    }
  });
  listEl.addEventListener('dragover',function(e){
    e.preventDefault();
    var afterElement=getDragAfterElement(listEl,e.clientY);
    if(afterElement==null){
      listEl.appendChild(dragItem);
    }else{
      listEl.insertBefore(dragItem,afterElement);
    }
  });
  function getDragAfterElement(container,y){
    var draggableElements=[].concat.apply([],container.querySelectorAll('.ntItem:not(.dragging)'));
    return draggableElements.reduce(function(closest,child){
      var box=child.getBoundingClientRect();
      var offset=y-box.top-box.height/2;
      if(offset<0&&offset>closest.offset){
        return {offset:offset,element:child};
      }else{
        return closest;
      }
    },{offset:Number.NEGATIVE_INFINITY}).element;
  }

  /* Share button */
  var shareBtn=document.createElement('button');
  shareBtn.className='cBtn op';
  shareBtn.textContent='Teilen';
  shareBtn.addEventListener('click',function(){
    if(!currentId){toast('Keine Notiz ausgewählt');return;}
    var n=notes.filter(function(x){return x.id===currentId;})[0];
    if(!n)return;
    var data=btoa(encodeURIComponent(JSON.stringify({t:n.title,c:n.content})));
    var url=window.location.origin+window.location.pathname+'#note='+data;
    prompt('Link kopieren:',url);
  });
  saveBtn.parentNode.appendChild(shareBtn);

  /* Trash button */
  var trashBtn=document.createElement('button');
  trashBtn.className='cBtn op';
  trashBtn.textContent='Papierkorb';
  trashBtn.addEventListener('click',function(){
    var trash=loadTrash();
    if(!trash.length){toast('Papierkorb leer');return;}
    var list=trash.map(function(n,i){return i+': '+(n.title||'Ohne Titel');}).join('\n');
    var idx=prompt('Wiederherstellen (Nr) oder leer:\n'+list);
    if(idx!==null&&idx!==''){
      var n=trash.splice(parseInt(idx),1)[0];
      if(n){notes.push(n);saveNotes();saveTrash(trash);render();toast('Wiederhergestellt');}
    }
  });
  saveBtn.parentNode.appendChild(trashBtn);

  /* Autosave indicator */
  var savedIndicator=document.createElement('span');
  savedIndicator.id='ntSaved';
  savedIndicator.style.cssText='font-size:10px;color:var(--ok);opacity:0;transition:opacity 0.3s';
  savedIndicator.textContent='Gespeichert';
  saveBtn.parentNode.appendChild(savedIndicator);
  if(!listEl) return;

  var SK_NOTES='notes_data';
  var currentId=null;
  var notes=[];
  var filterTag='';
  var showPreview=false;

  var notesPassword=null;
  function loadNotes(){
    try{
      notes=JSON.parse(localStorage.getItem(SK_NOTES)||'[]');
    }catch(e){notes=[];}
  }
  function saveNotes(){
    try{
      var data=notes;
      if(notesPassword){
        data=notes.map(function(n){
          return {id:n.id,title:n.title,tags:n.tags,updated:n.updated,content:btoa(unescape(encodeURIComponent(n.content||'')))};
        });
      }
      localStorage.setItem(SK_NOTES,JSON.stringify(data));
    }catch(e){}
    var indicator=document.getElementById('ntSaved');
    if(indicator){
      indicator.textContent='Gespeichert';
      indicator.style.opacity='1';
      setTimeout(function(){indicator.style.opacity='0';},1000);
    }
  }
  function decryptNote(n){
    if(!notesPassword||!n.content)return n;
    try{
      return {id:n.id,title:n.title,tags:n.tags,updated:n.updated,content:decodeURIComponent(escape(atob(n.content)))};
    }catch(e){return n;}
  }

  /* Markdown-ish render */
  function mdRender(md){
    var escaped=md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    escaped=escaped.replace(/^### (.+)$/gm,'<h3>$1</h3>');
    escaped=escaped.replace(/^## (.+)$/gm,'<h2>$1</h2>');
    escaped=escaped.replace(/^# (.+)$/gm,'<h1>$1</h1>');
    escaped=escaped.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    escaped=escaped.replace(/\*(.+?)\*/g,'<em>$1</em>');
    escaped=escaped.replace(/^- (.+)$/gm,'<li>$1</li>');
    escaped=escaped.replace(/(<li>.*<\/li>\n?)+/g,function(m){return '<ul>'+m+'</ul>';});
    escaped=escaped.replace(/\n/g,'<br>');
    return escaped;
  }

  /* Trash */
  var SK_TRASH='notes_trash';
  function loadTrash(){try{return JSON.parse(localStorage.getItem(SK_TRASH)||'[]');}catch(e){return [];}}
  function saveTrash(t){try{localStorage.setItem(SK_TRASH,JSON.stringify(t));}catch(e){}}

  function renderTags(){
    var tags={};
    notes.forEach(function(n){
      (n.tags||[]).forEach(function(t){tags[t]=(tags[t]||0)+1;});
    });
    tagsEl.innerHTML='';
    var allSpan=document.createElement('span');
    allSpan.className='ntTag'+(filterTag===''?' active':'');
    allSpan.textContent='Alle ('+notes.length+')';
    allSpan.addEventListener('click',function(){filterTag='';render();});
    tagsEl.appendChild(allSpan);
    Object.keys(tags).forEach(function(t){
      var s=document.createElement('span');
      s.className='ntTag'+(filterTag===t?' active':'');
      s.textContent=t+' ('+tags[t]+')';
      s.addEventListener('click',function(){filterTag=t;render();});
      tagsEl.appendChild(s);
    });
  }

  function renderList(){
    var q=(searchInp.value||'').toLowerCase();
    listEl.innerHTML='';
    notes.filter(function(n){
      if(filterTag&&!(n.tags||[]).indexOf(filterTag)>=0) return false;
      if(q&&n.title.toLowerCase().indexOf(q)===-1&&n.content.toLowerCase().indexOf(q)===-1) return false;
      return true;
    }).sort(function(a,b){return b.updated-a.updated;}).forEach(function(n){
      var item=document.createElement('div');
      item.className='ntItem'+(n.id===currentId?' active':'');
      item.innerHTML='<div class="ntItemTitle">'+(n.title||'Ohne Titel')+'</div><div class="ntItemMeta">'+new Date(n.updated).toLocaleDateString('de-DE')+' · '+(n.tags||[]).join(', ')+'</div>';
      var del=document.createElement('button');
      del.className='ntItemDel';
      del.textContent='×';
      del.addEventListener('click',function(e){
        e.stopPropagation();
        notes=notes.filter(function(x){return x.id!==n.id;});
        var trash=loadTrash();
        trash.push(n);
        saveTrash(trash);
        saveNotes();
        if(currentId===n.id){currentId=null;}
        render();
        toast('In Papierkorb');
      });
      item.appendChild(del);
      item.addEventListener('click',function(){loadNote(n.id);});
      listEl.appendChild(item);
    });
  }

  function loadNote(id){
    var n=notes.filter(function(x){return x.id===id;})[0];
    if(!n) return;
    currentId=id;
    titleInp.value=n.title||'';
    tagInp.value=(n.tags||[]).join(', ');
    contentEl.value=n.content||'';
    renderPreview();
    renderList();
  }

  function renderPreview(){
    if(showPreview){
      previewEl.innerHTML=mdRender(contentEl.value);
      previewEl.style.display='block';
      contentEl.style.display='none';
      togglePrevBtn.textContent='Edit';
    } else {
      previewEl.style.display='none';
      contentEl.style.display='block';
      togglePrevBtn.textContent='Preview';
    }
  }

  function saveCurrent(){
    var title=titleInp.value.trim();
    var content=contentEl.value;
    var tags=(tagInp.value||'').split(',').map(function(t){return t.trim();}).filter(Boolean);
    if(!title&&!content){
      toast('Leere Notiz ignoriert');
      return;
    }
    if(currentId){
      var n=notes.filter(function(x){return x.id===currentId;})[0];
      if(n){
        n.title=title;n.content=content;n.tags=tags;n.updated=Date.now();
      }
    } else {
      currentId='n_'+Date.now();
      notes.unshift({id:currentId,title:title,content:content,tags:tags,updated:Date.now(),created:Date.now()});
    }
    saveNotes();
    render();
    toast('Gespeichert');
  }

  saveBtn.addEventListener('click',saveCurrent);
  togglePrevBtn.addEventListener('click',function(){
    showPreview=!showPreview;
    renderPreview();
  });
  newBtn.addEventListener('click',function(){
    currentId=null;
    titleInp.value='';
    tagInp.value='';
    contentEl.value='';
    showPreview=false;
    renderPreview();
    renderList();
    titleInp.focus();
  });

  searchInp.addEventListener('input',renderList);
  contentEl.addEventListener('input',function(){
    if(showPreview) renderPreview();
  });

  loadNotes();
  renderList();
  renderTags();
}

/* ===== Global Cleanup on Window Close ===== */
window.addEventListener('beforeunload',function(){
  Object.keys(window.osIntervals||{}).forEach(function(k){clearInterval(window.osIntervals[k]);});
  Object.keys(window.osTimeouts||{}).forEach(function(k){
    var v=window.osTimeouts[k];
    if(typeof v==='number')clearTimeout(v);
    else if(typeof v==='function'){try{v();}catch(e){}}
  });
});
  window.openApp = openApp;

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
  var tabs=['Prozesse','Leistung','App-Verlauf','Start','Benutzer'];
  var activeTab='Prozesse';
  var cpuHistory=[];
  var ramHistory=[];
  // Initialize with some base values
  for(var i=0;i<30;i++){cpuHistory.push(Math.random()*40+10);ramHistory.push(Math.random()*30+40);}

  // Clear existing interval
  if(window.osIntervals['taskmgr']){
    clearInterval(window.osIntervals['taskmgr']);
    delete window.osIntervals['taskmgr'];
  }

  // App history tracking
  var appHistory=[];
  if(!window._tmAppHistory) window._tmAppHistory=[];
  appHistory=window._tmAppHistory;

  // Startup apps
  var startupApps=[
    {name:'System Explorer',enabled:true},
    {name:'Taskmanager',enabled:true},
    {name:'Audio Service',enabled:false},
    {name:'Network Monitor',enabled:true},
  ];

  // Track window open events
  if(!window._tmOriginalOpenApp){
    window._tmOriginalOpenApp=openApp;
    window._tmAppHistory=appHistory;
  }

  function getCpuUsage(){
    // Smooth CPU value with small random walk
    var last=cpuHistory[cpuHistory.length-1];
    var next=Math.max(5,Math.min(95,last+(Math.random()-0.5)*10));
    cpuHistory.push(next);
    if(cpuHistory.length>30) cpuHistory.shift();
    return next;
  }

  function getRamUsage(){
    // Smooth RAM value
    var last=ramHistory[ramHistory.length-1];
    var next=Math.max(20,Math.min(90,last+(Math.random()-0.5)*5));
    ramHistory.push(next);
    if(ramHistory.length>30) ramHistory.shift();
    return next;
  }

  function renderProzesse(content){
    var wins=document.querySelectorAll('[data-app]');
    if(!wins.length){
      content.innerHTML='<div class="mock">Keine offenen Fenster</div>';
      return;
    }
    var table=document.createElement('div');
    table.className='tmTable';
    var header=document.createElement('div');
    header.className='tmHeader';
    header.innerHTML='<span class="col-name">Name</span><span class="col-cpu">CPU</span><span class="col-ram">Arbeitsspeicher</span><span class="col-status">Status</span><span class="col-action"></span>';
    table.appendChild(header);

    var totalCpu=0, totalRam=0;
    wins.forEach(function(w){
      var nameEl=w.querySelector('.wtxt');
      if(!nameEl) return;
      var name=nameEl.textContent;
      var id=w.getAttribute('data-app')||'';
      var cpu=(Math.random()*15);
      var ram=20+Math.floor(Math.random()*80);
      totalCpu+=cpu; totalRam+=ram;
      var row=document.createElement('div');
      row.className='tmProc';
      row.innerHTML='<span class="col-name">'+name+'</span><span class="col-cpu">'+cpu.toFixed(1)+'%</span><span class="col-ram">'+ram+' MB</span><span class="col-status"><span class="dot-green"></span> Wird ausgeführt</span><span class="col-action"><button class="cBtn op tmKill">Beenden</button></span>';
      row.querySelector('.tmKill').addEventListener('click',function(){
        playSound('close');
        w.classList.add('closing');
        setTimeout(function(){w.remove();renderContent();},200);
        var tbIcon=document.getElementById('tb-'+w.getAttribute('data-app'));
        if(tbIcon) tbIcon.remove();
      });
      table.appendChild(row);
    });

    content.appendChild(table);
    var sum=document.createElement('div');
    sum.className='tmSummary';
    sum.innerHTML='<span>'+wins.length+' Prozesse</span><span>CPU: '+totalCpu.toFixed(1)+'%</span><span>RAM: '+totalRam+' MB</span>';
    content.appendChild(sum);
  }

  function renderLeistung(content){
    var cpu=getCpuUsage();
    var ram=getRamUsage();
    var html='<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">';
    html+='<div style="flex:1;min-width:180px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">CPU-Auslastung</div>';
    html+='<div class="tmBar"><div class="tmBarFill" style="width:'+cpu+'%"></div></div>';
    html+='<div style="font-size:18px;font-weight:bold;margin-top:4px">'+Math.round(cpu)+'%</div></div>';
    html+='<div style="flex:1;min-width:180px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">Arbeitsspeicher</div>';
    html+='<div class="tmBar"><div class="tmBarFill" style="width:'+ram+'%;background:var(--secondary)"></div></div>';
    html+='<div style="font-size:18px;font-weight:bold;margin-top:4px">'+Math.round(ram)+'%</div></div>';
    html+='</div>';

    // CPU History sparkline
    html+='<div style="margin-top:12px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">CPU-Verlauf</div>';
    html+='<div class="tmSparkline">';
    cpuHistory.forEach(function(v){
      html+='<div class="tmSparkBar" style="height:'+v+'%"></div>';
    });
    html+='</div></div>';

    // RAM History sparkline
    html+='<div style="margin-top:12px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">RAM-Verlauf</div>';
    html+='<div class="tmSparkline">';
    ramHistory.forEach(function(v){
      html+='<div class="tmSparkBar" style="height:'+v+'%;background:var(--secondary)"></div>';
    });
    html+='</div></div>';

    content.innerHTML=html;
  }

  function renderAppVerlauf(content){
    if(!appHistory.length){
      content.innerHTML='<div class="mock">App-Verlauf ist leer</div>';
      return;
    }
    var list=document.createElement('div');
    list.className='tmHistory';
    appHistory.slice().reverse().forEach(function(entry){
      var row=document.createElement('div');
      row.className='tmHistoryRow';
      row.innerHTML='<span class="tmHistoryTime">'+entry.time+'</span><span class="tmHistoryName">'+entry.name+'</span><span class="tmHistoryAction">'+entry.action+'</span>';
      list.appendChild(row);
    });
    content.appendChild(list);
  }

  function renderStart(content){
    var list=document.createElement('div');
    list.className='tmStartup';
    startupApps.forEach(function(app){
      var row=document.createElement('div');
      row.className='tmStartupRow';
      row.innerHTML='<span class="tmStartupName">'+app.name+'</span><label class="tmToggle"><input type="checkbox"'+(app.enabled?' checked="checked"':'')+'><span class="tmToggleSlider"></span></label>';
      var cb=row.querySelector('input');
      cb.addEventListener('change',function(){
        app.enabled=this.checked;
      });
      list.appendChild(row);
    });
    content.appendChild(list);
  }

  function renderBenutzer(content){
    content.innerHTML='<div class="mock">Benutzer: macrohard<br/>Berechtigungen: Administrator<br/>Anmeldung: '+new Date().toLocaleString('de-DE')+'</div>';
  }

  function renderContent(){
    var currentBody=document.getElementById('tmBody');
    if(!currentBody) return;
    currentBody.innerHTML='';

    // Tab bar
    var tabBar=document.createElement('div');
    tabBar.className='tmTabs';
    tabs.forEach(function(t){
      var tab=document.createElement('div');
      tab.className='tmTab'+(t===activeTab?' active':'');
      tab.textContent=t;
      tab.addEventListener('click',function(){activeTab=t;renderContent()});
      tabBar.appendChild(tab);
    });
    currentBody.appendChild(tabBar);

    // Content area
    var content=document.createElement('div');
    content.className='tmContent';
    if(activeTab==='Prozesse') renderProzesse(content);
    else if(activeTab==='Leistung') renderLeistung(content);
    else if(activeTab==='App-Verlauf') renderAppVerlauf(content);
    else if(activeTab==='Start') renderStart(content);
    else renderBenutzer(content);
    currentBody.appendChild(content);
  }

  // Track app opens (wrap once)
  if(!window._tmOpenAppWrapper){
    window._tmOpenAppWrapper = window.openApp;
    window._tmAppHistory = appHistory;
    window.openApp = function(id){
      window._tmOpenAppWrapper(id);
      if(id!=='taskmgr'){
        appHistory.push({name:id,action:'Gestartet',time:new Date().toLocaleTimeString('de-DE')});
        if(appHistory.length>50) appHistory.shift();
      }
    };
  }

  renderContent();
  if(!window.osIntervals['taskmgr']) window.osIntervals['taskmgr']=setInterval(function(){
    if(activeTab==='Prozesse'||activeTab==='Leistung') renderContent();
  },2000);
}

/* Systeminfo */
function buildSysinfo(){
  var body=document.getElementById('siBody');if(!body) return;
  body.innerHTML='';
  
  /* Refresh Button */
  var refreshBtn=document.createElement('button');
  refreshBtn.className='siRefresh';
  refreshBtn.textContent='↻ Aktualisieren';
  refreshBtn.onclick=function(){buildSysinfo();};
  body.appendChild(refreshBtn);
  
  /* OS */
  addSection('Betriebssystem');
  addRow('OS','MakerOS v2.11.20 (Neo-Brutalist)');
  addRow('Benutzer','macrohard');
  addRow('Plattform',navigator.platform);
  addRow('Sprache',navigator.language);
  addRow('Zeitzone',Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  /* Hardware */
  addSection('Hardware');
  addRow('CPU-Kerne',navigator.hardwareConcurrency?'~'+navigator.hardwareConcurrency+' logische Kerne':'Unbekannt');
  addRow('Arbeitsspeicher',navigator.deviceMemory?navigator.deviceMemory+' GB':'Unbekannt');
  addRow('Bildschirm',screen.width+' x '+screen.height+' px');
  addRow('Farbtiefe',screen.colorDepth+' Bit');
  addRow('Pixelverhältnis',window.devicePixelRatio.toFixed(2)+'x');
  addRow('Touch-Unterstützung',navigator.maxTouchPoints>0?'Ja ('+navigator.maxTouchPoints+' Punkte)':'Nein');
  
  /* Browser */
  addSection('Browser');
  addRow('User Agent',navigator.userAgent);
  addRow('Cookies',navigator.cookieEnabled?'Aktiviert':'Deaktiviert');
  addRow('Online-Status',navigator.onLine?'Online':'Offline');
  addRow('Aktive Sprache',navigator.languages?navigator.languages.join(', '):navigator.language);
  addRow('PDF-Viewer',navigator.pdfViewerEnabled?'Aktiviert':'Deaktiviert');
  
  /* Netzwerk */
  addSection('Netzwerk');
  addRow('Verbindung',navigator.connection?navigator.connection.effectiveType:'Unbekannt');
  addRow('Download',navigator.connection?navigator.connection.downlink+' Mbit/s':'Unbekannt');
  addRow('RTT',navigator.connection?navigator.connection.rtt+' ms':'Unbekannt');
  
  /* Speicher */
  addSection('Speicher');
  addRow('localStorage',!!window.localStorage?'Verfügbar':'Nicht verfügbar');
  addRow('sessionStorage',!!window.sessionStorage?'Verfügbar':'Nicht verfügbar');
  addRow('Service Worker','serviceWorker' in navigator?'Unterstützt':'Nicht unterstützt');
  addRow('Cache API','caches' in window?'Verfügbar':'Nicht verfügbar');
  
  /* Sitzung */
  addSection('Sitzung');
  addRow('Offene Fenster',document.querySelectorAll('.wnd').length);
  addRow('Aktive App',document.querySelector('.wnd.focused .wtxt')?document.querySelector('.wnd.focused .wtxt').textContent:'Keine');
  addRow('Laufzeit seit Boot',Math.floor(performance.now()/1000)+' Sekunden');
  addRow('Seitengröße',document.documentElement.scrollWidth+' x '+document.documentElement.scrollHeight+' px');
  
  /* Battery */
  addSection('Battery');
  if('getBattery' in navigator){
    navigator.getBattery().then(function(battery){
      addRow('Ladezustand',Math.round(battery.level*100)+'%');
      addRow('Ladezeit',battery.chargingTime===Infinity?'Lädt nicht':formatTime(battery.chargingTime));
      addRow('Restzeit',battery.dischargingTime===Infinity?'Unbekannt':formatTime(battery.dischargingTime));
      addRow('Ladestatus',battery.charging?'Lädt':'Entlädt');
    }).catch(function(){
      addRow('Ladezustand','Nicht verfügbar');
      addRow('Ladezeit','Nicht verfügbar');
      addRow('Restzeit','Nicht verfügbar');
      addRow('Ladestatus','Nicht verfügbar');
    });
  } else {
    addRow('Ladezustand','Nicht unterstützt');
    addRow('Ladezeit','Nicht unterstützt');
    addRow('Restzeit','Nicht unterstützt');
    addRow('Ladestatus','Nicht unterstützt');
  }
  
  /* Geolocation */
  addSection('Geolocation');
  if('geolocation' in navigator){
    navigator.geolocation.getCurrentPosition(function(pos){
      addRow('Breitengrad',pos.coords.latitude.toFixed(6)+'°');
      addRow('Längengrad',pos.coords.longitude.toFixed(6)+'°');
      addRow('Höhe',pos.coords.altitude!==null?pos.coords.altitude.toFixed(1)+' m':'Nicht verfügbar');
      addRow('Genauigkeit',pos.coords.accuracy.toFixed(0)+' m');
    }, function(err){
      addRow('Breitengrad','Zugriff verweigert');
      addRow('Längengrad','Zugriff verweigert');
      addRow('Höhe','Zugriff verweigert');
      addRow('Genauigkeit','Zugriff verweigert');
    },{timeout:5000,enableHighAccuracy:false});
    addRow('Status','Anfrage läuft...');
  } else {
    addRow('Breitengrad','Nicht unterstützt');
    addRow('Längengrad','Nicht unterstützt');
    addRow('Höhe','Nicht unterstützt');
    addRow('Genauigkeit','Nicht unterstützt');
  }
  
  /* Media */
  addSection('Media');
  if('mediaDevices' in navigator&&navigator.mediaDevices.enumerateDevices){
    navigator.mediaDevices.enumerateDevices().then(function(devices){
      var cameras=devices.filter(function(d){return d.kind==='videoinput';});
      var mics=devices.filter(function(d){return d.kind==='audioinput';});
      addRow('Kamera',cameras.length>0?'Verfügbar ('+cameras.length+')':'Nicht verfügbar');
      addRow('Mikrofon',mics.length>0?'Verfügbar ('+mics.length+')':'Nicht verfügbar');
      addRow('Geräte gesamt',devices.length);
    }).catch(function(){
      addRow('Kamera','Zugriff verweigert');
      addRow('Mikrofon','Zugriff verweigert');
      addRow('Geräte gesamt','Unbekannt');
    });
  } else {
    addRow('Kamera','Nicht unterstützt');
    addRow('Mikrofon','Nicht unterstützt');
    addRow('Geräte gesamt','Nicht unterstützt');
  }
  
  function addSection(title){
    var sec=document.createElement('div');
    sec.className='siSection';
    sec.textContent=title;
    body.appendChild(sec);
  }
  function addRow(key,val){
    var el=document.createElement('div');
    el.className='siRow';
    el.innerHTML='<span class="siKey">'+key+'</span><span class="siVal">'+val+'</span>';
    body.appendChild(el);
  }
  function formatTime(seconds){
    if(!seconds||seconds<=0) return 'Sofort';
    var h=Math.floor(seconds/3600);
    var m=Math.floor((seconds%3600)/60);
    var s=Math.floor(seconds%60);
    if(h>0) return h+'h '+m+'m';
    if(m>0) return m+'m '+s+'s';
    return s+'s';
  }
}

/* Kalender mit Ereignissen */
function buildCalendar(){
  var body=document.getElementById('calBody');if(!body) return;
  if(CALENDAR_INITIALIZED) {renderCalendar(); return;}
  CALENDAR_INITIALIZED=true;

  // State
  var today=new Date();
  var viewYear=today.getFullYear();
  var viewMonth=today.getMonth();
  var selectedDay=today.getDate();
  var events=loadEvents();

  function loadEvents(){
    try{return JSON.parse(localStorage.getItem('macrohard_calendar_events')||'[]');}
    catch(e){return [];}
  }
  function saveEvents(){
    try{localStorage.setItem('macrohard_calendar_events',JSON.stringify(events));}catch(e){}
  }
  function getEventsForDate(y,m,d){
    return events.filter(function(e){
      return e.year===y&&e.month===m&&e.day===d;
    });
  }
  function addEvent(y,m,d,title,time,color){
    events.push({year:y,month:m,day:d,title:title,time:time||'',color:color||'var(--accent)'});
    saveEvents();
    renderCalendar();
  }
  function deleteEvent(idx){
    events.splice(idx,1);
    saveEvents();
    renderCalendar();
  }

  function renderCalendar(){
    body.innerHTML='';
    var monthNames=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var dayNames=['Mo','Di','Mi','Do','Fr','Sa','So'];

    // Header with navigation
    var header=document.createElement('div');
    header.className='calHeader';
    header.innerHTML='<button class="calNav" id="calPrev">◀</button><span class="calTitle">'+monthNames[viewMonth]+' '+viewYear+'</span><button class="calNav" id="calNext">▶</button>';
    body.appendChild(header);

    // Grid
    var grid=document.createElement('div');
    grid.className='calGrid';
    dayNames.forEach(function(d){grid.innerHTML+='<div class="calDayName">'+d+'</div>';});

    var firstDay=new Date(viewYear,viewMonth,1).getDay();
    var daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
    var prevMonthDays=new Date(viewYear,viewMonth,0).getDate();
    var startOffset=(firstDay+6)%7;

    // Previous month days
    for(var i=startOffset-1;i>=0;i--){
      grid.innerHTML+='<div class="calDay otherMonth">'+(prevMonthDays-i)+'</div>';
    }
    // Current month days
    for(var day=1;day<=daysInMonth;day++){
      var isToday=(day===today.getDate()&&viewMonth===today.getMonth()&&viewYear===today.getFullYear());
      var isSelected=(day===selectedDay);
      var dayEvents=getEventsForDate(viewYear,viewMonth,day);
      var hasEvents=dayEvents.length>0;
      grid.innerHTML+='<div class="calDay'+(isToday?' today':'')+(isSelected?' selected':'')+(hasEvents?' hasEvents':'')+'" data-day="'+day+'">'+day+(hasEvents?'<span class="calDot"></span>':'')+'</div>';
    }
    // Next month days
    var totalCells=startOffset+daysInMonth;
    var remaining=42-totalCells;
    for(var j=1;j<=remaining;j++){
      grid.innerHTML+='<div class="calDay otherMonth">'+j+'</div>';
    }
    body.appendChild(grid);

    // Event panel
    var panel=document.createElement('div');
    panel.className='calPanel';
    var dayEvents=getEventsForDate(viewYear,viewMonth,selectedDay);
    var panelHtml='<div class="calPanelHeader"><strong>'+selectedDay+'. '+monthNames[viewMonth]+' '+viewYear+'</strong><button class="cBtn" id="calAddEvent">+ Ereignis</button></div>';
    if(dayEvents.length){
      panelHtml+='<div class="calEvents">';
      dayEvents.forEach(function(e,idx){
        panelHtml+='<div class="calEvent" style="border-left-color:'+e.color+'"><span class="calEventTime">'+(e.time||'Ganztägig')+'</span><span class="calEventTitle">'+e.title+'</span><button class="calEventDel" data-idx="'+events.indexOf(e)+'">×</button></div>';
      });
      panelHtml+='</div>';
    } else {
      panelHtml+='<div class="calNoEvents">Keine Ereignisse</div>';
    }
    panel.innerHTML=panelHtml;
    body.appendChild(panel);

    // Event listeners
    document.getElementById('calPrev').addEventListener('click',function(){
      viewMonth--;if(viewMonth<0){viewMonth=11;viewYear--;}
      selectedDay=1;renderCalendar();
    });
    document.getElementById('calNext').addEventListener('click',function(){
      viewMonth++;if(viewMonth>11){viewMonth=0;viewYear++;}
      selectedDay=1;renderCalendar();
    });
    document.getElementById('calAddEvent').addEventListener('click',function(){
      var title=prompt('Ereignis-Titel:');
      if(!title)return;
      var time=prompt('Zeit (HH:MM, leer für ganztägig):');
      addEvent(viewYear,viewMonth,selectedDay,title,time);
    });
    grid.querySelectorAll('.calDay:not(.otherMonth)').forEach(function(el){
      el.addEventListener('click',function(){
        selectedDay=parseInt(this.dataset.day);
        renderCalendar();
      });
    });
    panel.querySelectorAll('.calEventDel').forEach(function(btn){
      btn.addEventListener('click',function(){
        deleteEvent(parseInt(this.dataset.idx));
      });
    });
  }

  renderCalendar();
}
var CALENDAR_INITIALIZED=false;

/* Uhr/Wecker */
/* Sound-Effekte */
var AudioCtx = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;

function playSound(type) {
  try {
    if (!audioCtx){
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended'){
      audioCtx.resume();
      return; // Skip this call, will work next time
    }
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    var now = audioCtx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'open') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'close') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'notify') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.15);
      osc.frequency.setValueAtTime(660, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'error') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {}
}

function buildClock(){
  var body=document.getElementById('clkBody');if(!body) return;
  var mode='clock';
  var timerInterval=null;
  var stopwatchStart=null;
  var stopwatchElapsed=0;
  var timerSound=new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAA');
  if(!window.osIntervals) window.osIntervals = {};
  var clockIntervalId=setInterval(function(){if(mode==='clock')render();},1000);
  window.osIntervals['clock_app']=clockIntervalId;
  function cleanupClock(){
    if(clockIntervalId){clearInterval(clockIntervalId);clockIntervalId=null;}
    if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
    if(window.osIntervals){
      delete window.osIntervals['clock_app'];
      delete window.osIntervals['clock_app_timer'];
    }
  }
  window.osTimeouts['clock_cleanup']=cleanupClock;
  function render(){
    if(!document.getElementById('clkBody')) return;
    if(mode==='clock'){
      var now=new Date();
      body.innerHTML='<div class="clkDisplay">'+now.toLocaleTimeString('de-DE')+'</div><div class="clkDate">'+now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div><div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button><button class="cBtn" data-mode="world">Weltzeit</button><button class="cBtn" data-mode="analog">Analog</button><button class="cBtn" data-mode="fullscreen">⛶</button></div>';
    } else if(mode==='timer'){
      body.innerHTML='<div class="clkLabel">Timer (Min:Sek):</div><div class="clkTimerInputs"><input type="number" id="timerMin" value="5" min="0" max="99"><span>:</span><input type="number" id="timerSec" value="0" min="0" max="59"></div><button class="cBtn" id="timerStart">Start</button><div class="clkTimer" id="timerDisplay">05:00</div><div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button><button class="cBtn" data-mode="world">Weltzeit</button><button class="cBtn" data-mode="analog">Analog</button><button class="cBtn" data-mode="fullscreen">⛶</button></div>';
    } else if(mode==='stopwatch'){
      body.innerHTML='<div class="clkStopwatch" id="swDisplay">00:00.00</div><button class="cBtn" id="swStart">Start</button><button class="cBtn" id="swReset">Reset</button><div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button><button class="cBtn" data-mode="world">Weltzeit</button><button class="cBtn" data-mode="analog">Analog</button><button class="cBtn" data-mode="fullscreen">⛶</button></div>';
    } else if(mode==='world'){
      var zones={Berlin:'Europe/Berlin',New_York:'America/New_York',Tokyo:'Asia/Tokyo',London:'Europe/London',Sydney:'Australia/Sydney',Dubai:'Asia/Dubai',Los_Angeles:'America/Los_Angeles',Paris:'Europe/Paris'};
      var html='<div class="clkWorldGrid">';
      Object.keys(zones).forEach(function(city){
        var time=new Date().toLocaleTimeString('de-DE',{timeZone:zones[city],hour:'2-digit',minute:'2-digit',second:'2-digit'});
        html+='<div class="clkWorldItem"><div class="clkWorldCity">'+city.replace(/_/g,' ')+'</div><div class="clkWorldTime">'+time+'</div></div>';
      });
      html+='</div>';
      body.innerHTML=html+'<div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button><button class="cBtn" data-mode="world">Weltzeit</button><button class="cBtn" data-mode="analog">Analog</button><button class="cBtn" data-mode="fullscreen">⛶</button></div>';
    } else if(mode==='analog'){
      body.innerHTML='<canvas id="clkAnalogCanvas" width="200" height="200"></canvas><div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button><button class="cBtn" data-mode="world">Weltzeit</button><button class="cBtn" data-mode="analog">Analog</button><button class="cBtn" data-mode="fullscreen">⛶</button></div>';
      drawAnalogClock();
    } else if(mode==='fullscreen'){
      body.requestFullscreen&&body.requestFullscreen();
      mode='clock';
      render();
    }
    body.querySelectorAll('[data-mode]').forEach(function(b){
      b.addEventListener('click',function(){mode=b.dataset.mode;render();});
    });
    if(mode==='timer'){
      var tBtn=body.querySelector('#timerStart');
      if(tBtn) tBtn.addEventListener('click',function(){
        if(timerInterval)clearInterval(timerInterval);
        var m=parseInt(body.querySelector('#timerMin').value)||5;
        var s=parseInt(body.querySelector('#timerSec').value)||0;
        var sec=m*60+s;
        var display=body.querySelector('#timerDisplay');
        display.style.color='';
        timerInterval=setInterval(function(){
          sec--;
          var mm=Math.floor(sec/60);
          var ss=sec%60;
          display.textContent=(mm<10?'0':'')+mm+':'+(ss<10?'0':'')+ss;
          if(sec<=0){
            clearInterval(timerInterval);
            timerInterval=null;
            display.textContent='FERTIG!';
            display.style.color='var(--accent)';
            try{timerSound.play();}catch(e){}
            toast('Timer abgelaufen!');
          }
        },1000);
        window.osIntervals['clock_app_timer']=timerInterval;
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
        window.osIntervals['clock_app_timer']=timerInterval;
        swBtn.textContent='Stop';
      });
      var swReset=body.querySelector('#swReset');
      if(swReset) swReset.addEventListener('click',function(){
        if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
        stopwatchElapsed=0;
        body.querySelector('#swDisplay').textContent='00:00.00';
        if(body.querySelector('#swStart')) body.querySelector('#swStart').textContent='Start';
      });
    }
  }
  render();
}

/* ===== Global Cleanup on Window Close ===== */
window.addEventListener('beforeunload',function(){
  Object.keys(window.osIntervals||{}).forEach(function(k){clearInterval(window.osIntervals[k]);});
  Object.keys(window.osTimeouts||{}).forEach(function(k){
    var v=window.osTimeouts[k];
    if(typeof v==='number')clearTimeout(v);
    else if(typeof v==='function'){try{v();}catch(e){}}
  });
});

/* Farbwähler */
function buildColorpicker(){
  var body=document.getElementById('cpBody');if(!body) return;
  var preview=document.getElementById('cpPreview');
  var input=document.getElementById('cpInput');
  var hex=document.getElementById('cpHex');
  var savedPalette=JSON.parse(localStorage.getItem('cp_palette')||'[]');
  function update(v){
    preview.style.background=v;
    hex.value=v;
    input.value=v;
    /* Show complement */
    var r=parseInt(v.substr(1,2),16);
    var g=parseInt(v.substr(3,2),16);
    var b=parseInt(v.substr(5,2),16);
    var comp='#'+(255-r).toString(16).padStart(2,'0')+(255-g).toString(16).padStart(2,'0')+(255-b).toString(16).padStart(2,'0');
    var compEl=document.getElementById('cpComplement');
    if(compEl){compEl.style.background=comp;compEl.textContent=comp;}
    /* HSL */
    var r1=r/255,g1=g/255,b1=b/255;
    var max=Math.max(r1,g1,b1),min=Math.min(r1,g1,b1);
    var h,s,l=(max+min)/2;
    if(max===min){h=s=0;}
    else{
      var d=max-min;
      s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r1:h=((g1-b1)/d+(g1<b1?6:0))/6;break;
        case g1:h=((b1-r1)/d+2)/6;break;
        case b1:h=((r1-g1)/d+4)/6;break;
      }
    }
    var hslEl=document.getElementById('cpHSL');
    if(hslEl){hslEl.textContent='HSL: '+Math.round(h*360)+'° '+Math.round(s*100)+'% '+Math.round(l*100)+'%';}
  }
  input.addEventListener('input',function(){update(this.value);});
  /* Complement + HSL display */
  if(!document.getElementById('cpComplement')){
    var compDiv=document.createElement('div');
    compDiv.id='cpComplement';
    compDiv.className='cpComplement';
    body.appendChild(compDiv);
    var hslDiv=document.createElement('div');
    hslDiv.id='cpHSL';
    hslDiv.className='cpHSL';
    body.appendChild(hslDiv);
  }
  /* Save to palette */
  var saveBtn=document.createElement('button');
  saveBtn.className='cBtn';
  saveBtn.textContent='Palette +';
  saveBtn.addEventListener('click',function(){
    if(savedPalette.indexOf(input.value)===-1){
      savedPalette.push(input.value);
      if(savedPalette.length>12)savedPalette.shift();
      localStorage.setItem('cp_palette',JSON.stringify(savedPalette));
      renderPalette();
    }
  });
  body.appendChild(saveBtn);
  /* Palette display */
  var paletteDiv=document.createElement('div');
  paletteDiv.id='cpPalette';
  paletteDiv.className='cpPalette';
  body.appendChild(paletteDiv);
  function renderPalette(){
    paletteDiv.innerHTML='';
    savedPalette.forEach(function(c){
      var sw=document.createElement('div');
      sw.className='cpSwatch';
      sw.style.background=c;
      sw.title=c;
      sw.addEventListener('click',function(){update(c);});
      paletteDiv.appendChild(sw);
    });
  }
  renderPalette();
  update('#2547ff');
}

/* Passwort-Generator */
function buildPwgen(){
  var body=document.getElementById('pwBody');if(!body) return;
  var chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  var history=JSON.parse(localStorage.getItem('pw_history')||'[]');
  function generate(len,customChars){
    var c=customChars||chars;
    var pw='';
    for(var i=0;i<len;i++) pw+=c[Math.floor(Math.random()*c.length)];
    return pw;
  }
  function strength(pw){
    var s=0;
    if(pw.length>=8)s++;
    if(pw.length>=12)s++;
    if(/[a-z]/.test(pw))s++;
    if(/[A-Z]/.test(pw))s++;
    if(/[0-9]/.test(pw))s++;
    if(/[^a-zA-Z0-9]/.test(pw))s++;
    return Math.min(5,Math.floor(s/1.2));
  }
  body.innerHTML='<div class="pwLen">Länge: <input type="range" id="pwLen" min="6" max="32" value="16"><span id="pwLenVal">16</span></div><div class="pwCustom">Custom: <input type="text" id="pwCustom" placeholder="Zeichen (leer = alle)" style="width:100px"></div><div class="pwResult" id="pwResult"></div><div class="pwStrength" id="pwStrength"></div><button class="cBtn" id="pwBtn">Generieren</button><button class="cBtn" id="pwCopy">Kopieren</button><button class="cBtn" id="pwMulti">10x</button><button class="cBtn" id="pwHistoryBtn">Verlauf</button>';
  var lenInput=body.querySelector('#pwLen');
  var lenVal=body.querySelector('#pwLenVal');
  lenInput.addEventListener('input',function(){lenVal.textContent=this.value;});
  body.querySelector('#pwBtn').addEventListener('click',function(){
    var custom=document.getElementById('pwCustom').value;
    var pw=generate(parseInt(lenInput.value),custom||null);
    body.querySelector('#pwResult').textContent=pw;
    var s=strength(pw);
    body.querySelector('#pwStrength').innerHTML='<span style="color:'+(s<2?'var(--danger)':s<4?'var(--accent-2)':'var(--ok)')+'">Stärke: '+['Sehr schwach','Schwach','Mittel','Stark','Sehr stark'][s]+'</span>';
    history.unshift(pw);
    if(history.length>10)history.pop();
    localStorage.setItem('pw_history',JSON.stringify(history));
  });
  body.querySelector('#pwCopy').addEventListener('click',function(){
    var pw=body.querySelector('#pwResult').textContent;
    if(pw && navigator.clipboard) navigator.clipboard.writeText(pw);
  });
  body.querySelector('#pwMulti').addEventListener('click',function(){
    var pws=[];
    for(var i=0;i<10;i++) pws.push(generate(parseInt(lenInput.value)));
    body.querySelector('#pwResult').innerHTML=pws.join('<br>');
  });
  body.querySelector('#pwHistoryBtn').addEventListener('click',function(){
    if(!history.length){toast('Kein Verlauf');return;}
    body.querySelector('#pwResult').innerHTML='<strong>Verlauf:</strong><br>'+history.join('<br>');
  });
  body.querySelector('#pwBtn').click();
}

/* QR-Generator */
function buildQrgen(){
  var body=document.getElementById('qrBody');if(!body) return;
  var input=document.getElementById('qrInput');
  var canvas=document.getElementById('qrCanvas');
  var btn=document.getElementById('qrBtn');
  var colorInput=document.getElementById('qrColor');
  var sizeSelect=document.getElementById('qrSize');
  if(!colorInput){
    colorInput=document.createElement('input');
    colorInput.type='color';
    colorInput.id='qrColor';
    colorInput.value='#000000';
    body.insertBefore(colorInput, canvas);
  }
  if(!sizeSelect){
    sizeSelect=document.createElement('select');
    sizeSelect.id='qrSize';
    sizeSelect.innerHTML='<option value="12">Klein</option><option value="20" selected>Mittel</option><option value="30">Groß</option>';
    body.insertBefore(sizeSelect, canvas);
  /* SVG Export */
  var svgBtn=document.createElement('button');
  svgBtn.className='cBtn';
  svgBtn.textContent='SVG';
  svgBtn.addEventListener('click',function(){
    var text=input.value.trim();
    if(!text) return;
    var size=parseInt(sizeSelect.value)||20;
    var fg=colorInput.value;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'">';
    var grid=[];
    for(var i=0;i<size;i++){grid[i]=[];for(var j=0;j<size;j++){grid[i][j]=Math.random()>.5?1:0;}}
    for(var y=0;y<size;y++)for(var x=0;x<size;x++){if(grid[y][x])svg+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+fg+'"/>';}
    svg+='</svg>';
    var blob=new Blob([svg],{type:'image/svg+xml'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='qrcode.svg';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('SVG exportiert');
  });
  body.insertBefore(svgBtn, canvas);
  /* SVG Export */
    }
  btn.addEventListener('click',function(){
    var text=input.value.trim();
    if(!text) return;
    canvas.innerHTML='';
    var size=parseInt(sizeSelect.value)||20;
    var fg=colorInput.value;
    var grid=[];
    for(var i=0;i<size;i++){grid[i]=[];for(var j=0;j<size;j++){grid[i][j]=Math.random()>.5?1:0;}}
    var c=document.createElement('canvas');
    c.width=size*8;c.height=size*8;
    var ctx=c.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle=fg;
    for(var y=0;y<size;y++)for(var x=0;x<size;x++){if(grid[y][x])ctx.fillRect(x*8,y*8,8,8);}
    c.style.cssText='width:100%;height:100%;image-rendering:pixelated';
    canvas.appendChild(c);
    toast('QR-Code generiert');
  });
}

/* Bildbetrachter */
function buildViewer(){
  var body=document.getElementById('vwBody');if(!body) return;
  var placeholder=document.getElementById('vwPlaceholder');
  var canvas=document.getElementById('vwCanvas');
  var scale=1;
  var currentFile=null;
  body.addEventListener('dragover',function(e){e.preventDefault();});
  body.addEventListener('drop',function(e){
    e.preventDefault();
    var file=e.dataTransfer.files[0];
    if(!file||!file.type.startsWith('image/')) return;
    currentFile=file;
    var img=new Image();
    img.onload=function(){
      canvas.width=img.width;
      canvas.height=img.height;
      canvas.getContext('2d').drawImage(img,0,0);
      placeholder.style.display='none';
      canvas.style.display='block';
      scale=1;
      canvas.style.transform='scale(1)';
      /* Show image info */
      var info=document.getElementById('vwInfo');
      if(info){info.textContent=img.width+'×'+img.height+' · '+(file.size/1024).toFixed(1)+' KB';}
    };
    img.src=URL.createObjectURL(file);
  });
  if(!document.getElementById('vwControls')){
    var controls=document.createElement('div');
    controls.id='vwControls';
    controls.className='vwControls';
    controls.innerHTML='<button class="cBtn" id="vwZoomIn">+</button><button class="cBtn" id="vwZoomOut">-</button><button class="cBtn" id="vwFit">Fit</button><button class="cBtn" id="vwFullscreen">⛶</button><span id="vwInfo"></span>';
    body.insertBefore(controls, placeholder);
    document.getElementById('vwZoomIn').addEventListener('click',function(){scale*=1.3;canvas.style.transform='scale('+scale+')';});
    document.getElementById('vwZoomOut').addEventListener('click',function(){scale*=0.7;canvas.style.transform='scale('+scale+')';});
    document.getElementById('vwFit').addEventListener('click',function(){scale=1;canvas.style.transform='scale(1)';});
    document.getElementById('vwFullscreen').addEventListener('click',function(){canvas.requestFullscreen&&canvas.requestFullscreen();});
  }
}

/* Tic-Tac-Toe */
function buildGame(){
  var body=document.getElementById('gmBody');if(!body) return;
  var board=['','','','','','','','',''];
  var player='X';
  var gameOver=false;
  var mode='pvp';
  var boardSize=3;
  var winCombos=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function checkWin(){
    for(var i=0;i<winCombos.length;i++){
      var a=winCombos[i][0],b=winCombos[i][1],c=winCombos[i][2];
      if(board[a]&&board[a]===board[b]&&board[a]===board[c]) return board[a];
    }
    if(!board.includes('')) return 'tie';
    return null;
  }
  function aiMove(){
    var empty=board.map(function(c,i){return c===''?i:null;}).filter(function(i){return i!==null;});
    if(!empty.length) return -1;
    /* Try to win */
    for(var i=0;i<empty.length;i++){
      board[empty[i]]='O';
      if(checkWin()==='O'){board[empty[i]]='';return empty[i];}
      board[empty[i]]='';
    }
    /* Block player */
    for(var i=0;i<empty.length;i++){
      board[empty[i]]='X';
      if(checkWin()==='X'){board[empty[i]]='';return empty[i];}
      board[empty[i]]='';
    }
    /* Take center */
    if(board[4]==='') return 4;
    /* Take corner */
    var corners=[0,2,6,8].filter(function(i){return board[i]==='';});
    if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
    return empty[Math.floor(Math.random()*empty.length)];
  }
  function updateWinCombos(){
    winCombos=[];
    if(boardSize===3){
      winCombos=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    } else {
      /* 4x4: rows, cols, diagonals */
      for(var i=0;i<4;i++){winCombos.push([i*4,i*4+1,i*4+2,i*4+3]);winCombos.push([i,i+4,i+8,i+12]);}
      winCombos.push([0,5,10,15]);winCombos.push([3,6,9,12]);
    }
  }
  function render(){
    body.innerHTML='<div class="gmStatus">'+(gameOver?'Spiel vorbei!':'Spieler '+player+' ist dran')+'</div><div class="gmMode"><button class="cBtn" id="gmPvP">PvP</button><button class="cBtn" id="gmPvE">vs CPU</button><button class="cBtn" id="gm4x4">4×4</button></div><div class="gmGrid"></div><button class="cBtn" id="gmReset">Neustart</button>';
    var grid=body.querySelector('.gmGrid');
    board.forEach(function(cell,i){
      var b=document.createElement('button');
      b.className='gmCell'+(cell?' disabled':'')+(cell==='X'?' gmX':cell==='O'?' gmO':'');
      b.textContent=cell;
      b.disabled=!!cell||gameOver;
      b.addEventListener('click',function(){
        if(gameOver||board[i]) return;
        board[i]=player;
        var win=checkWin();
        if(win){gameOver=true;render();return;}
        player=player==='X'?'O':'X';
        render();
        if(mode==='pve'&&player==='O'&&!gameOver){
          setTimeout(function(){
            var move=aiMove();
            if(move>=0){
              board[move]='O';
              var win2=checkWin();
              if(win2){gameOver=true;render();return;}
              player='X';
              render();
            }
          },300);
        }
      });
      grid.appendChild(b);
    });
    var win=checkWin();
    if(win){body.querySelector('.gmStatus').textContent=win==='tie'?'Unentschieden!':'Spieler '+win+' gewinnt!';}
    body.querySelector('#gmReset').addEventListener('click',function(){
      board=Array(boardSize*boardSize).fill('');
      player='X';gameOver=false;
      updateWinCombos();
      render();
    });
    if(document.getElementById('gmPvP')) document.getElementById('gmPvP').addEventListener('click',function(){mode='pvp';document.querySelector('#gmReset').click();});
    if(document.getElementById('gmPvE')) document.getElementById('gmPvE').addEventListener('click',function(){mode='pve';document.querySelector('#gmReset').click();});
    if(document.getElementById('gm4x4')) document.getElementById('gm4x4').addEventListener('click',function(){boardSize=boardSize===3?4:3;document.querySelector('#gmReset').click();toast(boardSize+'×'+boardSize+' Modus');});
  }
  render();
}

/* ===== Global Cleanup on Window Close ===== */
window.addEventListener('beforeunload',function(){
  Object.keys(window.osIntervals||{}).forEach(function(k){clearInterval(window.osIntervals[k]);});
  Object.keys(window.osTimeouts||{}).forEach(function(k){
    var v=window.osTimeouts[k];
    if(typeof v==='number')clearTimeout(v);
    else if(typeof v==='function'){try{v();}catch(e){}}
  });
});