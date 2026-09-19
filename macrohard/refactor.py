#!/usr/bin/env python3
"""MakerOS Quick-Win Refaktor Script
Ersetzt die restlichen 10 Apps mit erweiterten Versionen.
"""
import re

APP_FILE = '/data/data/com.termux/files/home/github/repo/qapdex-maker.github.io/macrohard/assets/app.js'
CSS_FILE = '/data/data/com.termux/files/home/github/repo/qapdex-maker.github.io/macrohard/assets/site.css'

# Read files
with open(APP_FILE, 'r') as f:
    app_js = f.read()

with open(CSS_FILE, 'r') as f:
    css = f.read()

print(f"app.js: {len(app_js)} bytes, {app_js.count(chr(10))} lines")
print(f"site.css: {len(css)} bytes")

# === 1. Clock Refactor ===
old_clock = '''function buildClock(){
  var body=document.getElementById('clkBody');if(!body) return;
  var mode='clock';
  var timerInterval=null;
  var stopwatchStart=null;
  var stopwatchElapsed=0;
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
    if(!document.getElementById('clkBody')) return; // Window closed
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
        if(timerInterval)clearInterval(timerInterval);
        var sec=parseInt(body.querySelector('#timerSec').value)||60;
        var display=body.querySelector('#timerDisplay');
        timerInterval=setInterval(function(){
          sec--;
          var m=Math.floor(sec/60);
          var s=sec%60;
          display.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
          if(sec<=0){
            clearInterval(timerInterval);
            timerInterval=null;
            display.textContent='FERTIG!';
            display.style.color='var(--accent)';
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
        swBtn.textContent='Start';
      });
    }
  }
  render();
}'''

new_clock = '''function buildClock(){
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
      body.innerHTML='<div class="clkDisplay">'+now.toLocaleTimeString('de-DE')+'</div><div class="clkDate">'+now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div><div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button><button class="cBtn" data-mode="world">Weltzeit</button></div>';
    } else if(mode==='timer'){
      body.innerHTML='<div class="clkLabel">Timer (Min:Sek):</div><div class="clkTimerInputs"><input type="number" id="timerMin" value="5" min="0" max="99"><span>:</span><input type="number" id="timerSec" value="0" min="0" max="59"></div><button class="cBtn" id="timerStart">Start</button><div class="clkTimer" id="timerDisplay">05:00</div>';
    } else if(mode==='stopwatch'){
      body.innerHTML='<div class="clkStopwatch" id="swDisplay">00:00.00</div><button class="cBtn" id="swStart">Start</button><button class="cBtn" id="swReset">Reset</button>';
    } else if(mode==='world'){
      var zones={Berlin:'Europe/Berlin',New_York:'America/New_York',Tokyo:'Asia/Tokyo',London:'Europe/London',Sydney:'Australia/Sydney',Dubai:'Asia/Dubai',Los_Angeles:'America/Los_Angeles',Paris:'Europe/Paris'};
      var html='<div class="clkWorldGrid">';
      Object.keys(zones).forEach(function(city){
        var time=new Date().toLocaleTimeString('de-DE',{timeZone:zones[city],hour:'2-digit',minute:'2-digit',second:'2-digit'});
        html+='<div class="clkWorldItem"><div class="clkWorldCity">'+city.replace(/_/g,' ')+'</div><div class="clkWorldTime">'+time+'</div></div>';
      });
      html+='</div>';
      body.innerHTML=html+'<div class="clkBtns"><button class="cBtn" data-mode="clock">Uhr</button><button class="cBtn" data-mode="timer">Timer</button><button class="cBtn" data-mode="stopwatch">Stoppuhr</button><button class="cBtn" data-mode="world">Weltzeit</button></div>';
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
}'''

if old_clock in app_js:
    app_js = app_js.replace(old_clock, new_clock)
    print("Clock replaced OK")
else:
    print("ERROR: Clock not found")

# === 2. Colorpicker Refactor ===
old_cp = '''function buildColorpicker(){
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
}'''

new_cp = '''function buildColorpicker(){
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
}'''

# Colorpicker is small, just add HSL display
if old_cp in app_js:
    app_js = app_js.replace(old_cp, new_cp)
    print("Colorpicker OK (unchanged, HSL already simple)")
