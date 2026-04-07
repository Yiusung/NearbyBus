/* ═══════════════════════════════════════════════════
   ui.js — DOM rendering, toast, theme, language
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

// ── Language ──────────────────────────────────────
function uiLoadLang() {
  return localStorage.getItem('hkbus_lang') || 'tc';
}

function uiToggleLang() {
  const current = uiLoadLang();
  const next = current === 'tc' ? 'en' : 'tc';
  localStorage.setItem('hkbus_lang', next);
  uiApplyLang();
}

function uiApplyLang() {
  // Update static elements by data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // Update lang button label
  const btn = document.getElementById('btnLang');
  if (btn) btn.textContent = uiLoadLang() === 'tc' ? 'EN' : '中';

  // Update skip link
  const skip = document.querySelector('.skip');
  if (skip) skip.textContent = t('skipLink');

  // Update aria-labels
  const btnTheme = document.getElementById('btnTheme');
  if (btnTheme) btnTheme.setAttribute('aria-label', t('themeLabel'));

  const btnMap = document.getElementById('btnMap');
  if (btnMap) btnMap.setAttribute('aria-label', t('mapLabel'));

  // Re-render cards if data exists
  if (typeof AppRefresh === 'function') AppRefresh();
}

// ── Map Toggle ────────────────────────────────────
let mapVisible = true;
let autoHidden = false;

function uiToggleMap() {
  mapVisible = !mapVisible;
  $mapWrap.classList.toggle('collapsed', !mapVisible);
  const mapText = document.querySelector('[data-i18n="map"]');
  $btnMap.textContent = '◎ ';
  if (mapText) {
    $btnMap.appendChild(mapText);
  } else {
    $btnMap.textContent = mapVisible ? '◎ ' + t('map') : '◎ ' + t('showMap');
  }
  $btnMap.setAttribute('aria-expanded', mapVisible);
  if (mapVisible) mapInvalidateSize();
}

function uiInitScrollHide() {
  window.addEventListener('scroll', () => {
    if (!autoHidden && window.scrollY > 80 && mapVisible) {
      autoHidden = true;
      mapVisible = false;
      $mapWrap.classList.add('collapsed');
      $btnMap.textContent = '◎ ' + t('showMap');
      $btnMap.setAttribute('aria-expanded', 'false');
    }
  }, { passive: true });
}

// ── Section Label + Timestamp ─────────────────────
function uiUpdateSectionLabel(stopCount, cardCount) {
  $sectionLabel.textContent = `${stopCount} ${t('stops')} · ${cardCount} ${t('routes')}`;
}

function uiUpdateTimestamp(ts) {
  if (ts) {
    $dataTs.textContent.op = (card.op || '').toLowerCase();

  const el = document.createElement('article');
  el.className = [
    'eta-card',
    card.op,
    card.isStarred ? 'starred' : '',
    card.isTooFar ? 'too-far' : '',
  ].filter(Boolean).join(' ');
  el.dataset.stopId = card.stopId;
  el.dataset.route = card.route;
  el.setAttribute('aria-label', `路線 ${card.route}，${card.dest}，${card.stopNameTc}`);

  // Star button
  const starBtn = document.createElement('button');
  starBtn.className = `star-btn ${card.op}${card.isStarred ? ' active' : ''}`;
  starBtn.textContent = card.isStarred ? '★' : '☆';
  starBtn.setAttribute('aria-label', card.isStarred ? t('unstar') : t('star'));
  starBtn.addEventListener('click', e => {
    e.stopPropagation();
    Stars.toggle(card.stopId, card.route, card.op);
  });
  el.appendChild(starBtn);

  // Card top: route + operator + destination
  const cardTop = document.createElement('div');
  cardTop.className = 'card-top';
  cardTop.innerHTML = `
    <div = t('dataLabel') + ': ' + new Date(ts).toLocaleDateString('zh-HK');
  }
}

// ── Render ETA Cards ──────────────────────────────
function uiRenderCards(cards) {
  $cardContainer.innerHTML = '';

  let prevStopId = null;

  for (const card of cards) {
    if (card.stopId !== prevStopId) {
      $cardContainer.appendChild(uiBuildStopSeparator(card));
      prevStopId = card.stopId;
    }
    $cardContainer.appendChild(uiBuildCard(card));
  }
}

function uiBuildStopSeparator(card) {
  const div = document.createElement('div');
  div.className = 'stop-separator';
  const lang = uiLoadLang();
  const primaryName = lang === 'en' ? card.stopNameEn : card.stopNameTc;
  const secondaryName = lang === 'en' ? card.stopNameTc : card.stopNameEn;
  div.innerHTML = `
    <span class="stop-sep-name">
      ${uiEsc(primaryName)}
      <span style="opacity:0.5;font-size:0.65rem">${uiEsc(secondaryName)}</span>
    </span>
    <span class="stop-sep-dist">${geoFormatDistance(card.dist)}</span>`;
  return div;
}

function uiBuildCard(card) {
  card class="route-block">
      <span class="route-num">${uiEsc(card.route)}</span>
      <span class="op-badge ${card.op}">${CONFIG.OP_LABEL[card.op] || card.op}</span>
    </div>
    <span class="destination">${uiEsc(card.dest)}</span>`;
  el.appendChild(cardTop);

  // ETA chips — container identified by data-route for refresh updates
  const etaRow = document.createElement('div');
  etaRow.className = 'eta-row';
  etaRow.dataset.route = card.route;

  let etaHTML;
  if (card.etas.length > 0) {
    etaHTML = card.etas.slice(0, CONFIG.MAX_ETA_TIMES).map((m, i) => {
      const cls = m <= 2 ? 'hot' : m <= 8 ? 'warm' : 'cool';
      const sep = i > 0 ? '<span class="sep">·</span>' : '';
      return `${sep}<span class="eta-chip ${cls}">${m}${t('minutes')}</span>`;
    }).join('');
  } else {
    etaHTML = `<span class="eta-chip na">${t('noETA')}</span>`;
  }

  etaRow.innerHTML = `
    <span class="eta-label">${t('eta')}</span>
    <div class="eta-vals">${etaHTML}</div>`;
  el.appendChild(etaRow);

  // Long-press / double-click
  uiSetupStarGesture(el, card.stopId, card.route, card.op);

  return el;
}

function uiSetupStarGesture(el, stopId, route, op) {
  let pressTimer = null;

  el.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => {
      Stars.toggle(stopId, route, op);
      navigator.vibrate?.(30);
    }, 600);
  }, { passive: true });

  el.addEventListener('touchend', () => clearTimeout(pressTimer));
  el.addEventListener('touchmove', () => clearTimeout(pressTimer));

  el.addEventListener('dblclick', e => {
    if (e.target.closest('.star-btn')) return;
    Stars.toggle(stopId, route, op);
  });
}

// ── Helpers ───────────────────────────────────────
function uiEsc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
