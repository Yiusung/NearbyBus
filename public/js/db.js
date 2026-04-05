/* ═══════════════════════════════════════════════════
   db.js — IndexedDB via Dexie
   Responsibilities:
     - Schema definition
     - Data freshness check
     - Full download + bulkAdd sync
     - Timestamp tracking
   ═══════════════════════════════════════════════════ */

const db = new Dexie('HKBusDB');

db.version(1).stores({
  stops: 'id, en, tc, op, lat, lng',
  meta:  'key',
});

/**
 * Check if local data is fresh enough to skip download.
 * Returns { fresh: boolean, ts: number|null, count: number }
 */
async function dbCheckFreshness() {
  const count = await db.stops.count();
  let ts = null;
  try {
    const row = await db.meta.get('lastSync');
    ts = row ? row.ts : null;
  } catch { /* meta table might not exist yet */ }
  const age = ts ? Date.now() - ts : Infinity;
  return {
    fresh: count > 0 && age < CONFIG.DATA_MAX_AGE_MS,
    ts,
    count,
  };
}

/**
 * Download stops.json and replace local data atomically.
 * Returns number of stops loaded.
 * Throws on network error if no cached data exists.
 */
async function dbSyncStops() {
  const resp = await fetch(CONFIG.STOPS_URL);
  if (!resp.ok) throw new Error('stops download failed: ' + resp.status);

  const { schema, data, generated_at } = await resp.json();

  const stops = data.map(row => {
    const obj = {};
    schema.forEach((key, i) => obj[key] = row[i]);
    return obj;
  });

  await db.transaction('rw', db.stops, db.meta, async () => {
    await db.stops.clear();
    await db.stops.bulkAdd(stops);
    await db.meta.put({
      key: 'lastSync',
      ts: Date.now(),
      generated_at,
    });
  });

  return stops.length;
}

/**
 * Full ensure: sync if stale, return { count, ts, generated_at }.
 */
async function dbEnsureData() {
  const { fresh, ts, count } = await dbCheckFreshness();

  if (fresh) {
    return { count, ts, synced: false };
  }

  try {
    const n = await dbSyncStops();
    const meta = await db.meta.get('lastSync');
    return { count: n, ts: meta.ts, generated_at: meta.generated_at, synced: true };
  } catch (err) {
    if (count === 0) throw err; // No cached data at all — fatal
    console.warn('[DB] Sync failed, using cached:', err.message);
    return { count, ts, synced: false, error: err.message };
  }
}

/**
 * Query stops within a bounding box.
 * Uses Dexie's indexed range query for speed.
 */
async function dbQueryBBox(lat, lng, radiusMeters) {
  const dLat = radiusMeters * CONFIG.LAT_PER_METER;
  const dLng = radiusMeters * CONFIG.LNG_PER_METER;

  return db.stops
    .where('lat').between(lat - dLat, lat + dLat)
    .and(s => s.lng >= lng - dLng && s.lng <= lng + dLng)
    .toArray();
}