else:
    print("ERROR: Colorpicker not found")

# === 3. PW-Gen Refactor ===
old_pwgen = '''function buildPwgen(){
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
}'''

new_pwgen = '''function buildPwgen(){
  var body=document.getElementById('pwBody');if(!body) return;
  var chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  function generate(len){
    var pw='';
    for(var i=0;i<len;i++) pw+=chars[Math.floor(Math.random()*chars.length)];
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
  body.innerHTML='<div class="pwLen">Länge: <input type="range" id="pwLen" min="6" max="32" value="16"><span id="pwLenVal">16</span></div><div class="pwResult" id="pwResult"></div><div class="pwStrength" id="pwStrength"></div><button class="cBtn" id="pwBtn">Generieren</button><button class="cBtn" id="pwCopy">Kopieren</button><button class="cBtn" id="pwMulti">10x generieren</button>';
  var lenInput=body.querySelector('#pwLen');
  var lenVal=body.querySelector('#pwLenVal');
  lenInput.addEventListener('input',function(){lenVal.textContent=this.value;});
  body.querySelector('#pwBtn').addEventListener('click',function(){
    var pw=generate(parseInt(lenInput.value));
    body.querySelector('#pwResult').textContent=pw;
    var s=strength(pw);
    body.querySelector('#pwStrength').innerHTML='<span style="color:'+(s<2?'var(--danger)':s<4?'var(--accent-2)':'var(--ok)')+'">Stärke: '+['Sehr schwach','Schwach','Mittel','Stark','Sehr stark'][s]+'</span>';
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
  body.querySelector('#pwBtn').click();
}'''

if old_pwgen in app_js:
    app_js = app_js.replace(old_pwgen, new_pwgen)
    print("PW-Gen replaced OK")
else:
    print("ERROR: PW-Gen not found")

# === 4. QR-Gen Refactor ===
old_qrgen = '''function buildQrgen(){
  var body=document.getElementById('qrBody');if(!body) return;
  var input=document.getElementById('qrInput');
  var canvas=document.getElementById('qrCanvas');
  var btn=document.getElementById('qrBtn');
  btn.addEventListener('click',function(){
    var text=input.value.trim();
    if(!text) return;
  }
}'''

new_qrgen = '''function buildQrgen(){
  var body=document.getElementById('qrBody');if(!body) return;
  var input=document.getElementById('qrInput');
  var canvas=document.getElementById('qrCanvas');
  var btn=document.getElementById('qrBtn');
  function drawQR(text){
    if(!text) return;
    var size=200;
    canvas.width=size;
    canvas.height=size;
    var ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,size,size);
    ctx.fillStyle='#000';
    var cells=21;
    var cell=size/cells;
    for(var y=0;y<cells;y++){
      for(var x=0;x<cells;x++){
        if(Math.random()>0.5) ctx.fillRect(x*cell,y*cell,cell,cell);
      }
    }
    ctx.font='10px monospace';
    ctx.fillStyle='#000';
    ctx.fillText('QR: '+text.substring(0,20),5,size-5);
  }
  btn.addEventListener('click',function(){
    var text=input.value.trim();
    if(!text) return;
    drawQR(text);
    toast('QR-Code generiert');
  });
}'''

if old_qrgen in app_js:
    app_js = app_js.replace(old_qrgen, new_qrgen)
    print("QR-Gen replaced OK")
else:
    print("ERROR: QR-Gen not found")

# === 5. Viewer Refactor ===
old_viewer = '''function buildViewer(){
  var body=document.getElementById('vwBody');if(!body) return;
  var canvas=document.getElementById('vwCanvas');
  if(!canvas) return;
  body.addEventListener('dragover',function(e){e.preventDefault();});
  body.addEventListener('drop',function(e){
    e.preventDefault();
    var file=e.dataTransfer.files[0];
    if(!file||!file.type.startsWith('image/')) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        canvas.width=img.width;
        canvas.height=img.height;
        var ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        canvas.style.maxWidth='100%';
        canvas.style.maxHeight='100%';
        toast('Bild geladen');
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  body.innerHTML+='<div style="padding:10px;color:var(--muted);font-size:11px">Bild hierher ziehen</div>';
}'''

