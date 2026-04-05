/* ═══════════════════════════════════════════════════
   map.js — Leaflet map management
   Responsibilities:
     - Initialize map
     - Place user marker
     - Render stop dots colored by operator
     - Refresh dots on pan/zoom
     - Handle map invalidation on resize
   ═══════════════════════════════════════════════════ */

let mapInstance = null;
let mapMarkers = [];

/**
 * Initialize the Leaflet map centered on the user.
 */
function mapInit(lat, lng) {
  mapInstance = L.map('map', {
    center: [lat, lng],
    zoom: 17,
    zoomControl: true,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(mapInstance);

  // User marker
  L.circleMarker([lat, lng], {
    radius: 7,
    fillColor: '#4285f4',
    fillOpacity: 1,
    color: '#fff',
    weight: 2,
  }).addTo(mapInstance).bindPopup('你的位置');

  // Refresh stops when map moves
  mapInstance.on('moveend', () => mapRefreshStops());
}

/**
 * Clear and re-draw stop markers within the visible area.
 * Reads from IndexedDB directly.
 */
async function mapRefreshStops() {
  if (!mapInstance) return;

  const center = mapInstance.getCenter();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Clear old markers
  for (const m of mapMarkers) mapInstance.removeLayer(m);
  mapMarkers = [];

  // Query stops around map center
  const stops = await dbQueryBBox(center.lat, center.lng, CONFIG.MAP_RADIUS);

  for (const s of stops) {
    const color = isDark
      ? (CONFIG.OP_NEON[s.op] || '#888')
      : (CONFIG.OP_COLOR[s.op] || '#888');
    const isStarred = Stars.has(s.id);

    const marker = L.circleMarker([s.lat, s.lng], {
      radius: isStarred ? 6 : 4,
      fillColor: color,
      fillOpacity: isStarred ? 0.9 : 0.7,
      color: isStarred ? '#fff' : color,
      weight: isStarred ? 2 : 1,
    }).addTo(mapInstance);

    marker.bindTooltip(s.tc, { direction: 'top', offset: [0, -6] });

    marker.on('click', () => {
      // Re-query around tapped stop
      if (typeof AppSetCenter === 'function') {
        AppSetCenter(s.lat, s.lng);
      }
    });

    mapMarkers.push(marker);
  }
}

/**
 * Call after the map container is resized (e.g., toggling visibility).
 */
function mapInvalidateSize() {
  if (mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 350);
  }
}
