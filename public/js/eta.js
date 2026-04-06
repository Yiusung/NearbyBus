/* ═══════════════════════════════════════════════════
   eta.js — ETA fetching and data transformation
   Responsibilities:
     - Fetch ETA for a single stop
     - Batch-fetch ETAs for multiple stops
     - Group ETAs by route
     - Calculate minutes until arrival
   ═══════════════════════════════════════════════════ */

/**
 * Fetch ETA for one stop from the proxy.
 * Returns the raw ETA array from the API.
 */
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
 * Fetch ETAs for multiple stops in parallel.
 * Returns { [stopId]: rawEtaArray }
 */
async function etaFetchAll(stops) {
  const results = {};
  const settled = await Promise.allSettled(
    stops.map(async s => ({ id: s.id, eta: await etaFetchOne(s.id) }))
  );
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      results[r.value.id] = r.value.eta;
    }
  }
  return results;
}

/**
 * Parse a raw ETA array into grouped route data.
 * Returns an array of:
 *   { route, dest, op, etas: [minutes, ...] }
 * sorted by earliest ETA.
 */
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

  // Sort: routes with soonest first arrival at top
  return Object.values(routeMap).sort((a, b) => {
    const aMin = a.etas.length ? Math.min(...a.etas) : 9999;
    const bMin = b.etas.length ? Math.min(...b.etas) : 9999;
    return aMin - bMin;
  });
}

/**
 * Classify an ETA minute value into a CSS class.
 */
function etaClass(minutes) {
  if (minutes <= 2) return 'hot';
  if (minutes <= 8) return 'warm';
  return 'cool';
}
