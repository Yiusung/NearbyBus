/* ═══════════════════════════════════════════════════
   ui.js — DOM rendering, toast, theme
   Responsibilities:
     - Render ETA cards from processed data
     - Build individual card DOM
     - Theme toggle (light ↔ dark)
     - Loading state management
     - Toast notifications
     - Map toggle + auto-hide on scroll
   ═══════════════════════════════════════════════════ */

// ── DOM References (cached after DOMContentLoaded) ─
let $cardContainer, $sectionLabel, $dataTs, $loadingMsg, $toast, $mapWrap, $btnMap;

function uiCacheDOM() {
  $cardContainer = document.getElementById('cardContainer');
  $sectionLabel  = document.getElementById('sectionLabel');
  $dataTs        = document.getElementById('dataTs');
  $loadingMsg    = document.getElementById('loadingMsg');
  $toast         = document.getElementById('toast');
  $mapWrap       = document.getElementById('mapWrap');
  $btnMap        = document.getElementById('btnMap');
}

// ── Loading ───────────────────────────────────────
function uiShowLoading(msg) {
  if (!$loadingMsg) return;
  $loadingMsg.style.display = '';
  $loadingMsg.innerHTML = `<div class="spinner"></div><br>${uiEsc(msg)}`;
}

function uiHideLoading() {
  if ($loadingMsg) $loadingMsg.style.display = 'none';
}

function uiShowError(msg) {
  $cardContainer.innerHTML =
    `<div class="loading-msg" style="color:var(--eta-hot)">${uiEsc(msg)}</div>`;
}

// ── Toast ─────────────────────────────────────────
function uiToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 2000);
}

