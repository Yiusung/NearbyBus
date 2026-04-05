/* ═══════════════════════════════════════════════════
   app.js — Main orchestrator
   Responsibilities:
     - Bootstrap sequence
     - Coordinate all modules
     - Expose global callbacks for cross-module calls
     - Polling timer
   ═══════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────
let userLat = null;
let userLng = null;
let etaTimer = null;

// ── Global callbacks (cross-module glue) ──────────

/** Called by map.js when user taps a stop marker. */
function AppSetCenter(lat, lng) {
  userLat = lat;
  userLng = lng;
  AppRefresh();
}

/** Called by stars.js after toggle. */
function AppRefresh() {
  AppRender();
}

// ── Bootstrap ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  uiCacheDOM();
  uiLoadTheme();
  Stars.load();

  // Wire up buttons
  document.getElementById('btnMap').addEventListener('click', uiToggleMap);
  document.getElementById('btnTheme').addEventListener('click', uiToggleTheme);
  uiInitScrollHide();

  try {
    await db.open();

    // Sync stops data
    const sync = await dbEnsureData();
    uiUpdateTimestamp(sync.ts);

    if (sync.synced) {
      console.log(`[App] Synced ${sync.count} stops (${sync.generated_at})`);
    }

    // Get location
    uiShowLoading('正在取得位置...');
    const pos = await geoGetPosition();
    userLat = pos.lat;
    userLng = pos.lng;

    // Init map
    mapInit(userLat, userLng);

    // First render
    await AppRender();

    // Start polling
    etaTimer = setInterval(() => AppRender(), CONFIG.ETA_REFRESH_MS);

  } catch (err) {
    uiShowError(err.message || '初始化失敗');
  }
});

// ── Core Render Cycle ─────────────────────────────
async function AppRender() {
  uiShowLoading('正在查詢附近巴士站...');

  try {
    // 1. Query nearby stops from IndexedDB
    const nearby = await dbQueryBBox(userLat, userLng, CONFIG.NEARBY_RADIUS);

    if (nearby.length === 0) {
      $cardContainer.innerHTML = '<div class="loading-msg">150m 內沒有巴士站</div>';
      uiHideLoading();
      return;
    }

    // 2. Add distance and sort
    geoEnrichAndSort(nearby, userLat, userLng);

    // 3. Fetch ETAs in parallel
    const allETAs = await etaFetchAll(nearby);

    // 4. Build card data
    const cards = nearby.map(s => {
      const routes = etaGroupByRoute(allETAs[s.id] || [], s.op);
      return {
        stopId:   s.id,
        nameTc:   s.tc,
        nameEn:   s.en,
        op:       s.op,
        dist:     s._dist,
        routes,
        isStarred: Stars.has(s.id),
        isTooFar:  s._dist > CONFIG.NEARBY_RADIUS,
      };
    });

    // 5. Sort: starred first, then by distance
    cards.sort((a, b) => {
      if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
      return a.dist - b.dist;
    });

    // 6. Render
    uiRenderCards(cards);
    uiUpdateSectionLabel(nearby.length);
    uiHideLoading();

  } catch (err) {
    uiShowError(err.message || '查詢失敗');
  }
}
