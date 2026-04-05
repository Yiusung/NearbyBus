/* ═══════════════════════════════════════════════════
   config.js — All tunable constants in one place
   ═══════════════════════════════════════════════════ */

const CONFIG = {
  // ── API Endpoints ─────────────────────────────
  STOPS_URL:       '/api/stops.json',
  ETA_PROXY:       '/api/eta',

  // ── Geo ──────────────────────────────────────
  NEARBY_RADIUS:   200,              // meters — ETA cards
  MAP_RADIUS:      500,              // meters — map dots

  // At HK latitude (~22.3°N):
  //   1° lat ≈ 110,574 m
  //   1° lng ≈ 102,470 m
  LAT_PER_METER:   1 / 110574,
  LNG_PER_METER:   1 / 102470,

  // ── ETA ──────────────────────────────────────
  MAX_ETA_ROUTES:  6,                // routes with full ETA display
  MAX_ETA_TIMES:   3,                // upcoming buses shown per route
  ETA_REFRESH_MS:  60000,

  // ── Data Sync ────────────────────────────────
  DATA_MAX_AGE_MS: 30 * 24 * 3600 * 1000,  // 7 days

  // ── Stars ────────────────────────────────────
  MAX_STARRED:     5,

  // ── Operator Labels ──────────────────────────
  OP_LABEL: {
    kmb: '九巴',
    ctb: '城巴',
    nlb: '嶼巴',
  },

  // ── Operator Colors (light theme) ────────────
  OP_COLOR: {
    kmb: '#cc2233',
    ctb: '#d4880a',
    nlb: '#1a6b3c',
  },

  // ── Operator Colors (dark/neon theme) ────────
  OP_NEON: {
    kmb: '#ff2d78',
    ctb: '#ff8c2a',
    nlb: '#39ff8e',
  },
};
