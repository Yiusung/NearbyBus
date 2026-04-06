/* ═══════════════════════════════════════════════════
   app.js — Main orchestrator
   ═══════════════════════════════════════════════════ */

let userLat = null;
let userLng = null;
let etaTimer = null;

function AppSetCenter(lat, lng) {
  userLat = lat;
  userLng = lng;
  AppRefresh();
}

function AppRefresh() {
  AppRender();
}

document.addEventListener('DOMContentLoaded', async () => {
  uiCacheDOM();
  uiLoadTheme();
  Stars.load();

  document.getElementById('btnMap').addEventListener('click', uiToggleMap);
  document.getElementById('btnTheme').addEventListener('click', uiToggleTheme);
  uiInitScrollHide();

  try {
    await db.open();
  } catch (err) {
    uiShowError('資料庫開啟失敗: ' + err.message);
    return;
  }

  try {
    const sync = await dbEnsureData();
    uiUpdateTimestamp(sync.ts);
  } catch (err) {
    uiShowError('無法載入巴士站資料: ' + err.message);
    return;
  }

  try {
    uiShowLoading('正在取得位置...');
    const pos = await geoGetPosition();
    userLat = pos.lat;
    userLng = pos.lng;
  } catch (err) {
    uiShowError('定位失敗: ' + err.message);
    return;
  }

  try {
    mapInit(userLat, userLng);
    await AppRender();
    etaTimer = setInterval(() => AppRender(), CONFIG.ETA_REFRESH_MS);
  } catch (err) {
    uiShowError('渲染失敗: ' + err.message);
  }
});

async function AppRender() {
  uiShowLoading('正在查詢附近巴士站...');

  try {
    // 1. Query nearby stops
    const nearby = await dbQueryBBox(userLat, userLng, CONFIG.NEARBY_RADIUS);

    if (nearby.length === 0) {
      $cardContainer.innerHTML = '<div class="loading-msg">150m 內沒有巴士站</div>';
      uiHideLoading();
      return;
    }

    // 2. Add distance and sort nearest-first
    geoEnrichAndSort(nearby, userLat, userLng);

    // 3. Fetch ETAs for all stops in parallel
    const allETAs = await etaFetchAll(nearby);

    // 4. Build one card per route
    const cards = [];

    for (const stop of nearby) {
      const rawETAs = allETAs[stop.id] || [];
      const routes = etaGroupByRoute(rawETAs, stop.op);

      // Sort routes alphabetically by route number
      routes.sort((a, b) => a.route.localeCompare(b.route, 'en', { numeric: true }));

      for (const route of routes) {
        cards.push({
          route:     route.route,
          dest:      route.dest,
          op:        route.op,
          etas:      route.etas,
          stopId:    stop.id,
          stopNameTc: stop.tc,
          stopNameEn: stop.en,
          dist:      stop._dist,
          isStarred: Stars.has(stop.id),
          isTooFar:  stop._dist > CONFIG.NEARBY_RADIUS,
        });
      }
    }

    // 5. Sort: starred stops first, then by distance, then by route
    cards.sort((a, b) => {
      if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.route.localeCompare(b.route, 'en', { numeric: true });
    });

    // 6. Render
    uiRenderCards(cards);
    uiUpdateSectionLabel(nearby.length, cards.length);
    uiHideLoading();

  } catch (err) {
    uiShowError(err.message || '查詢失敗');
  }
}
