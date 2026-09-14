/* Macrohard Doors OS — App Logic */
(function(){
  'use strict';
  var lang='de';
  var apps={};
  var focused=null;
  var zIdx=100;
  var bootDone=false;

  var I18N={
    de:{
      desktop:'Desktop',clock:'',
      notepad:'Notepad',calculator:'Calculator',terminal:'Terminal',
      explorer:'Explorer',paint:'Paint',
      start:'Start',search:'Suche...',
      noproc:'Kein Prozess',
      welcome:'Willkommen bei Macrohard Doors OS',
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
      explorer:'Explorer',paint:'Paint',
      start:'Start',search:'Search...',
      noproc:'No process',
      welcome:'Welcome to Macrohard Doors OS',
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
  setInterval(tickClock,1000); tickClock();

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

  /* Desktop icons */
  var desktopApps=[
    {id:'notepad',label:'Notepad',icon:'notepad'},
    {id:'calculator',label:'Calculator',icon:'calc'},
    {id:'terminal',label:'Terminal',icon:'term'},
    {id:'explorer',label:'Explorer',icon:'fe'},
    {id:'paint',label:'Paint',icon:'paint'},
  ];

  function makeIcon(a){
    var div=document.createElement('div');
    div.className='dskApp';
    div.setAttribute('data-app',a.id);
    div.innerHTML=a.iconSvg+'<span class=\"lbl\">'+a.label+'</span>';
    div.addEventListener('click',function(){openApp(a.id);});
    return div;
  }

  function svgIcon(name){
    var s={
      notepad:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z\"/><polyline points=\"14,2 14,8 20,8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/><polyline points=\"10,9 9,9 8,9\"/></svg>',
      calc:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><line x1=\"8\" y1=\"6\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"10\" x2=\"10\" y2=\"10\"/><line x1=\"14\" y1=\"10\" x2=\"16\" y2=\"10\"/><line x1=\"8\" y1=\"14\" x2=\"10\" y2=\"14\"/><line x1=\"14\" y1=\"14\" x2=\"16\" y2=\"14\"/><line x1=\"8\" y1=\"18\" x2=\"10\" y2=\"18\"/><line x1=\"14\" y1=\"18\" x2=\"16\" y2=\"18\"/><line x1=\"10\" y1=\"6\" x2=\"14\" y2=\"6\"/></svg>',
      term:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><polyline points=\"4,17 10,11 4,5\"/><line x1=\"12\" y1=\"19\" x2=\"20\" y2=\"19\"/></svg>',
      fe:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z\"/><line x1=\"12\" y1=\"11\" x2=\"12\" y2=\"17\"/><line x1=\"9\" y1=\"14\" x2=\"15\" y2=\"14\"/></svg>',
      paint:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M12 19l7-7 3 3-7 7-3-3z\"/><path d=\"M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z\"/><path d=\"M2 2l7.586 7.586\"/><circle cx=\"11\" cy=\"7\" r=\"2\"/></svg>',
      music:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>',
      links:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71\"/></svg>',
      settings:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z\"/></svg>',
      perchance:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polygon points=\"10,8 16,12 10,16\"/></svg>',
      docs:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z\"/><polyline points=\"14,2 14,8 20,8\"/></svg>',
      chat:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z\"/></svg>',
      camera:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"><path d=\"M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/></svg>'
    };
    return s[name]||'';
  }

  /* Start menu */
  document.getElementById('tbStart').addEventListener('click',function(e){
    e.stopPropagation();
    document.getElementById('startMenu').classList.toggle('open');
  });
  document.addEventListener('click',function(){document.getElementById('startMenu').classList.remove('open');});

  /* Lock → Desktop */
  document.getElementById('lock').addEventListener('click',function(){
    this.classList.add('hide');
  });

  /* Window management */
  function openApp(id){
    var w=document.getElementById('w-'+id);
    if(w){w.classList.add('focused');w.style.zIndex=++zIdx;focused=id;updateFocus();return;}
    var mk=document.createElement('div');
    mk.className='wnd';
    mk.id='w-'+id;
    mk.style.left=(80+(zIdx%5)*30)+'px';mk.style.top=(40+(zIdx%5)*20)+'px';
    mk.style.zIndex=++zIdx;mk.setAttribute('data-app',id);
    var title=t(id);
    var body='';
    switch(id){
      case 'notepad': body='<textarea class=\"npArea\" id=\"npArea\" placeholder=\"Notepad — tippe hier...\"></textarea><div class=\"npStats\" id=\"npStats\">0 Zeichen</div>';break;
      case 'calculator': body='<div class=\"calHead\"><input class=\"cExpr\" id=\"cExpr\" readonly value=\"0\"><span class=\"cCur\" id=\"cCur\">0</span></div><div class=\"calGrid\" id=\"calGrid\"></div>';break;
      case 'terminal': body='<div class=\"termOut\" id=\"termOut\"></div><div class=\"termIn\"><span class=\"prompt\">user@macrohard:~$</span><input id=\"termIn\" autofocus></div>';break;
      case 'explorer': body='<div class=\"fePath\"><span>📁</span><input id=\"fePath\" value=\"C:\\Users\\macrohard\\Desktop\"></div><div class=\"feSide\" id=\"feSide\"></div><div class=\"feGrid\" id=\"feGrid\"></div>';break;
      case 'paint': body='<div class=\"ptColors\" id=\"ptColors\"></div><canvas class=\"ptCanvas\" id=\"ptCanvas\" width=\"400\" height=\"260\"></canvas>';break;
    }
    mk.innerHTML='<div class=\"wtitle\"><span class=\"wact\"></span><span class=\"wtxt\">'+title+'</span><button class=\"wmin\">_</button><button class=\"wclose\">×</button></div><div class=\"wbody\">'+body+'</div><div class=\"wnd-resize\"></div>';
    document.getElementById('desktop').appendChild(mk);
    if(id==='calculator') buildCalc();
    if(id==='explorer') buildExplorer();
    if(id==='paint') buildPaint();
    if(id==='terminal') buildTerminal();
    if(id==='notepad') setupNotepad();
    mk.addEventListener('mousedown',function(){this.classList.add('focused');this.style.zIndex=++zIdx;focused=id;updateFocus();});
    mk.querySelector('.wclose').addEventListener('click',function(){mk.remove();});
    mk.querySelector('.wmin').addEventListener('click',function(){mk.style.display='none';setTimeout(function(){mk.style.display='';},2000);});
    focused=id; updateFocus();
  }

  function updateFocus(){
    document.querySelectorAll('.wnd').forEach(function(w){w.classList.remove('focused');});
    var f=document.getElementById('w-'+focused);
    if(f) f.classList.add('focused');
  }

  /* Notepad */
  function setupNotepad(){
    var a=document.getElementById('npArea');
    var s=document.getElementById('npStats');
    if(!a) return;
    a.addEventListener('input',function(){s.textContent=a.value.length+' Zeichen';});
  }

  /* Calculator */
  function buildCalc(){
    var grid=document.getElementById('calGrid');if(!grid) return;
    var btns=['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','0','.','='];
    var opClasses={'\u00f7':'op','\u00d7':'op','\u2212':'op','+':'op','=':'eq','C':'op','\u00b1':'op','%':'op'};
    btns.forEach(function(b){
      var btn=document.createElement('button');btn.className='cBtn'+(opClasses[b]?' '+opClasses[b]:'');
      btn.textContent=b;btn.addEventListener('click',function(){calcPress(b);});
      grid.appendChild(btn);
    });
  }
  function calcPress(b){
    var expr=document.getElementById('cExpr');var cur=document.getElementById('cCur');if(!expr) return;
    if(b==='C'){expr.value='0';cur.textContent='0';return;}
    if(b==='±'){expr.value=(parseFloat(expr.value||'0')*-1).toString();return;}
    if(b==='%'){expr.value=(parseFloat(expr.value||'0')/100).toString();return;}
    if(b==='='){try{expr.value=eval(expr.value.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-'));cur.textContent='';}catch(e){expr.value='Error';}}
    else{if(expr.value==='0')expr.value=b;else expr.value+=b;}
  }

  /* Terminal */
  var termHist=[];var termHistI=0;
  function buildTerminal(){
    var out=document.getElementById('termOut');var inp=document.getElementById('termIn');if(!out||!inp) return;
    function w(text){var d=document.createElement('div');d.textContent=text;out.appendChild(d);out.scrollTop=out.scrollHeight;}
    w('Macrohard Doors OS — Terminal');w('Typse \"help\" für Befehle.');
    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        var cmd=inp.value.trim();if(!cmd){return;}
        w('user@macrohard:~$ '+cmd);termHist.push(cmd);termHistI=termHist.length;
        var args=cmd.split(' ');var c=args[0].toLowerCase();
        switch(c){
          case 'help':w('Befehle: help, ls, cd, mkdir, echo, date, clear, whoami');break;
          case 'ls':w('Dokumente  Downloads  Bilder  Desktop  Programme');break;
          case 'cd':w('Wechsel zu '+args[1]);break;
          case 'mkdir':w('Ordner \"'+args[1]+'\" erstellt.');break;
          case 'echo':w(args.slice(1).join(' '));break;
          case 'date':w(new Date().toString());break;
          case 'clear':out.innerHTML='';break;
          case 'whoami':w('macrohard\\user');break;
          default:w('Unbekannt: '+c+' — tipse \"help\"');
        }
        inp.value='';
      }
      if(e.key==='ArrowUp'){if(termHistI>0){termHistI--;inp.value=termHist[termHistI];}}
      if(e.key==='ArrowDown'){if(termHistI<termHist.length-1){termHistI++;inp.value=termHist[termHistI];}else{termHistI=termHist.length;inp.value='';}}
    });
  }

  /* Explorer */
  var fsData={
    'C:\\':{dirs:['Users','Program Files','Windows'],files:['README.txt']},
    'C:\\Users':{dirs:['macrohard','Public'],files:[]},
    'C:\\Users\\macrohard':{dirs:['Desktop','Dokumente','Downloads'],files:['notes.txt']},
    'C:\\Users\\macrohard\\Desktop':{dirs:[],files:['index.html','style.css','script.js','screenshot.png']},
    'C:\\Users\\macrohard\\Dokumente':{dirs:[],files:['projektplan.docx','daten.csv']},
    'C:\\Users\\macrohard\\Downloads':{dirs:[],files:['macrohard.zip','theme.exe','readme.md']},
    'C:\\Program Files':{dirs:['Macrohard','Editor'],files:[]},
    'C:\\Windows':{dirs:['System32'],files:['system.ini']},
  };
  var curPath='C:\\';
  function buildExplorer(){
    renderExplorer();
    var inp=document.getElementById('fePath');if(!inp) return;
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'){curPath=inp.value;renderExplorer();}});
  }
  function renderExplorer(){
    var side=document.getElementById('feSide');var grid=document.getElementById('feGrid');var inp=document.getElementById('fePath');
    if(!side||!grid) return;
    if(inp) inp.value=curPath;
    var d=fsData[curPath]||{dirs:[],files:[]};
    side.innerHTML='';
    var parts=curPath.split('\\').filter(Boolean);
    var acc='C:\\';
    side.innerHTML+='<div class=\"feDir\">📁 Root</div>';
    side.innerHTML+='<div class=\"feItem\" data-path=\"C:\\\">C:\\</div>';
    parts.forEach(function(p){acc+=p+'\\';side.innerHTML+='<div class=\"feItem\" data-path=\"'+acc+'\">📁 '+p+'</div>';});
    side.querySelectorAll('.feItem').forEach(function(el){el.addEventListener('click',function(){curPath=el.dataset.path;renderExplorer();});});
    grid.innerHTML='';
    d.dirs.forEach(function(dir){
      var el=document.createElement('div');el.className='feFile';
      el.innerHTML='<span style=\"font-size:22px\">📁</span><span class=\"fn\">'+dir+'</span>';
      el.addEventListener('click',function(){curPath=curPath==='C:\\'?'C:\\'+dir:curPath+dir+'\\';renderExplorer();});
      grid.appendChild(el);
    });
    d.files.forEach(function(f){
      var el=document.createElement('div');el.className='feFile';
      var ext=f.split('.').pop().toLowerCase();
      var icon={txt:'📄',html:'🌐',css:'🎨',js:'⚡',png:'🖼',jpg:'🖼',csv:'📊',docx:'📝',zip:'📦',exe:'⚙',md:'📝'}[ext]||'📄';
      el.innerHTML=icon+'<span class=\"fn\">'+f+'</span>';
      el.addEventListener('click',function(){alert(f+' — (mock, keine echte Datei)');});
      grid.appendChild(el);
    });
  }

  /* Paint */
  var paintColor='#000';var painting=false;var pCtx=null;
  function buildPaint(){
    var colors=document.getElementById('ptColors');var canvas=document.getElementById('ptCanvas');if(!colors||!canvas) return;
    var cls=['#000','#fff','#ff0','#f00','#0f0','#00f','#f0f','#ff8000','#800','#080','#008','#808'];
    cls.forEach(function(c){
      var b=document.createElement('button');b.style.background=c;
      if(c==='#000')b.classList.add('active');
      b.addEventListener('click',function(){paintColor=c;colors.querySelectorAll('button').forEach(function(x){x.classList.remove('active');});b.classList.add('active');});
      colors.appendChild(b);
    });
    pCtx=canvas.getContext('2d');pCtx.fillStyle='#fff';pCtx.fillRect(0,0,canvas.width,canvas.height);
    pCtx.strokeStyle=paintColor;pCtx.lineWidth=3;pCtx.lineCap='round';
    canvas.addEventListener('mousedown',function(e){painting=true;pCtx.beginPath();pCtx.moveTo(e.offsetX,e.offsetY);});
    canvas.addEventListener('mousemove',function(e){if(!painting)return;pCtx.strokeStyle=paintColor;pCtx.lineTo(e.offsetX,e.offsetY);pCtx.stroke();});
    canvas.addEventListener('mouseup',function(){painting=false;});
    canvas.addEventListener('mouseleave',function(){painting=false;});
    /* touch support for Android/Termux */
    canvas.addEventListener('touchstart',function(e){e.preventDefault();painting=true;pCtx.beginPath();var t=e.touches[0];var r=canvas.getBoundingClientRect();pCtx.moveTo(t.clientX-r.left,t.clientY-r.top);},{passive:false});
    canvas.addEventListener('touchmove',function(e){e.preventDefault();if(!painting)return;var t=e.touches[0];var r=canvas.getBoundingClientRect();pCtx.strokeStyle=paintColor;pCtx.lineTo(t.clientX-r.left,t.clientY-r.top);pCtx.stroke();},{passive:false});
    canvas.addEventListener('touchend',function(){painting=false;});
  }

  /* Music */
  function buildMusic(){
    var list=document.getElementById('musList');if(!list) return;
    var songs=[{n:'Macrohard Anthems',a:'IDUN Studio'},{n:'Doors of Cancellation',a:'Perchance Sound'},{n:'Neo-Brutalist Beat',a:'qapdex-maker'}];
    songs.forEach(function(s){
      var item=document.createElement('div');item.className='musItem';
      item.innerHTML='<button class=\"musPlay\">▶</button><span class=\"musInfo\"><b>'+s.n+'</b><br><span style=\"font-size:10px;color:var(--muted)\">'+s.a+'</span></span>';
      item.querySelector('.musPlay').addEventListener('click',function(){this.textContent=this.textContent==='▶'?'⏸':'▶';});
      list.appendChild(item);
    });
  }

  /* Links */
  function buildLinks(){
    var pane=document.getElementById('clPane');if(!pane) return;
    var links=[{n:'GitHub',u:'https://github.com/qapdex-maker'},{n:'Perchance',u:'https://perchance.org'},{n:'Macrohard Docs',u:'javascript:void(0)'}];
    links.forEach(function(l){
      var el=document.createElement('a');el.className='clLink';el.href=l.u;
      el.innerHTML='<span class=\"clIco\">🔗</span><span>'+l.n+'</span>';
      pane.appendChild(el);
    });
  }

  /* Settings */
  function buildSettings(){
    var pane=document.getElementById('stPane');if(!pane) return;
    pane.innerHTML='<label><input type=\"checkbox\" id=\"stDark\"> Dark Mode</label><label><input type=\"checkbox\" id=\"stScan\" checked> Scanlines</label><label>Sprache: <select id=\"stLang\"><option value=\"de\">Deutsch</option><option value=\"en\">English</option></select></label>';
    document.getElementById('stDark').addEventListener('change',function(){document.documentElement.dataset.theme=this.checked?'dark':'';});
    document.getElementById('stLang').addEventListener('change',function(){lang=this.value;refreshUI();});
  }

  function refreshUI(){
    document.querySelectorAll('.wtxt').forEach(function(el){var id=el.closest('.wnd');if(id)el.textContent=t(id.id.replace('w-',''));});
  }

  /* Init */
  window.addEventListener('DOMContentLoaded',function(){
    /* desktop icons */
    var desk=document.getElementById('deskIcons');
    desktopApps.forEach(function(a){
      a.iconSvg=svgIcon(a.icon);
      desk.appendChild(makeIcon(a));
    });
    /* start menu */
    var sm=document.getElementById('smList');
    desktopApps.forEach(function(a){
      var it=document.createElement('div');it.className='smItem';it.setAttribute('data-app',a.id);
      it.innerHTML='<span class=\"ico\">'+a.iconSvg+'</span>'+t(a.id);
      it.addEventListener('click',function(){openApp(a.id);document.getElementById('startMenu').classList.remove('open');});
      sm.appendChild(it);
    });
    buildMusic();buildLinks();buildSettings();
    /* lock click */
    document.getElementById('lock').addEventListener('click',function(){this.classList.add('hide');});
  });

  window.addEventListener('DOMContentLoaded',function(){
    setTimeout(startOS,1500);
  });
})();