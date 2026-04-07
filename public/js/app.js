/* ═══════════════════════════════════════════════════
   app.js — Main orchestrator
   ═══════════════════════════════════════════════════ */

let userLat = null;
let userLng = null;
let etaTimer = null;
let allCards = [];

function AppSetCenter(lat, lng) {
  userLat = lat;
  userLng = lng;
  AppRender();
}

function AppRefresh() {
  if (allCards.length > 0) {
    // Re-sort and re-render existing cards (preserve ETA data)
    allCards.sort((a, b) => {
      if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.route.localeCompare(b.route, 'en', { numeric: true });
    });
    uiRenderCards(allCards);
  } else {
    AppRender();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  uiCacheDOM();
  uiLoadTheme();
  uiApplyLang();
  Stars.load();

  document.getElementById('btnLang').addEventListener('click', uiToggleLang);
  document.getElementById('btnMap').addEventListener('click', uiToggleMap);
  document.getElementById('btnTheme').addEventListener('click', uiToggleTheme);
  uiInitScrollHide();

  try {
    await db.open();
  } catch (err) {
    uiShowError(t('dbError') + ': ' + err.message);
    return;
  }

  try {
    const sync = await dbEnsureData();
    uiUpdateTimestamp(sync.ts);
  } catch (err) {
    uiShowError(t('syncError') + ': ' + err.message);
    return;
  }

  try {
    uiShowLoading(t('loadingPos'));
    const pos = await geoGetPosition();
    userLat = pos.lat;
    userLng = pos.lng;
  } catch (err) {
    uiShowError(t('posError') + ': ' + err.message);
    return;
  }

  try {
    mapInit(userLat, userLng);
    await AppRender();
    etaTimer = setInterval(() => AppRefreshETAs(), CONFIG.ETA_REFRESH_MS);
  } catch (err) {
    uiShowError(t('renderError') + ': ' + err.message);
  }
});

/**
 * Full render: query stops, fetch ETAs (10 nearest + starred), build cards.
 */
async function AppRender() {
  uiShowLoading(t('querying'));

  try {
    const nearby = await dbQueryBBox(userLat, userLng, CONFIG.NEARBY_RADIUS);

    if (nearby.length === 0) {
      $cardContainer.innerHTML = `<div class="loading-msg">${t('noStopsNearby')}</div>`;
      uiHideLoading();
      return;
    }

    geoEnrichAndSort(nearby, userLat, userLng);

    // Group routes per stop to count toward the 10-route limit
    const stopRouteCounts = [];
    let totalRoutes = 0;
    for (const s of nearby) {
      const routes = etaGroupByRoute([], s.op); // just to get structure
      // We don't know actual route count until we fetch, so use a placeholder
      // The actual limiting happens after grouping
      stopRouteCounts.push({ stop: s, estimated: 10 });
    }

    // Fetch ETAs for all nearby stops (we'll limit after grouping)
    const allETAs = await etaFetchAll(nearby);

    // Build route list: group by stop, sort alphabetically, apply 10-route cap
    allCards = [];
    let routeCount = 0;

    for (const stop of nearby) {
      const rawETAs = allETAs[stop.id] || [];
      const routes = etaGroupByRoute(rawETAs, stop.op);
      routes.sort((a, b) => a.route.localeCompare(b.route, 'en', { numeric: true }));

      for (const route of routes) {
        const starred = Stars.has(stop.id, route.route);
        const withinLimit = routeCount < CONFIG.MAX_ETA_ROUTES;

        allCards.push({
          route:       route.route,
          dest:        route.dest,
          op:          route.op.toLowerCase(),
          etas:        (withinLimit || starred) ? route.etas : [],
          stopId:      stop.id,
          stopNameTc:  stop.tc,
          stopNameEn:  stop.en,
          dist:        stop._dist,
          isStarred:   starred,
          isTooFar:    stop._dist > CONFIG.NEARBY_RADIUS,
        });

        if (!starred) routeCount++;
      }
    }

    // Sort: starred first, then by distance, then by route
    allCards.sort((a, b) => {
      if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.route.localeCompare(b.route, 'en', { numeric: true });
    });

    uiRenderCards(allCards);
    uiUpdateSectionLabel(nearby.length, allCards.length);
    uiHideLoading();

  } catch (err) {
    uiShowError(err.message || '查詢失敗');
  }
}

/**
 * Refresh: only fetch ETAs for starred routes, update their DOM elements.
 * Non-starred routes retain stale ETA data.
 */
async function AppRefreshETAs() {
  const starredCards = allCards.filter(c => c.isStarred);
  if (starredCards.length === 0) return;

  // Get unique stop IDs that serve starred routes
  const stopIds = new Set(starredCards.map(c => c.stopId));
  const newETAs = await etaFetchForStops(stopIds);

  // Update card data and DOM for starred routes only
  for (const card of starredCards) {
    const rawETAs = newETAs[card.stopId] || [];
    const grouped = etaGroupByRoute(rawETAs, card.op);
    const routeData = grouped.find(r => r.route === card.route);
    if (routeData) {
      card.etas = routeData.etas;
    }

    // Update DOM element
    const el = $cardContainer.querySelector(
      `.eta-card[data-stop-id="${card.stopId}"][data-route="${card.route}"] .eta-vals`
    );
    if (el) {
      if (card.etas.length > 0) {
        el.innerHTML = card.etas.slice(0, CONFIG.MAX_ETA_TIMES).map((m, i) => {
          const cls = m <= 2 ? 'hot' : m <= 8 ? 'warm' : 'cool';
          const sep = i > 0 ? '<span class="sep">·</span>' : '';
          return `${sep}<span class="eta-chip ${cls}">${m}${t('minutes')}</span>`;
        }).join('');
      } else {
        el.innerHTML = `<span class="eta-chip na">${t('noETA')}</span>`;
      }
    }
  }
}
