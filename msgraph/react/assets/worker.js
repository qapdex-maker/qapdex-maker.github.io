// Web Worker: parses the metadata index OFF the main thread.
// This is the fix for the old RapiDoc freeze — no 8-41MB parse on the UI thread.
self.onmessage = async (e) => {
  const { variant, file } = e.data;
  try {
    const res = await fetch(file);
    const data = await res.json();
    const flat = [];
    for (const [path, ops] of Object.entries(data.paths || {})) {
      for (const o of ops) {
        flat.push({
          path,
          method: (o.method || 'get').toUpperCase(),
          summary: o.summary || ''
        });
      }
    }
    self.postMessage({ variant, ok: true, items: flat, count: flat.length });
  } catch (err) {
    self.postMessage({ variant, ok: false, error: String(err) });
  }
};
