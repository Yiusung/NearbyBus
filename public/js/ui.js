/* ═══════════════════════════════════════════════════
   ui.js — DOM rendering, toast, theme
   ═══════════════════════════════════════════════════ */

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
function uiUpdateSectionLabel(stopCount, cardCount) {
  $sectionLabel.textContent = `${stopCount} 站 · ${cardCount} 條路線`;
}

function uiUpdateTimestamp(ts) {
  if (ts) {
    $dataTs.textContent = '資料: ' + new Date(ts).toLocaleDateString('zh-HK');
  }
}

// ── Render ETA Cards ──────────────────────────────
function uiRenderCards(cards) {
  $cardContainer.innerHTML = '';

  // Track previous stopId to insert a stop separator
  let prevStopId = null;

  for (const card of cards) {
    // Insert stop separator when we move to a new stop
    if (card.stopId !== prevStopId) {
      $cardContainer.appendChild(uiBuildStopSeparator(card));
      prevStopId = card.stopId;
    }
    $cardContainer.appendChild(uiBuildCard(card));
  }
}

/**
 * Small divider showing stop name + distance between stop groups.
 */
function uiBuildStopSeparator(card) {
  const div = document.createElement('div');
  div.className = 'stop-separator';
  div.innerHTML = `
    <span class="stop-sep-name">${uiEsc(card.stopNameTc)}</span>
    <span class="stop-sep-dist">${geoFormatDistance(card.dist)}</span>`;
  return div;
}

/**
 * Build a single ETA card — one per route.
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
   el.setAttribute('aria-label', `路線 ${card.route}，${card.dest}，${card.stopNameTc}`);

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

   // Card top: route + operator + destination
   const cardTop = document.createElement('div');
   cardTop.className = 'card-top';
   cardTop.innerHTML = `
     <div class="route-block">
       <span class="route-num">${uiEsc(card.route)}</span>
       <span class="op-badge ${card.op}">${CONFIG.OP_LABEL[card.op] || card.op}</span>
     </div>
     <span class="destination">${uiEsc(card.dest)}</span>`;
   el.appendChild(cardTop);

   // ETA chips — each chip inherits operator color via parent .eta-card.kmb etc.
   const etaRow = document.createElement('div');
   etaRow.className = 'eta-row';

   let etaHTML;
   if (card.etas.length > 0) {
     etaHTML = card.etas.slice(0, CONFIG.MAX_ETA_TIMES).map((m, i) => {
       const cls = m <= 2 ? 'hot' : m <= 8 ? 'warm' : 'cool';
       const sep = i > 0 ? '<span class="sep">·</span>' : '';
       return `${sep}<span class="eta-chip ${cls}">${m}分</span>`;
     }).join('');
   } else {
     etaHTML = '<span class="eta-chip na">暫無班次</span>';
   }

   etaRow.innerHTML = `
     <span class="eta-label">到站</span>
     <div class="eta-vals">${etaHTML}</div>`;
   el.appendChild(etaRow);

   // Long-press / double-click
   uiSetupStarGesture(el, card.stopId, card.op);

   return el;
 }

/**
 * Attach long-press (mobile) and double-click (desktop) star gestures.
 */
function uiSetupStarGesture(el, stopId, op) {
  let pressTimer = null;

  el.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => {
      Stars.toggle(stopId, op);
      navigator.vibrate?.(30);
    }, 600);
  }, { passive: true });

  el.addEventListener('touchend', () => clearTimeout(pressTimer));
  el.addEventListener('touchmove', () => clearTimeout(pressTimer));

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