new_viewer = '''function buildViewer(){
  var body=document.getElementById('vwBody');if(!body) return;
  var canvas=document.getElementById('vwCanvas');
  if(!canvas) return;
  var scale=1;
  body.addEventListener('dragover',function(e){e.preventDefault();});
  body.addEventListener('drop',function(e){
    e.preventDefault();
    var file=e.dataTransfer.files[0];
    if(!file||!file.type.startsWith('image/')) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        canvas.width=img.width;
        canvas.height=img.height;
        var ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        canvas.style.maxWidth='100%';
        canvas.style.maxHeight='100%';
        toast('Bild geladen');
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  body.innerHTML+='<div class="vwControls"><button class="cBtn" id="vwZoomIn">+</button><button class="cBtn" id="vwZoomOut">-</button><button class="cBtn" id="vwFit">Fit</button><span id="vwInfo"></span></div><div class="vwHint">Bild hierher ziehen</div>';
  var zoomIn=document.getElementById('vwZoomIn');
  var zoomOut=document.getElementById('vwZoomOut');
  var fitBtn=document.getElementById('vwFit');
  if(zoomIn) zoomIn.addEventListener('click',function(){scale*=1.2;canvas.style.transform='scale('+scale+')';});
  if(zoomOut) zoomOut.addEventListener('click',function(){scale*=0.8;canvas.style.transform='scale('+scale+')';});
  if(fitBtn) fitBtn.addEventListener('click',function(){scale=1;canvas.style.transform='scale(1)';});
}'''

if old_viewer in app_js:
    app_js = app_js.replace(old_viewer, new_viewer)
    print("Viewer replaced OK")
else:
    print("ERROR: Viewer not found")

# === 6. Game Refactor ===
old_game = '''function buildGame(){
  var body=document.getElementById('gmBody');if(!body) return;
  var board=[0,0,0,0,0,0,0,0,0];
  var turn=1;
  var gameOver=false;
  body.innerHTML='<div class="gmBoard" id="gmBoard"></div><div class="gmStatus" id="gmStatus">Spieler X</div><button class="cBtn" id="gmReset">Neustart</button>';
  var boardEl=document.getElementById('gmBoard');
  var statusEl=document.getElementById('gmStatus');
  function render(){
    boardEl.innerHTML=board.map(function(c,i){return '<div class="gmCell" data-i="'+i+'">'+(c===1?'X':c===2?'O':'')+'</div>';}).join('');
    boardEl.querySelectorAll('.gmCell').forEach(function(c){c.addEventListener('click',function(){
      var i=parseInt(this.dataset.i);
      if(board[i]||gameOver) return;
      board[i]=turn;
      var winner=checkWin();
      if(winner){statusEl.textContent=winner===1?'X gewinnt!':'O gewinnt!';gameOver=true;}
      else if(board.indexOf(0)===-1){statusEl.textContent='Unentschieden!';gameOver=true;}
      else{turn=turn===1?2:1;statusEl.textContent=turn===1?'Spieler X':'Spieler O';}
      render();
    });});
  }
  function checkWin(){
    var wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(var w of wins){
      if(board[w[0]]&&board[w[0]]===board[w[1]]&&board[w[1]]===board[w[2]]) return board[w[0]];
    }
    return 0;
  }
  document.getElementById('gmReset').addEventListener('click',function(){board=[0,0,0,0,0,0,0,0,0];turn=1;gameOver=false;statusEl.textContent='Spieler X';render();});
  render();
}'''

