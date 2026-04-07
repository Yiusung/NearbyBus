/* ═══════════════════════════════════════════════════
   config.js — All tunable constants + i18n dictionary
   ═══════════════════════════════════════════════════ */

const CONFIG = {
  // ── API Endpoints ─────────────────────────────
  STOPS_URL:       '/api/stops.json',
  ETA_PROXY:       '/api/eta',

  // ── Geo ──────────────────────────────────────
  NEARBY_RADIUS:   150,
  MAP_RADIUS:      500,

  LAT_PER_METER:   1 / 110574,
  LNG_PER_METER:   1 / 102470,

  // ── ETA ──────────────────────────────────────
  MAX_ETA_ROUTES:  10,               // max routes with ETA on initial load
  MAX_ETA_TIMES:   3,                // upcoming buses shown per route
  ETA_REFRESH_MS:  30000,

  // ── Data Sync ────────────────────────────────
  DATA_MAX_AGE_MS: 7 * 24 * 3600 * 1000,

  // ── Stars ────────────────────────────────────
  MAX_STARRED:     5,

  // ── Operator Labels ──────────────────────────
  OP_LABEL: {
    kmb: '九巴',
    ctb: '城巴',
    nlb: '嶼巴',
  },

  OP_COLOR: {
    kmb: '#cc2233',
    ctb: '#d4880a',
    nlb: '#1a6b3c',
  },

  OP_NEON: {
    kmb: '#ff2d78',
    ctb: '#ff8c2a',
    nlb: '#39ff8e',
  },
};

// ── i18n Dictionary ──────────────────────────────
const I18N = {
  tc: {
    appTitle:      '巴士到站',
    nearbyStops:   '附近巴士站',
    stops:         '站',
    routes:        '條路線',
    eta:           '到站',
    noETA:         '暫無班次',
    star:          '收藏此路線',
    unstar:        '取消收藏',
    maxStars:      '最多收藏 5 條路線',
    map:           '地圖',
    showMap:       '顯示地圖',
    autoRefresh:   '每 30 秒自動更新',
    dataSource:    '資料來源：data.etabus.gov.hk',
    loadingData:   '正在載入資料...',
    loadingPos:    '正在取得位置...',
    querying:      '正在查詢附近巴士站...',
    noStopsNearby: '150m 內沒有巴士站',
    dbError:       '資料庫開啟失敗',
    syncError:     '無法載入巴士站資料',
    posError:      '定位失敗',
    renderError:   '渲染失敗',
    yourPosition:  '你的位置',
    dataLabel:     '資料',
    skipLink:      '跳到巴士站列表',
    themeLabel:    '切換深色/淺色模式',
    mapLabel:      '顯示地圖',
    langLabel:     '切換語言',
    minutes:       '分鐘',
    meters:        '米',
    km:            '公里',
  },
  en: {
    appTitle:      'Bus ETA',
    nearbyStops:   'Nearby Stops',
    stops:         'stops',
    routes:        'routes',
    eta:           'ETA',
    noETA:         'No service',
    star:          'Star this route',
    unstar:        'Unstar',
    maxStars:      'Maximum 5 starred routes',
    map:           'Map',
    showMap:       'Show Map',
    autoRefresh:   'Auto-refresh every 30s',
    dataSource:    'Source: data.etabus.gov.hk',
    loadingData:   'Loading data...',
    loadingPos:    'Getting location...',
    querying:      'Querying nearby stops...',
    noStopsNearby: 'No stops within 150m',
    dbError:       'Database error',
    syncError:     'Failed to load bus stop data',
    posError:      'Location error',
    renderError:   'Render error',
    yourPosition:  'Your position',
    dataLabel:     'Data',
    skipLink:      'Skip to bus stop list',
    themeLabel:    'Toggle light/dark mode',
    mapLabel:      'Show map',
    langLabel:     'Toggle language',
    minutes:       'min',
    meters:        'm',
    km:            'km',
  },
};

function t(key) {
  const lang = localStorage.getItem('hkbus_lang') || 'tc';
  return (I18N[lang] && I18N[lang][key]) || key;
}
