/* Storage facade for the classic app.js runtime. */
(function (global) {
  function storeSet(key, value) {
    try { global.localStorage.setItem(key, value); return true; } catch (error) {}
    try { global.sessionStorage.setItem(key, value); return true; } catch (error) {}
    return false;
  }

  function storeGet(key) {
    try {
      var value = global.localStorage.getItem(key);
      if (value !== null && value !== undefined) return value;
    } catch (error) {}
    try { return global.sessionStorage.getItem(key); } catch (error) {}
    return null;
  }

  function storeDel(key) {
    try { global.localStorage.removeItem(key); } catch (error) {}
    try { global.sessionStorage.removeItem(key); } catch (error) {}
  }

  function storeHas(key) {
    return storeGet(key) !== null;
  }

  global.storeSet = storeSet;
  global.storeGet = storeGet;
  global.storeDel = storeDel;
  global.storeHas = storeHas;
})(window);
