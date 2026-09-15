/**
 * Internationalization (i18n) - DE/EN strings
 * @module i18n
 */

export const I18N = {
  de: {
    desktop: 'Desktop', clock: '',
    notepad: 'Notepad', calculator: 'Calculator', terminal: 'Terminal',
    explorer: 'Explorer', paint: 'Paint', browser: 'Browser',
    music: 'Music', chat: 'Chat', docs: 'Docs', settings: 'Settings', links: 'Links',
    start: 'Start', search: 'Suche...',
    noproc: 'Kein Prozess',
    welcome: 'Willkommen bei MakerOS',
    cancel: 'canceled',
    ready: 'bereit',
    files: 'Dateien', folders: 'Ordner',
    canvas: 'Leinwand', colors: 'Farben',
    links: 'Links', perchance: 'Perchance', settings: 'Settings',
    gsEmptyMin: 'Mindestens 2 Zeichen',
    gsEmptyNoResult: 'Keine Treffer',
    gsEmpty: 'Leer',
    filterNoMatch: 'Keine Treffer',
    unfocused: 'Nicht fokussiert',
    searchPlaceholder: 'Suche...',
    padSection: '🥁 Beatpad',
    eqSection: '🎛 Equalizer',
  },
  en: {
    desktop: 'Desktop', clock: '',
    notepad: 'Notepad', calculator: 'Calculator', terminal: 'Terminal',
    explorer: 'Explorer', paint: 'Paint', browser: 'Browser',
    music: 'Music', chat: 'Chat', docs: 'Docs', settings: 'Settings', links: 'Links',
    start: 'Start', search: 'Search...',
    noproc: 'No process',
    welcome: 'Welcome to MakerOS',
    cancel: 'canceled',
    ready: 'ready',
    files: 'Files', folders: 'Folders',
    canvas: 'Canvas', colors: 'Colors',
    links: 'Links', perchance: 'Perchance', settings: 'Settings',
    gsEmptyMin: 'At least 2 characters',
    gsEmptyNoResult: 'No results',
    gsEmpty: 'Empty',
    filterNoMatch: 'No matches',
    unfocused: 'Not focused',
    searchPlaceholder: 'Search...',
    padSection: '🥁 Beatpad',
    eqSection: '🎛 Equalizer',
  },
};

export let currentLang = 'de';

export function setLang(lang) {
  currentLang = lang;
}

export function t(key) {
  return I18N[currentLang] ? I18N[currentLang][key] || key : key;
}