// ── Theme ─────────────────────────────────────────
function uiLoadTheme() {
  const saved = localStorage.getItem('hkbus_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function uiToggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('hkbus_theme', next);
  if (typeof mapRefreshStops === 'function') mapRefreshStops();
}

// ── Map Toggle ────────────────────────────────────
let mapVisible = true;
let autoHidden = false;

function uiToggleMap() {
  mapVisible = !mapVisible;
  $mapWrap.classList.toggle('collapsed', !mapVisible);
  $btnMap.textContent = mapVisible ? '◎ 地圖' : '◎ 顯示地圖';
  $btnMap.setAttribute('aria-expanded', mapVisible);
  if (mapVisible) mapInvalidateSize();
}

function uiInitScrollHide() {
  window.addEventListener('scroll', () => {
    if (!autoHidden && window.scrollY > 80 && mapVisible) {
      autoHidden = true;
      mapVisible = false;
      $mapWrap.classList.add('collapsed');
      $btnMap.textContent = '◎ 顯示地圖';
      $btnMap.setAttribute('aria-expanded', 'false');
    }
  }, { passive: true });
}

// ── Section Label + Timestamp ─────────────────────
function uiUpdateSectionLabel(nearbyCount) {
  $sectionLabel.textContent = `附近巴士站 · ${nearbyCount} 站`;
}

function uiUpdateTimestamp(ts) {
  if (ts) {
    $dataTs.textContent = '資料: ' + new Date(ts).toLocaleDateString('zh-HK');
  }
}

// ── Render ETA Cards ──────────────────────────────
/**
 * Main render function.
 * cards = array of card data objects prepared by the app layer.
 */
function uiRenderCards(cards) {
  $cardContainer.innerHTML = '';

  for (const card of cards) {
    $cardContainer.appendChild(uiBuildCard(card));
  }
}

/**
 * Build a single ETA card DOM element.
 */
function uiBuildCard(card) {
  const el = document.createElement('article');
  el.className = [
    'eta-card',
    card.op,
    card.isStarred ? 'starred' : '',
    card.isTooFar ? 'too-far' : '',
  ].filter(Boolean).join(' ');
  el.dataset.stopId = card.stopId;
  el.setAttribute('aria-label', `路線 ${card.routes.map(r => r.route).join('、')}, ${card.nameTc}`);

  // Star button
  const starBtn = document.createElement('button');
  starBtn.className = `star-btn ${card.op}${card.isStarred ? ' active' : ''}`;
  starBtn.textContent = card.isStarred ? '★' : '☆';
  starBtn.setAttribute('aria-label', card.isStarred ? '取消收藏' : '收藏此站');
  starBtn.addEventListener('click', e => {
    e.stopPropagation();
    Stars.toggle(card.stopId, card.op);
  });
  el.appendChild(starBtn);

  // Card top: first route prominently
  const cardTop = document.createElement('div');
  cardTop.className = 'card-top';
  const firstRoute = card.routes[0];
  if (firstRoute) {
    cardTop.innerHTML = `
      <div class="route-block">
        <span class="route-num">${uiEsc(firstRoute.route)}</span>
        <span class="op-badge ${firstRoute.op}">${CONFIG.OP_LABEL[firstRoute.op] || firstRoute.op}</span>
      </div>
      <span class="destination">${uiEsc(firstRoute.dest)}</span>`;
  } else {
    cardTop.innerHTML = `<div class="route-block"><span class="route-num">—</span></div>`;
  }
  el.appendChild(cardTop);

  // ETA rows
  let routeCount = 0;
  for (const route of card.routes) {
    if (routeCount < CONFIG.MAX_ETA_ROUTES) {
      el.appendChild(uiBuildETARow(route, routeCount));
    } else {
      el.appendChild(uiBuildRouteOnlyRow(route));
    }
    routeCount++;
  }

  // Stop meta
  const meta = document.createElement('div');
  meta.className = 'stop-meta';
  meta.innerHTML = `
    <span class="stop-name">${uiEsc(card.nameTc)} ${uiEsc(card.nameEn)}</span>
    <span class="stop-dist">${geoFormatDistance(card.dist)}</span>`;
  el.appendChild(meta);

  // Long-press / double-click for starring
  uiSetupStarGesture(el, card.stopId, card.op);

  return el;
}

/**
 * Build a single ETA row (route + destination + time chips).
 */
function uiBuildETARow(route, index) {
  const row = document.createElement('div');
  row.className = 'eta-row';

  let etaHTML;
  if (route.etas.length > 0) {
    etaHTML = route.etas.slice(0, CONFIG.MAX_ETA_TIMES).map((m, i) => {
      const cls = etaClass(m);
      const sep = i > 0 ? '<span class="sep">·</span>' : '';
      return `${sep}<span class="eta-chip ${cls}">${m}分</span>`;
    }).join('');
  } else {
    etaHTML = '<span class="eta-chip na">暫無班次</span>';
  }

  row.innerHTML = `
    <span class="eta-label">${index === 0 ? '到站' : ''}</span>
    <div class="eta-vals">
      <span style="font-weight:700;font-size:0.82rem;margin-right:0.2rem">${uiEsc(route.route)}</span>
      <span style="font-size:0.75rem;color:var(--text-sec);margin-right:0.3rem">${uiEsc(route.dest)}</span>
      ${etaHTML}
    </div>`;

  return row;
}

/**
 * Build a route-only row (no ETA data, beyond MAX_ETA_ROUTES).
 */
function uiBuildRouteOnlyRow(route) {
  const row = document.createElement('div');
  row.className = 'route-only';
  row.innerHTML = `
    <span class="rnum">${uiEsc(route.route)}</span>
    <span class="rdest">${uiEsc(route.dest)}</span>`;
  return row;
}

/**
 * Attach long-press (mobile) and double-click (desktop) star gestures.
 */
function uiSetupStarGesture(el, stopId, op) {
  let pressTimer = null;

  // Long press — mobile
  el.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => {
      Stars.toggle(stopId, op);
      navigator.vibrate?.(30);
    }, 600);
  }, { passive: true });

  el.addEventListener('touchend', () => clearTimeout(pressTimer));
  el.addEventListener('touchmove', () => clearTimeout(pressTimer));

  // Double click — desktop
  el.addEventListener('dblclick', e => {
    if (e.target.closest('.star-btn')) return;
    Stars.toggle(stopId, op);
  });
}

// ── Helpers ───────────────────────────────────────
function uiEsc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