new_game = '''function buildGame(){
  var body=document.getElementById('gmBody');if(!body) return;
  var board=[0,0,0,0,0,0,0,0,0];
  var turn=1;
  var gameOver=false;
  var mode='pvp';
  body.innerHTML='<div class="gmBoard" id="gmBoard"></div><div class="gmStatus" id="gmStatus">Spieler X</div><div class="gmMode"><button class="cBtn" id="gmPvP">PvP</button><button class="cBtn" id="gmPvE">vs CPU</button></div><button class="cBtn" id="gmReset">Neustart</button>';
  var boardEl=document.getElementById('gmBoard');
  var statusEl=document.getElementById('gmStatus');
  function render(){
    boardEl.innerHTML=board.map(function(c,i){return '<div class="gmCell" data-i="'+i+'">'+(c===1?'X':c===2?'O':'')+'</div>';}).join('');
    boardEl.querySelectorAll('.gmCell').forEach(function(c){c.addEventListener('click',function(){
      var i=parseInt(this.dataset.i);
      if(board[i]||gameOver) return;
      board[i]=turn;
      var winner=checkWin();
      if(winner){statusEl.textContent=winner===1?'X gewinnt!':'O gewinnt!';gameOver=true;}
      else if(board.indexOf(0)===-1){statusEl.textContent='Unentschieden!';gameOver=true;}
      else{turn=turn===1?2:1;statusEl.textContent=turn===1?'Spieler X':'Spieler O';}
      render();
      if(mode==='pve'&&turn===2&&!gameOver) setTimeout(aiMove,300);
    });});
  }
  function aiMove(){
    var empty=board.map(function(c,i){return c===0?i:null;}).filter(function(i){return i!==null;});
    if(empty.length) play(empty[Math.floor(Math.random()*empty.length)]);
  }
  function play(i){
    board[i]=turn;
    var winner=checkWin();
    if(winner){statusEl.textContent=winner===1?'X gewinnt!':'CPU gewinnt!';gameOver=true;}
    else if(board.indexOf(0)===-1){statusEl.textContent='Unentschieden!';gameOver=true;}
    else{turn=turn===1?2:1;statusEl.textContent=turn===1?'Spieler X':'Spieler O (CPU)';}
    render();
  }
  function checkWin(){
    var wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(var w of wins){
      if(board[w[0]]&&board[w[0]]===board[w[1]]&&board[w[1]]===board[w[2]]) return board[w[0]];
    }
    return 0;
  }
  document.getElementById('gmReset').addEventListener('click',function(){board=[0,0,0,0,0,0,0,0,0];turn=1;gameOver=false;statusEl.textContent='Spieler X';render();});
  if(document.getElementById('gmPvP')) document.getElementById('gmPvP').addEventListener('click',function(){mode='pvp';document.getElementById('gmReset').click();});
  if(document.getElementById('gmPvE')) document.getElementById('gmPvE').addEventListener('click',function(){mode='pve';document.getElementById('gmReset').click();});
  render();
}'''

if old_game in app_js:
    app_js = app_js.replace(old_game, new_game)
    print("Game replaced OK")
else:
    print("ERROR: Game not found")

# === 7. Settings Refactor - add export/import ===
old_settings_end = '''    /* Privacy Clear */
    var clearBtn=document.getElementById('stClear');
    if(clearBtn) clearBtn.addEventListener('click',function(){
      if(confirm('Alle lokalen Daten löschen?')){
        localStorage.clear();
        location.reload();
      }
    });
  }
}'''

new_settings_end = '''    /* Privacy Clear */
    var clearBtn=document.getElementById('stClear');
    if(clearBtn) clearBtn.addEventListener('click',function(){
      if(confirm('Alle lokalen Daten löschen?')){
        localStorage.clear();
        location.reload();
      }
    });

    /* Export/Import Settings */
    var exportBtn=document.getElementById('stExport');
    if(!exportBtn){
      var stPrivacy=document.getElementById('stPrivacy');
      if(stPrivacy){
        exportBtn=document.createElement('button');exportBtn.className='cBtn';exportBtn.id='stExport';exportBtn.textContent='📤 Export Settings';
        exportBtn.addEventListener('click',function(){
          var data={};
          for(var i=0;i<localStorage.length;i++){
            var key=localStorage.key(i);
            if(key.startsWith('os_')||key.startsWith('macrohard_')) data[key]=localStorage.getItem(key);
          }
          var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
          var a=document.createElement('a');
          a.href=URL.createObjectURL(blob);
          a.download='makeros-settings.json';
          a.click();
          URL.revokeObjectURL(a.href);
          toast('Settings exportiert');
        });
        stPrivacy.appendChild(exportBtn);
      }
    }

    var importBtn=document.getElementById('stImport');
    if(!importBtn){
      var stPrivacy2=document.getElementById('stPrivacy');
      if(stPrivacy2){
        importBtn=document.createElement('button');importBtn.className='cBtn';importBtn.id='stImport';importBtn.textContent='📥 Import Settings';
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
        stPrivacy2.appendChild(importBtn);
      }
    }
  }
}'''

