#!/usr/bin/env python3
"""MakerOS Quick-Win Refaktor Script - Part 2"""
import re

APP_FILE = '/data/data/com.termux/files/home/github/repo/qapdex-maker.github.io/macrohard/assets/app.js'

with open(APP_FILE, 'r') as f:
    app_js = f.read()

print(f"app.js: {len(app_js)} bytes, {app_js.count(chr(10))} lines")

# === 1. QR-Gen: Add color + size options ===
old_qrgen = '''function buildQrgen(){
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
}'''

new_qrgen = '''function buildQrgen(){
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
}'''

if old_qrgen in app_js:
    app_js = app_js.replace(old_qrgen, new_qrgen)
    print("QR-Gen replaced OK")
else:
    print("ERROR: QR-Gen not found")

# === 2. Viewer: Add zoom controls ===
old_viewer = '''function buildViewer(){
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
}'''

new_viewer = '''function buildViewer(){
  var body=document.getElementById('vwBody');if(!body) return;
  var placeholder=document.getElementById('vwPlaceholder');
  var canvas=document.getElementById('vwCanvas');
  var scale=1;
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
      scale=1;
      canvas.style.transform='scale(1)';
    };
    img.src=URL.createObjectURL(file);
  });
  if(!document.getElementById('vwControls')){
    var controls=document.createElement('div');
    controls.id='vwControls';
    controls.className='vwControls';
    controls.innerHTML='<button class="cBtn" id="vwZoomIn">+</button><button class="cBtn" id="vwZoomOut">-</button><button class="cBtn" id="vwFit">Fit</button><span id="vwInfo"></span>';
    body.insertBefore(controls, placeholder);
    document.getElementById('vwZoomIn').addEventListener('click',function(){scale*=1.3;canvas.style.transform='scale('+scale+')';});
    document.getElementById('vwZoomOut').addEventListener('click',function(){scale*=0.7;canvas.style.transform='scale('+scale+')';});
    document.getElementById('vwFit').addEventListener('click',function(){scale=1;canvas.style.transform='scale(1)';});
  }
}'''

if old_viewer in app_js:
    app_js = app_js.replace(old_viewer, new_viewer)
    print("Viewer replaced OK")
else:
    print("ERROR: Viewer not found")

# === 3. Game: Add AI mode ===
old_game = '''function buildGame(){
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
}'''

new_game = '''function buildGame(){
  var body=document.getElementById('gmBody');if(!body) return;
  var board=['','','','','','','','',''];
  var player='X';
  var gameOver=false;
  var mode='pvp';
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
    if(empty.length) return empty[Math.floor(Math.random()*empty.length)];
    return -1;
  }
  function render(){
    body.innerHTML='<div class="gmStatus">'+(gameOver?'Spiel vorbei!':'Spieler '+player+' ist dran')+'</div><div class="gmMode"><button class="cBtn" id="gmPvP">PvP</button><button class="cBtn" id="gmPvE">vs CPU</button></div><div class="gmGrid"></div><button class="cBtn" id="gmReset">Neustart</button>';
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
      board=['','','','','','','','',''];
      player='X';gameOver=false;render();
    });
    if(document.getElementById('gmPvP')) document.getElementById('gmPvP').addEventListener('click',function(){mode='pvp';document.querySelector('#gmReset').click();});
    if(document.getElementById('gmPvE')) document.getElementById('gmPvE').addEventListener('click',function(){mode='pve';document.querySelector('#gmReset').click();});
  }
  render();
}'''

if old_game in app_js:
    app_js = app_js.replace(old_game, new_game)
    print("Game replaced OK")
else:
    print("ERROR: Game not found")

# === 4. Settings: Add export/import ===
old_settings_clear = '''    /* Privacy Clear */
    var clearBtn=document.getElementById('stClear');
    if(clearBtn) clearBtn.addEventListener('click',function(){
      if(confirm('Alle lokalen Daten löschen?')){
        localStorage.clear();
        location.reload();
      }
    });
  }
}'''

new_settings_clear = '''    /* Privacy Clear */
    var clearBtn=document.getElementById('stClear');
    if(clearBtn) clearBtn.addEventListener('click',function(){
      if(confirm('Alle lokalen Daten löschen?')){
        localStorage.clear();
        location.reload();
      }
    });

    /* Export/Import Settings */
    var stPrivacy=document.getElementById('stPrivacy');
    if(stPrivacy){
      var exportBtn=document.createElement('button');
      exportBtn.className='cBtn';
      exportBtn.textContent='📤 Export Settings';
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
      stPrivacy.appendChild(exportBtn);

      var importBtn=document.createElement('button');
      importBtn.className='cBtn';
      importBtn.textContent='📥 Import Settings';
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
      stPrivacy.appendChild(importBtn);
    }
  }
}'''

if old_settings_clear in app_js:
    app_js = app_js.replace(old_settings_clear, new_settings_clear)
    print("Settings Export/Import added OK")
else:
    print("ERROR: Settings clear not found")

# === 5. Links: Add favorites ===
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

# === 6. Docs: Add quote + list buttons ===
old_docs = '''case 'docs': body='<div class="mdToolbar"><button class="cBtn" id="mdBold"><b>B</b></button><button class="cBtn" id="mdItalic"><i>I</i></button><button class="cBtn" id="mdHeading">H</button><button class="cBtn" id="mdLink">Link</button><button class="cBtn" id="mdCode">Code</button><button class="cBtn" id="mdSave">Speichern</button><button class="cBtn" id="mdExport">Export .md</button><button class="cBtn" id="mdPreview">Preview</button></div><div class="mdBody" id="mdBody" contenteditable="true" spellcheck="false"></div><div class="mdPreview" id="mdPreview"></div>';break;'''

new_docs = '''case 'docs': body='<div class="mdToolbar"><button class="cBtn" id="mdBold" title="Bold"><b>B</b></button><button class="cBtn" id="mdItalic" title="Italic"><i>I</i></button><button class="cBtn" id="mdHeading" title="Überschrift">H</button><button class="cBtn" id="mdLink" title="Link">Link</button><button class="cBtn" id="mdCode" title="Code">Code</button><button class="cBtn" id="mdQuote" title="Zitat">"</button><button class="cBtn" id="mdList" title="Liste">•</button><button class="cBtn" id="mdSave" title="Speichern">💾</button><button class="cBtn" id="mdExport" title="Export .md">📤</button><button class="cBtn" id="mdPreview" title="Preview">👁</button></div><div class="mdBody" id="mdBody" contenteditable="true" spellcheck="false"></div><div class="mdPreview" id="mdPreview"></div>';break;'''

if old_docs in app_js:
    app_js = app_js.replace(old_docs, new_docs)
    print("Docs toolbar updated OK")
else:
    print("ERROR: Docs body not found")

# Write
with open(APP_FILE, 'w') as f:
    f.write(app_js)

print(f"\napp.js written: {len(app_js)} bytes")
print("Done!")
