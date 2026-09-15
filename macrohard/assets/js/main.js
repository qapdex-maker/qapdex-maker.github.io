/**
 * Main App Module - bindet alle Sub-Module zusammen
 * @module main
 */

import { storeSet, storeGet, storeDel } from './storage.js';
import { I18N, setLang, t, currentLang } from './i18n.js';
import { openApp, snapWindow, focused, zIdx, bootDone, updateFocus, updateTaskbarFocus, saveSession, restoreSession, setWallpaper, SESSION_KEY } from './window-manager.js';

// Globale Varien aus window-manager.js re-exportieren
export { focused, zIdx, bootDone, openApp, snapWindow, updateFocus, updateTaskbarFocus, saveSession, restoreSession, setWallpaper };

// Globale API für onclick-Handler in HTML
window.osIntervals = window.osIntervals || {};
window.osTimeouts = window.osTimeouts || {};
window.storeSet = storeSet;
window.storeGet = storeGet;
window.storeDel = storeDel;
window.t = t;
window.setLang = setLang;
window.openApp = openApp;
window.snapWindow = snapWindow;
window.updateFocus = updateFocus;
window.updateTaskbarFocus = updateTaskbarFocus;
window.saveSession = saveSession;
window.restoreSession = restoreSession;
window.setWallpaper = setWallpaper;

// Boot-Sequence
window.startOS = function () {
  const boot = document.getElementById('boot');
  if (boot) boot.classList.add('hide');
  setTimeout(() => {
    const lock = document.getElementById('lock');
    if (lock) lock.classList.remove('hide');
  }, 600);
  setTimeout(() => {
    const lock = document.getElementById('lock');
    if (lock) lock.classList.add('hide');
    bootDone = true;
  }, 4200);
};

// Desktop-Apps-Liste (bleibt in main.js wegen Abhängigkeiten)
export const desktopApps = [
  { id: 'notepad', label: 'Notepad', icon: 'notepad' },
  { id: 'calculator', label: 'Calculator', icon: 'calc' },
  { id: 'terminal', label: 'Terminal', icon: 'term' },
  { id: 'explorer', label: 'Explorer', icon: 'explorer' },
  { id: 'paint', label: 'Paint', icon: 'paint' },
  { id: 'browser', label: 'Browser', icon: 'browser' },
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'docs', label: 'Docs', icon: 'docs' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'links', label: 'Links', icon: 'links' },
  { id: 'amibios', label: 'AMIBIOS', icon: 'amibios' },
  { id: 'taskmgr', label: 'Taskmgr', icon: 'tm' },
  { id: 'sysinfo', label: 'Sysinfo', icon: 'si' },
  { id: 'calendar', label: 'Kalender', icon: 'cal' },
  { id: 'clock', label: 'Uhr', icon: 'clock' },
  { id: 'colorpicker', label: 'Farbwähler', icon: 'cp' },
  { id: 'pwgen', label: 'Passwort', icon: 'pw' },
  { id: 'qrgen', label: 'QR-Code', icon: 'qr' },
  { id: 'viewer', label: 'Viewer', icon: 'vw' },
  { id: 'game', label: 'TicTacToe', icon: 'game' },
];

// SVG-Icons (aus app.js extrahiert)
export function svgIcon(name) {
  const s = {
    notepad: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    calc: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>',
    term: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    explorer: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    paint: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    browser: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21" y1="12" x2="16" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="12" y1="21" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="3"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    docs: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    links: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    amibios: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    tm: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    si: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    cp: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="12.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/></svg>',
    pw: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="21" x2="21" y2="21"/></svg>',
    vw: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    game: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15" y2="13"/><line x1="18" y1="11" x2="18" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>',
  };
  return s[name] || '';
}

// Icon-SVG für Desktop-Icons generieren
export function makeIcon(a) {
  const div = document.createElement('div');
  div.className = 'dskApp';
  div.setAttribute('data-app', a.id);
  div.innerHTML = '<span class="ico">' + svgIcon(a.icon) + '</span><span class="lbl">' + a.label + '</span>';
  div.addEventListener('click', function (e) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      this.classList.toggle('selected');
      e.stopPropagation();
      return;
    }
    document.querySelectorAll('.dskApp.selected').forEach(function (x) { x.classList.remove('selected'); });
    this.classList.add('selected');
    openApp(a.id);
  });
  return div;
}

// Toast-Notifications
export function toast(msg) {
  const t = document.getElementById('osToast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
    return;
  }
  const el = document.createElement('div');
  el.id = 'osToast';
  el.className = 'osToast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () { el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.remove(); }, 400); }, 2200);
}

// Notifikationen
export function showNotif(title, body, icon) {
  const n = document.createElement('div');
  n.className = 'osNotif';
  n.innerHTML = '<span class="notifIcon">' + (icon || '🔔') + '</span><div class="notifBody"><b>' + title + '</b><span>' + body + '</span></div><button class="notifClose">×</button>';
  document.body.appendChild(n);
  n.querySelector('.notifClose').addEventListener('click', function () { n.remove(); });
  setTimeout(function () { n.classList.add('show'); }, 10);
  setTimeout(function () { n.classList.remove('show'); setTimeout(function () { n.remove(); }, 300); }, 4000);
}

// Globale API
window.toast = toast;
window.showNotif = showNotif;
window.makeIcon = makeIcon;
window.svgIcon = svgIcon;
window.desktopApps = desktopApps;
