// Web Worker: parses the metadata index OFF the main thread.
// This is the fix for the old RapiDoc freeze — no 8-41MB parse on the UI thread.
// Supports three call shapes:
//   { type: 'reference', variant, file } -> endpoint list (path/method/summary)
//   { type: 'console',  file }           -> same list PLUS opId (Console uses operationId)
//   { type: 'csdl', file }               -> type COUNTS + entity-set join for one sketch (XML)
//   { type: 'segments', file }           -> the set of last path segments in an index JSON
//
// The last one exists because the sketch panel and the reference list are
// separate React trees: the panel cannot see Reference's parsed `items`. Rather
// than lifting state to App (which would rebuild the whole tab switch on every
// keystroke in the reference search), the panel asks the worker for the segment
// set. One extra parse of an index JSON, off the main thread, and the two
// panels stay independent.
//
// The CSDL branch exists because the cloud sketches are XML, 5-8 MB each, 17
// of them. The JSON branch below cannot read them, and parsing them on the UI
// thread would be the same freeze the worker was built to avoid.
//
// NO DOMParser. It is not available in a Web Worker — measured in Chromium on
// 2026-09-27 with a throwaway worker: typeof DOMParser === 'undefined', same
// for XMLDocument. An earlier version of this file used DOMParser and every
// count failed with "DOMParser is not defined"; the failure only showed up on
// click, so no test that did not run a real worker could have caught it.
//
// Instead: count the element-type tags directly. This is safe here for a
// specific reason — a CSDL document only ever uses these tags as ELEMENT
// names, never inside text content, and the file comes from our own metadata
// repo. The counts are not parsed into a tree, so nesting and self-closing
// tags cannot confuse them: a regex on the open tag counts declarations
// wherever they sit.
const countSketch = async (file) => {
  const res = await fetch(file);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const xml = await res.text();
  if (!/<\?xml|<edmx:Edmx|<Edmx/.test(xml)) {
    throw new Error('kein CSDL (kein XML-Header)');
  }
  // Only opening tags, and only when they start an element declaration, so a
  // closing tag or a self-closing one is never counted.
  //
  // The backslash must survive exactly one escaping layer. Getting this wrong
  // is silent: the pattern then matches a LITERAL backslash-s and finds
  // nothing, so every count came back as 0 while the file plainly contained
  // 36 EntityType declarations. This cost a round trip — so the line below
  // uses a character class instead of an escape:
  //
  //     new RegExp('<' + tag + '[\\s>]', 'g')
  //
  // A character class needs the same single backslash, but the intent is
  // visible: whitespace or the closing angle bracket. Asserted in
  // tests/sketch-panel.test.mjs against the real documents.
  const open = (tag) => (xml.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
  // The type -> endpoint join, from the same single pass over the document.
  //
  //   <EntitySet Name="accessReviews" EntityType="microsoft.graph.accessReview" />
  //
  // The set NAME is the last segment of the endpoint paths that touch that
  // type, which is what makes the join work without the 40MB openapi.yaml.
  //
  // Both type prefixes occur and only the long one is stripped: EntitySet uses
  // the full "microsoft.graph.x" while Action parameters use the short
  // "graph.x". Comparing either literally would leave every set unresolved.
  const entitySets = {};
  for (const m of xml.matchAll(
    /<EntitySet\s+Name="([^"]+)"\s+EntityType="([A-Za-z0-9_.]+)"/g,
  )) {
    const type = m[2].split('.').pop();
    if (!entitySets[type]) entitySets[type] = [];
    if (entitySets[type].indexOf(m[1]) === -1) entitySets[type].push(m[1]);
  }
  const entitySetCount = Object.keys(entitySets).length;
  const entityTypes = open('EntityType');
  const complexTypes = open('ComplexType');
  const enumTypes = open('EnumType');
  return {
    entityTypes,
    complexTypes,
    enumTypes,
    // A CSDL document is mostly EnumType, so this is the number that actually
    // says something about the size of the file.
    totalTypes: entityTypes + complexTypes + enumTypes,
    // The join. `entitySets` maps a type name to its set names, e.g.
    // {accessReview: ['accessReviews']}. The caller joins those set names
    // against the endpoint paths it has already parsed — the worker does not
    // hold the index itself, so the caller decides which variant to compare
    // against. entitySetCount is how many types the join can speak about at
    // all; entityTypes is usually much larger.
    entitySets,
    entitySetCount,
  };
};

self.onmessage = async (e) => {
  const { type, variant, file } = e.data;
  if (type === 'csdl') {
    try {
      const counts = await countSketch(file);
      self.postMessage({ type, file, ok: true, counts });
    } catch (err) {
      self.postMessage({ type, file, ok: false, error: String(err) });
    }
    return;
  }
  if (type === 'segments') {
    // Just the last path segment of every endpoint, as a Set. This is the join
    // key: an EntitySet named "accessReviews" means every path ending in
    // /accessReviews belongs to the accessReview type.
    try {
      const res = await fetch(file);
      const data = await res.json();
      // A MAP of segment -> how many paths end in it, not a Set.
      //
      // A Set answers "does this segment exist", which is the wrong question:
      // accessReview has one EntitySet "accessReviews" but 58 endpoints, so a
      // Set-based join reported 1 endpoint for every type and made the whole
      // column meaningless. Measured: administrativeUnit showed 1 while the
      // index has 2 paths ending in /administrativeUnits.
      const segs = {};
      for (const p of Object.keys(data.paths || {})) {
        const seg = p.replace(/\/$/, '').split('/').pop();
        segs[seg] = (segs[seg] || 0) + 1;
      }
      self.postMessage({ type, file, ok: true, segments: segs });
    } catch (err) {
      self.postMessage({ type, file, ok: false, error: String(err) });
    }
    return;
  }
  try {
    const res = await fetch(file);
    const data = await res.json();
    const flat = [];
    for (const [path, ops] of Object.entries(data.paths || {})) {
      for (const o of ops) {
        flat.push({
          path,
          method: (o.method || 'get').toUpperCase(),
          summary: o.summary || '',
          opId: o.operationId,
        });
      }
    }
    self.postMessage({ type, variant, ok: true, items: flat, count: flat.length });
  } catch (err) {
    self.postMessage({ type, variant, ok: false, error: String(err) });
  }
};
