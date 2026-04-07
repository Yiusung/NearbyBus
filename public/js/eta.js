/* ═══════════════════════════════════════════════════
   eta.js — ETA fetching and data transformation
   ═══════════════════════════════════════════════════ */

async function etaFetchOne(stopId) {
  try {
    const r = await fetch(`${CONFIG.ETA_PROXY}?stop_id=${encodeURIComponent(stopId)}`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch ETAs for stops in the set.
 * If limit is set, only fetch stops whose routes are within the first `limit` routes
 * (stops are already sorted by distance; routes within each stop are sorted alphabetically).
 */
async function etaFetchAll(stops, limit) {
  const results = {};
  let routeCount = 0;
  let stopsToFetch;

  if (limit != null) {
    stopsToFetch = [];
    for (const s of stops) {
      if (routeCount >= limit) break;
      stopsToFetch.push(s);
      // Estimate: assume each stop has ~4 routes (conservative)
      // We fetch the stop and let the grouping decide the actual count
      routeCount += 10; // fetch the stop, filtering happens in app.js
    }
  } else {
    stopsToFetch = stops;
  }

  const settled = await Promise.allSettled(
    stopsToFetch.map(async s => ({ id: s.id, eta: await etaFetchOne(s.id) }))
  );
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      results[r.value.id] = r.value.eta;
    }
  }
  return results;
}

/**
 * Fetch ETAs only for specific stop IDs (used for starred refresh).
 */
async function etaFetchForStops(stopIds) {
  const results = {};
  const settled = await Promise.allSettled(
    [...stopIds].map(async id => ({ id, eta: await etaFetchOne(id) }))
  );
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      results[r.value.id] = r.value.eta;
    }
  }
  return results;
}

function etaGroupByRoute(rawETAs, fallbackOp) {
  const routeMap = {};

  for (const e of rawETAs) {
    const key = e.route;
    if (!routeMap[key]) {
      const rawOp = e.co || fallbackOp || '';
      routeMap[key] = {
        route: key,
        dest: e.dest_tc || e.dest_en || '',
        op: rawOp.toLowerCase(),
        etas: [],
      };
    }
    if (e.eta) {
      const mins = Math.max(0, Math.round((new Date(e.eta) - Date.now()) / 60000));
      routeMap[key].etas.push(mins);
    }
  }

  return Object.values(routeMap).sort((a, b) => {
    const aMin = a.etas.length ? Math.min(...a.etas) : 9999;
    const bMin = b.etas.length ? Math.min(...b.etas) : 9999;
    return aMin - bMin;
  });
}

function etaClass(minutes) {
  if (minutes <= 2) return 'hot';
  if (minutes <= 8) return 'warm';
  return 'cool';
}
