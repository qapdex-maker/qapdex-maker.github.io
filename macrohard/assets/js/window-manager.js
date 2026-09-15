/**
 * Window-Management - openApp, snapWindow, dragStart, etc.
 * @module windowManager
 */

import { storeSet, storeGet } from './storage.js';

export const SESSION_KEY = 'os_session';
export let focused = null;
export let zIdx = 100;
export let bootDone = false;

/**
 * Öffnet eine App im Desktop-Fenster
 * @param {string} id - App-ID (z.B. 'notepad', 'calculator')
 */
export function openApp(id) {
  const w = document.getElementById('w-' + id);
  if (w) {
    w.classList.add('focused');
    w.style.zIndex = ++zIdx;
    focused = id;
    updateFocus();
    return;
  }
  const mk = document.createElement('div');
  mk.className = 'wnd';
  mk.id = 'w-' + id;
  mk.style.left = (80 + (zIdx % 5) * 30) + 'px';
  mk.style.top = (40 + (zIdx % 5) * 20) + 'px';
  mk.style.zIndex = ++zIdx;
  mk.setAttribute('data-app', id);
  // ... rest of openApp logic will be in the main app.js for now
  document.getElementById('desktop').appendChild(mk);
}

/**
 * Snapped ein Fenster an eine Bildschirmkante
 * @param {HTMLElement} w - Fenster-Element
 * @param {string} direction - 'left'|'right'|'max'|'restore'
 */
export function snapWindow(w, direction) {
  const wW = window.innerWidth;
  const wH = window.innerHeight;
  if (direction === 'left') {
    w.style.left = '0';
    w.style.top = '0';
    w.style.width = (wW / 2 - 4) + 'px';
    w.style.height = wH + 'px';
  } else if (direction === 'right') {
    w.style.left = (wW / 2 + 4) + 'px';
    w.style.top = '0';
    w.style.width = (wW / 2 - 4) + 'px';
    w.style.height = wH + 'px';
  } else if (direction === 'max') {
    w.style.left = '0';
    w.style.top = '0';
    w.style.width = '100vw';
    w.style.height = '100vh';
  } else if (direction === 'restore') {
    w.style.left = w.dataset.origLeft || '';
    w.style.top = w.dataset.origTop || '';
    w.style.width = w.dataset.origWidth || '';
    w.style.height = w.dataset.origHeight || '';
  }
  saveSession();
}

export function updateFocus() {
  document.querySelectorAll('.wnd').forEach(function (w) { w.classList.remove('focused'); });
  const f = document.getElementById('w-' + focused);
  if (f) f.classList.add('focused');
}

export function updateTaskbarFocus() {
  document.querySelectorAll('.tbIcon').forEach(function (t) { t.classList.remove('focused'); });
  if (focused) {
    const f = document.getElementById('tb-' + focused);
    if (f) f.classList.add('focused');
  }
}

export function saveSession() {
  const wins = [];
  document.querySelectorAll('.wnd').forEach(function (w) {
    wins.push({
      id: w.getAttribute('data-app'),
      left: w.style.left,
      top: w.style.top,
      width: w.style.width,
      height: w.style.height,
      visible: w.style.display !== 'none',
    });
  });
  storeSet(SESSION_KEY, JSON.stringify(wins));
}

export function restoreSession() {
  try {
    const saved = JSON.parse(storeGet(SESSION_KEY) || '[]');
    if (!saved.length) return;
    saved.forEach(function (s) {
      if (s.visible) {
        openApp(s.id);
        const w = document.getElementById('w-' + s.id);
        if (w && s.left) w.style.left = s.left;
        if (w && s.top) w.style.top = s.top;
        if (w && s.width) w.style.width = s.width;
        if (w && s.height) w.style.height = s.height;
      }
    });
  } catch (e) {}
}

export function setWallpaper(url) {
  const desk = document.getElementById('desktop');
  if (!desk) return;
  desk.style.backgroundImage = 'url(' + url + ')';
  desk.style.backgroundSize = 'cover';
  storeSet('os_wall', url);
}
