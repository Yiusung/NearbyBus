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
  $loadingMsg.innerHTML = '<div class="spinner"></div><br>' + uiEsc(msg);
}

function uiHideLoading() {
  if ($loadingMsg) $loadingMsg.style.display = 'none';
}

function uiShowError(msg) {
  $cardContainer.innerHTML =
    '<div class="loading-msg" style="color:var(--eta-hot)">' + uiEsc(msg) + '</div>';
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
  localStorage.setItem('hkbusApplyLang() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  var btn = document.getElementById('btnLang');
  if (btn) btn.textContent = uiLoadLang() === 'tc' ? 'EN' : '中';

  var skip = document.querySelector('.skip');
  if (skip) skip.textContent = t('skipLink');

  var btnTheme = document.getElementById('btnTheme');
  if (btnTheme) btnTheme.setAttribute('aria-label', t('themeLabel'));

  var btnMap = document.getElementById('btnMap');
  if (btnMap) btnMap.setAttribute('aria-label', t('mapLabel'));

  if (typeof AppRefresh === 'function') AppRefresh();
}

// ── Map Toggle ────────────────────────────────────
var mapVisible = true;
var autoHidden = false;

function uiToggleMap() {
  mapVisible = !mapVisible;
  $mapWrap.classList.toggle('collapsed', !mapVisible);
  $btnMap.textContent = mapVisible ? '\u25ce ' + t('map') : '\u25ce ' + t('showMap');
  $btnMap.setAttribute('aria-expanded', mapVisible);
  if (mapVisible) mapInvalidateSize();
}

function uiInitScrollHide() {
  window.addEventListener('scroll', function() {
    if (!autoHidden && window.scrollY > 80 && mapVisible) {
      autoHidden = true;
      mapVisible = false;
      $mapWrap.classList.add('collapsed');
      $btnMap.textContent = '\u25ce ' + t('showMap');
      $btnMap.setAttribute('aria-expanded', 'false');
    }
  }, { passive: true });
}

// ── Section Label + Timestamp ─────────────────────
function uiUpdateSectionLabel(stopCount, cardCount) {
  $sectionLabel.textContent = stopCount + ' ' + t('stops') + ' \u00b7 ' + cardCount + ' ' + t('routes');
}

function uiUpdateTimestamp(ts) {
  if (ts) {
    $dataTs.textContent = t('dataLabel') + ': ' + new Date(ts).toLocaleDateString('zh-HK');
  }
}

// ── Render ETA Cards ──────────────────────────────
function uiRenderCards(cards) {
  $cardContainer.innerHTML = '';
  var prevStopId = null;

  for (var i = 0; i < cards.length; i++) {
    var card_lang', next);
  uiApplyLang();
}

function ui = cards[i];
    if (card.stopId !== prevStopId) {
      $cardContainer.appendChild(uiBuildStopSeparator(card));
      prevStopId = card.stopId;
    }
    $cardContainer.appendChild(uiBuildCard(card));
  }
}

function uiBuildStopSeparator(card) {
  var div = document.createElement('div');
  div.className = 'stop-separator';
  var lang = uiLoadLang();
  var primaryName = lang === 'en' ? card.stopNameEn : card.stopNameTc;
  var secondaryName = lang === 'en' ? card.stopNameTc : card.stopNameEn;

  var html = '<span class="stop-sep-name">' + uiEsc(primaryName);
  html += ' <span style="opacity:0.5;font-size:0.65rem">' + uiEsc(secondaryName) + '</span></span>';
  html += '<span class="stop-sep-dist">' + geoFormatDistance(card.dist) + '</span>';
  div.innerHTML = html;
  return div;
}

function uiBuildCard(card) {
  card.op = (card.op || '').toLowerCase();

  var el = document.createElement('article');
  var classes = ['eta-card', card.op];
  if (card.isStarred) classes.push('starred');
  if (card.isTooFar) classes.push('too-far');
  el.className = classes.join(' ');
  el.dataset.stopId = card.stopId;
  el.dataset.route = card.route;
  el.setAttribute('aria-label', '\u8def\u7dda ' + card.route + '\uff0c' + card.dest + '\uff0c' + card.stopNameTc);

  // Star button
  var starBtn = document.createElement('button');
  starBtn.className = 'star-btn ' + card.op + (card.isStarred ? ' active' : '');
  starBtn.textContent = card.isStarred ? '\u2605' : '\u2606';
  starBtn.setAttribute('aria-label', card.isStarred ? t('unstar') : t('star'));
  (function(sid, rt, op) {
    starBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      Stars.toggle(sid, rt, op);
    });
  })(card.stopId, card.route, card.op);
  el.appendChild(starBtn);

  // Card top
  var cardTop = document.createElement('div');
  cardTop.className = 'card-top';
  var topHTML = '<div class="route-block">';
  topHTML += '<span class="route-num">' + uiEsc(card.route) + '</span>';
  topHTML += '<span class="op-badge ' + card.op + '">' + (CONFIG.OP_LABEL[card.op] || card.op) + '</span>';
  topHTML += '</div>';
  topHTML += '<span class="destination">' + uiEsc(card.dest) + '</span>';
  cardTop.innerHTML = topHTML;
  el.appendChild(cardTop);

  // ETA row
  var etaRow = document.createElement('div');
  etaRow.className = 'eta-row';
  etaRow.dataset.route = card.route;

  var etaHTML;
  if (card.etas.length > 0) {
    var parts = [];
    var limit = Math.min(card.etas.length, CONFIG.MAX_ETA_TIMES);
    for (var j = 0; j < limit; j++) {
      var m = card.etas[j];
      var cls = m <= 2 ? 'hot' : m <= 8 ? 'warm' : 'cool';
      if (j > 0) parts.push('<span class="sep">\u00b7</span>');
      parts.push('<span class="eta-chip ' + cls + '">' + m + t('minutes') + '</span>');
    }
    etaHTML = parts.join('');
  } else {
    etaHTML = '<span class="eta-chip na">' + t('noETA') + '</span>';
  }

  etaRow.innerHTML = '<span class="eta-label">' + t('eta') + '</span><div class="eta-vals">' + etaHTML + '</div>';
  el.appendChild(etaRow);

  // Gestures
  uiSetupStarGesture(el, card.stopId, card.route, card.op);

  return el;
}

function uiSetupStarGesture(el, stopId, route, op) {
  var pressTimer = null;

  el.addEventListener('touchstart', function() {
    pressTimer = setTimeout(function() {
      Stars.toggle(stopId, route, op);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 600);
  }, { passive: true });

  el); });
  el.addEventListener('touchmove', function() { clearTimeout(pressTimer); });

  el.addEventListener('dblclick', function(e) {
    if (e.target.closest('.star-btn')) return;
    Stars.toggle(stopId, route, op);
  });
}

// ── Helpers ───────────────────────────────────────
function uiEsc(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
