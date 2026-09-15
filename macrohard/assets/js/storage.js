/**
 * Storage Wrapper - localStorage mit Fallback auf sessionStorage
 * @module storage
 */

export function storeSet(k, v) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch (e) {}
  try {
    sessionStorage.setItem(k, v);
    return true;
  } catch (e) {}
  return false;
}

export function storeGet(k) {
  return localStorage.getItem(k) || sessionStorage.getItem(k);
}

export function storeDel(k) {
  try { localStorage.removeItem(k); } catch (e) {}
  try { sessionStorage.removeItem(k); } catch (e) {}
}

export function storeHas(k) {
  return !!(localStorage.getItem(k) || sessionStorage.getItem(k));
}