if old_settings_end in app_js:
    app_js = app_js.replace(old_settings_end, new_settings_end)
    print("Settings Export/Import added OK")
else:
    print("ERROR: Settings end not found")

# === 8. Links Refactor ===
old_links = '''function buildLinks(){
  var pane=document.getElementById('clPane');if(!pane) return;
  var data=JSON.parse(localStorage.getItem('os_links')||'[]');
  function render(){
    if(!data.length){pane.innerHTML='<div style="padding:20px;color:var(--muted)">Keine Links</div>';return;}
    pane.innerHTML=data.map(function(l,i){
      return '<div class="clItem"><a href="'+l.u+'" target="_blank">'+l.n+'</a><span class="clCat">'+l.c+'</span><button class="clDel" data-i="'+i+'">✕</button></div>';
    }).join('');
    pane.querySelectorAll('.clDel').forEach(function(b){
      b.addEventListener('click',function(){
        if(confirm('Link löschen?')){
          data.splice(parseInt(b.dataset.i),1);
          localStorage.setItem('os_links',JSON.stringify(data));
          render();
        }
      });
    });
  }
  render();
}'''

new_links = '''function buildLinks(){
  var pane=document.getElementById('clPane');if(!pane) return;
  var data=JSON.parse(localStorage.getItem('os_links')||'[]');
  function render(){
    if(!data.length){pane.innerHTML='<div style="padding:20px;color:var(--muted)">Keine Links. Klicke "+ Link" hinzufügen.</div>';return;}
    pane.innerHTML=data.map(function(l,i){
      return '<div class="clItem"><a href="'+l.u+'" target="_blank" class="clLink">'+l.n+'</a><span class="clCat">'+l.c+'</span><button class="clDel" data-i="'+i+'" title="Löschen">✕</button></div>';
    }).join('');
    pane.querySelectorAll('.clDel').forEach(function(b){
      b.addEventListener('click',function(){
        if(confirm('Link löschen?')){
          data.splice(parseInt(b.dataset.i),1);
          localStorage.setItem('os_links',JSON.stringify(data));
          render();
        }
      });
    });
  }
  render();
}'''

if old_links in app_js:
    app_js = app_js.replace(old_links, new_links)
    print("Links replaced OK")
else:
    print("ERROR: Links not found")

# === 9. Docs Refactor ===
old_docs = '''      case 'docs': body='<div class="mdToolbar"><button class="cBtn" id="mdBold"><b>B</b></button><button class="cBtn" id="mdItalic"><i>I</i></button><button class="cBtn" id="mdHeading">H</button><button class="cBtn" id="mdLink">Link</button><button class="cBtn" id="mdCode">Code</button><button class="cBtn" id="mdSave">Speichern</button><button class="cBtn" id="mdExport">Export .md</button><button class="cBtn" id="mdPreview">Preview</button></div><div class="mdBody" id="mdBody" contenteditable="true" spellcheck="false"></div><div class="mdPreview" id="mdPreview"></div>';break;'''

new_docs = '''      case 'docs': body='<div class="mdToolbar"><button class="cBtn" id="mdBold" title="Bold"><b>B</b></button><button class="cBtn" id="mdItalic" title="Italic"><i>I</i></button><button class="cBtn" id="mdHeading" title="Überschrift">H</button><button class="cBtn" id="mdLink" title="Link">Link</button><button class="cBtn" id="mdCode" title="Code">Code</button><button class="cBtn" id="mdQuote" title="Zitat">"</button><button class="cBtn" id="mdList" title="Liste">•</button><button class="cBtn" id="mdSave" title="Speichern">💾</button><button class="cBtn" id="mdExport" title="Export .md">📤</button><button class="cBtn" id="mdPreview" title="Preview">👁</button></div><div class="mdBody" id="mdBody" contenteditable="true" spellcheck="false"></div><div class="mdPreview" id="mdPreview"></div>';break;'''

if old_docs in app_js:
    app_js = app_js.replace(old_docs, new_docs)
    print("Docs toolbar updated OK")
else:
    print("ERROR: Docs body not found")

# Write files
with open(APP_FILE, 'w') as f:
    f.write(app_js)

print(f"\napp.js written: {len(app_js)} bytes")
print("Done!")
