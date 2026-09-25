/* Editor — DOM-Verdrahtung. Reine Logik liegt in assets/js/editor.js.
 * exposing: window.EditorUI
 */
(function (global) {
  'use strict';

  /* app.js exponiert seine Toast-Funktion nicht nach window, der Adapter darf sich
   * nicht darauf verlassen — daher eine eigene, minimale Rückmeldung. */
  function feedback(message) {
    if (typeof global.toast === 'function') {
      global.toast(message);
      return;
    }
    let el = document.getElementById('osToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'osToast';
      el.className = 'osToast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove('show');
    }, 2200);
  }

  function EditorUI() {
    const area = document.getElementById('edArea');
    const lines = document.getElementById('edLines');
    const langSel = document.getElementById('edLang');
    const stats = document.getElementById('edStats');
    const toolbar = document.querySelector('.edToolbar');
    if (!area || !lines || !toolbar) return;

    const Core = global.EditorCore;
    const SK = 'editor_save';
    const SK_LANG = 'editor_lang';
    const SK_FONT = 'editor_font';
    const history = Core.createHistory('');

    try {
      const sv = localStorage.getItem(SK);
      if (sv) area.value = sv;
    } catch (e) {}
    try {
      const lg = localStorage.getItem(SK_LANG);
      if (lg && langSel) langSel.value = lg;
    } catch (e) {}
    history.reset(area.value);

    /* ---------- Suchen & Ersetzen als Overlay, ohne blockierenden Dialog ---------- */
    let box = document.getElementById('edSearchBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'edSearchBox';
      box.style.cssText =
        'position:absolute;top:8px;right:8px;z-index:30;background:var(--surface);' +
        'border:2px solid var(--line);box-shadow:4px 4px 0 var(--ink);padding:8px;' +
        'display:none;gap:4px;align-items:center;flex-wrap:wrap;max-width:min(360px,90%)';
      box.innerHTML =
        '<input id="edSearchIn" placeholder="Suchen…" style="flex:1;min-width:120px">' +
        '<span id="edSearchCount" style="font-size:10px;color:var(--muted)"></span>' +
        '<button class="cBtn" id="edSearchPrev" title="Vorheriger Treffer">↑</button>' +
        '<button class="cBtn" id="edSearchNext" title="Nächster Treffer">↓</button>' +
        '<input id="edReplaceIn" placeholder="Ersetzen mit…" style="flex:1;min-width:120px">' +
        '<button class="cBtn op" id="edReplaceOne">Ersetzen</button>' +
        '<button class="cBtn op" id="edReplaceAll">Alle</button>' +
        '<button class="cBtn" id="edSearchClose" title="Schließen">✕</button>';
      (area.parentElement || area).appendChild(box);
    }
    const searchIn = box.querySelector('#edSearchIn');
    const replaceIn = box.querySelector('#edReplaceIn');
    const countEl = box.querySelector('#edSearchCount');
    let from = 0;

    function openSearch() {
      box.style.display = 'flex';
      searchIn.focus();
      searchIn.select();
    }
    function closeSearch() {
      box.style.display = 'none';
      area.focus();
    }
    function jumpTo(hit) {
      if (!hit) {
        countEl.textContent = 'nicht gefunden';
        return false;
      }
      area.focus();
      area.setSelectionRange(hit.start, hit.end);
      from = hit.end;
      lines.scrollTop = area.scrollTop;
      return true;
    }
    function stepSearch(direction) {
      const term = searchIn.value;
      if (!term) return;
      const hits = Core.findAll(area.value, term);
      countEl.textContent = hits.length + ' Treffer';
      if (!hits.length) return;
      if (direction > 0) {
        if (from > area.value.length) from = 0;
        jumpTo(Core.findNext(area.value, term, from));
      } else {
        const current = hits.findIndex(function (h) {
          return h.end > area.selectionStart;
        });
        const idx = current <= 0 ? hits.length - 1 : current - 1;
        jumpTo(hits[idx]);
      }
    }
    function replaceCurrent() {
      const term = searchIn.value;
      if (!term || area.selectionStart === area.selectionEnd) return;
      if (area.value.substring(area.selectionStart, area.selectionEnd) !== term) return;
      const next =
        area.value.substring(0, area.selectionStart) +
        replaceIn.value +
        area.value.substring(area.selectionEnd);
      area.value = next;
      history.push(next);
      updateLines();
      stepSearch(1);
    }
    function replaceAllHits() {
      const term = searchIn.value;
      if (!term) return;
      const result = Core.replaceAll(area.value, term, replaceIn.value);
      if (result.count) {
        area.value = result.text;
        history.push(result.text);
        updateLines();
      }
      from = 0;
      countEl.textContent = result.count + ' ersetzt';
    }

    searchIn.addEventListener('input', function () {
      from = 0;
      stepSearch(1);
    });
    searchIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        stepSearch(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      }
    });
    replaceIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        replaceCurrent();
      }
    });
    box.querySelector('#edSearchNext').addEventListener('click', function () {
      stepSearch(1);
    });
    box.querySelector('#edSearchPrev').addEventListener('click', function () {
      stepSearch(-1);
    });
    box.querySelector('#edReplaceOne').addEventListener('click', replaceCurrent);
    box.querySelector('#edReplaceAll').addEventListener('click', replaceAllHits);
    box.querySelector('#edSearchClose').addEventListener('click', closeSearch);

    /* ---------- Zeilen, Stats, Persistenz ---------- */
    function updateLines() {
      lines.innerHTML = '';
      const numbers = Core.lineNumbers(area.value);
      for (const n of numbers) {
        const row = document.createElement('div');
        row.className = 'edLine';
        row.textContent = n;
        lines.appendChild(row);
      }
      const s = Core.countStats(area.value);
      stats.textContent =
        s.lineCount + ' Zeilen · ' + s.words + ' Wörter · ' + s.chars + ' Zeichen';
      try {
        localStorage.setItem(SK, area.value);
      } catch (e) {}
    }

    /* ---------- Toolbar ---------- */
    const edNewBtn = toolbar.querySelector('#edNew');
    const edOpenBtn = toolbar.querySelector('#edOpen');
    const edSaveBtn = toolbar.querySelector('#edSave');
    const edFindBtn = toolbar.querySelector('#edFind') || (function () {
      const b = document.createElement('button');
      b.className = 'cBtn';
      b.id = 'edFind';
      b.textContent = 'Suchen';
      toolbar.appendChild(b);
      return b;
    })();

    edNewBtn.addEventListener('click', function () {
      if (area.value && !confirm('Inhalt verwerfen?')) return;
      area.value = '';
      history.reset('');
      updateLines();
      feedback('Neuer Editor');
    });

    edOpenBtn.addEventListener('click', function () {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.txt,.js,.html,.css,.md,.json,.py,.sh,.xml,.csv';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.addEventListener('change', function () {
        const file = inp.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          area.value = ev.target.result;
          history.reset(area.value);
          updateLines();
          feedback('Geladen: ' + file.name);
        };
        reader.readAsText(file);
        inp.remove();
      });
      inp.click();
    });

    edSaveBtn.addEventListener('click', function () {
      const name = Core.fileNameFor(langSel ? langSel.value : 'txt', 'document');
      const blob = new Blob([area.value], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      feedback('Gespeichert als ' + name);
    });

    edFindBtn.addEventListener('click', openSearch);

    /* Font size: der change-Handler muss außerhalb des
       create-if-missing-Zweigs registriert werden, sonst fehlt er
       beim zweiten Öffnen des Fensters. */
    let edFontBtn = toolbar.querySelector('#edFont');
    if (!edFontBtn) {
      edFontBtn = document.createElement('select');
      edFontBtn.id = 'edFont';
      edFontBtn.className = 'cBtn';
      edFontBtn.innerHTML =
        '<option value="12">12px</option><option value="14" selected>14px</option>' +
        '<option value="16">16px</option><option value="18">18px</option>' +
        '<option value="20">20px</option>';
      toolbar.appendChild(edFontBtn);
    }
    try {
      const saved = localStorage.getItem(SK_FONT);
      if (saved) edFontBtn.value = saved;
    } catch (e) {}
    area.style.fontSize = edFontBtn.value + 'px';
    edFontBtn.addEventListener('change', function () {
      area.style.fontSize = this.value + 'px';
      try {
        localStorage.setItem(SK_FONT, this.value);
      } catch (e) {}
    });

    /* ---------- Eingaben und Tastatur ---------- */
    area.addEventListener('input', function () {
      history.push(area.value);
      updateLines();
    });
    area.addEventListener('scroll', function () {
      lines.scrollTop = area.scrollTop;
    });
    area.addEventListener('keydown', function (e) {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Tab') {
        e.preventDefault();
        const r = Core.applyIndent(area.value, area.selectionStart, area.selectionEnd, e.shiftKey);
        area.value = r.value;
        area.setSelectionRange(r.start, r.end);
        history.push(r.value);
        updateLines();
        return;
      }
      if (mod && (e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        const value = e.key === 'y' || e.shiftKey ? history.redo() : history.undo();
        if (value === null) return;
        area.value = value;
        updateLines();
        feedback(e.key === 'y' || e.shiftKey ? 'Wiederhergestellt' : 'Rückgängig');
        return;
      }
      if (mod && e.key === 's') {
        e.preventDefault();
        edSaveBtn.click();
        return;
      }
      if (mod && e.key === 'f') {
        e.preventDefault();
        openSearch();
        return;
      }
      if (e.key === 'Escape' && box.style.display === 'flex') {
        e.preventDefault();
        closeSearch();
      }
    });

    if (langSel)
      langSel.addEventListener('change', function () {
        try {
          localStorage.setItem(SK_LANG, this.value);
        } catch (e) {}
      });

    updateLines();
  }

  global.EditorUI = EditorUI;
})(window);
