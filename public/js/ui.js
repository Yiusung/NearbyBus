/* ui.js */

var $cardContainer;
var $sectionLabel;
var $dataTs;
var $loadingMsg;
var $toast;
var $mapWrap;
var $btnMap;

function uiCacheDOM() {
  $cardContainer = document.getElementById('cardContainer');
  $sectionLabel = document.getElementById('sectionLabel');
  $dataTs = document.getElementById('dataTs');
  $loadingMsg = document.getElementById('loadingMsg');
  $toast = document.getElementById('toast');
  $mapWrap = document.getElementById('mapWrap');
  $btnMap = document.getElementById('btnMap');
}

function uiShowLoading(msg) {
  if (!$loadingMsg) return;
  $loadingMsg.style.display = '';
  $loadingMsg.innerHTML = '<div class="spinner"></div><br>' + uiEsc(msg);
}

function uiHideLoading() {
  if ($loadingMsg) $loadingMsg.style.display = 'none';
}

function uiShowError(msg) {
  $cardContainer.innerHTML = '<div class="loading-msg" style="color:var(--eta-hot)">' + uiEsc(msg) + '</div>';
}

function uiToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(function() { $toast.classList.remove('show'); }, 2000);
}

function uiLoadTheme() {
  var saved = localStorage.getItem('hkbus_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function uiToggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('hkbus_theme', next);
  if (typeof mapRefreshStops === 'function') mapRefreshStops();
}

function uiLoadLang() {
  return localStorage.getItem('hkbus_lang') || 'tc';
}

function uiToggleLang() {
  var current = uiLoadLang();
  var next = current === 'tc' ? 'en' : 'tc';
  localStorage.setItem('hkbus_lang', next);
  uiApplyLang();
}

function uiApplyLang() {
  var nodes = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
  }
  var lb = document.getElementById('btnLang');
  if (lb) lb.textContent = uiLoadLang() === 'tc' ? 'EN' : '\u4e2d';
  var sk = document.querySelector('.skip');
  if (sk) sk.textContent = t('skipLink');
  var tb = document.getElementById('btnTheme');
  if (tb) tb.setAttribute('aria-label', t('themeLabel'));
  var mb = document.getElementById('btnMap');
  if (mb) mb.setAttribute('aria-label', t('mapLabel'));
  if (typeof AppRefresh === 'function') AppRefresh();
}

var mapVisible = true;
var autoHidden = false;

function uiToggleMap() {
  mapVisible = !mapVisible;
  $mapWrap.classList.toggle('collapsed', !mapVisible);
  $btnMap.textContent = '\u25ce ' + (mapVisible ? t('map') : t('showMap'));
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

function uiUpdateSectionLabel(stopCount, cardCount) {
  $sectionLabel.textContent = stopCount + ' ' + t('stops') + ' \u00b7 ' + cardCount + ' ' + t('routes');
}

function uiUpdateTimestamp(ts) {
  if (ts) {
    $dataTs.textContent = t('dataLabel') + ': ' + new Date(ts).toLocaleDateString('zh-HK');
  }
}

function uiRenderCards(cards) {
  $cardContainer.innerHTML = '';
  var prev = null;
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].stopId !== prev) {
      $cardContainer.appendChild(uiBuildStopSeparator(cards[i]));
      prev = cards[i].stopId;
    }
    $cardContainer.appendChild(uiBuildCard(cards[i]));
  }
}

function uiBuildStopSeparator(card) {
  var div = document.createElement('div');
  div.className = 'stop-separator';
  var lang = uiLoadLang();
  var pri = lang === 'en' ? card.stopNameEn : card.stopNameTc;
  var sec = lang === 'en' ? card.stopNameTc : card.stopNameEn;
  var dist = geoFormatDistance(card.dist);
  div.innerHTML = '<span class="stop-sep-name">' + uiEsc(pri) + ' <span style="opacity:0.5;font-size:0.65rem">' + uiEsc(sec) + '</span></span><span class="stop-sep-dist">' + dist + '</span>';
  return div;
}

function uiBuildCard(card) {
  card.op = (card.op || '').toLowerCase();
  var op = card.op;
  var sid = card.stopId;
  var rt = card.route;
  var starred = card.isStarred;
  var tooFar = card.isTooFar;

  var el = document.createElement('article');
  el.className = 'eta-card ' + op + (starred ? ' starred' : '') + (tooFar ? ' too-far' : '');
  el.setAttribute('data-stop-id', sid);
  el.setAttribute('data-route', rt);

  // Star button
  var sb = document.createElement('button');
  sb.className = 'star-btn ' + op + (starred ? ' active' : '');
  sb.textContent = starred ? '\u2605' : '\u2606';
  sb.setAttribute('aria-label',  sb.addEventListener('click', function(e) {
    e.stopPropagation();
    Stars.toggle(sid, rt, op);
  });
  el.appendChild(sb);

  // Card top
  var td = document.createElement('div');
  td.className = 'card-top';
  td.innerHTML = '<div class="route-block"><span class="route-num">' + uiEsc(rt) + '</span><span class="op-badge ' + op + '">' + (CONFIG.OP_LABEL[op] || op) + '</span></div><span class="destination">' + uiEsc(card.dest) + '</span>';
  el.appendChild(td);

  // ETA row
  var ed = document.createElement('div');
  ed.className = 'eta-row';
  ed.setAttribute('data-route', rt);
  var chips = '';
  if (card.etas.length > 0) {
    var lim = Math.min(card.etas.length, CONFIG.MAX_ETA_TIMES);
    for (var j = 0; j < lim; j++) {
      var m = card.etas[j];
      var cc = m <= 2 ? 'hot' : (m <= 8 ? 'warm' : 'cool');
      if ( starred ? t('unstar') : t('star'));
j > 0) chips += '<span class="sep">\u00b7</span>';
      chips += '<span class="eta-chip ' + cc + '">' + m + t('minutes') + '</span>';
    }
  } else {
    chips = '<span class="eta-chip na">' + t('noETA') + '</span>';
  }
  ed.innerHTML = '<span class="eta-label">' + t('eta') + '</span><div class="eta-vals">' + chips + '</div>';
  el.appendChild(ed);

  // Gestures
  uiSetupStarGesture(el, sid, rt, op);
  return el;
}

function uiSetupStarGesture(el, stopId, route, op) {
  var pt = null;
  el.addEventListener('touchstart', function() {
    pt = setTimeout(function() {
      Stars.toggle(stopId, route, op);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 600);
  }, { passive: true });
  el.addEventListener('touchend', function() { clearTimeout(pt); });
  el.addEventListener('touchmove', function() { clearTimeout(pt); });
  el.addEventListener('dblclick', function(e) {
    if (e.target.closest('.star-btn')) return;
    Stars.toggle(stopId, route, op);
  });
}

function uiEsc(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
