/* ═══════════════════════════════════════════════════
   geo.js — Geolocation + distance math
   Responsibilities:
     - Get user's position
     - Haversine distance calculation
     - Enrich stops with distance + sort
   ═══════════════════════════════════════════════════ */

/**
 * Get user's current position. Returns { lat, lng }.
 * Rejects with a descriptive error if geolocation fails.
 */
function geoGetPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('此瀏覽器不支援定位功能'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(new Error('無法取得位置: ' + err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Haversine distance between two points in meters.
 */
function geoHaversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Given an array of stops and user position, add _dist and sort nearest-first.
 * Modifies the array in place for efficiency.
 */
function geoEnrichAndSort(stops, userLat, userLng) {
  for (const s of stops) {
    s._dist = geoHaversine(userLat, userLng, s.lat, s.lng);
  }
  stops.sort((a, b) => a._dist - b._dist);
  return stops;
}

/**
 * Format a distance value for display.
 */
function geoFormatDistance(meters) {
  return meters < 1000
    ? `${Math.round(meters)}m`
    : `${(meters / 1000).toFixed(1)}km`;
}
