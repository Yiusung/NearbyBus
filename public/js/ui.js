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
  setTimeout(function() {
    $toast.classList.remove('show');
  }, 2000);
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
  var allEls = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < allEls.length; i++) {
    var k = allEls[i].getAttribute('data-i18n');
    allEls[i].textContent = t(k);
  }
  var langBtn = document.getElementById('btnLang');
  if (langBtn) {
    langBtn.textContent = uiLoadLang() === 'tc' ? 'EN' : '\u4e2d';
  }
  var skipEl = document.querySelector('.skip');
  if (skipEl) {
    skipEl.textContent = t('skipLink');
  }
  var themeBtn = document.getElementById('btnTheme');
  if (themeBtn) {
    themeBtn.setAttribute('aria-label', t('themeLabel'));
  }
  var mapBtn = document.getElementById('btnMap');
  if (mapBtn) {
    mapBtn.setAttribute('aria-label', t('mapLabel'));
  }
  if (typeof AppRefresh === 'function') {
    AppRefresh();
  }
}

var mapVisible = true;
var autoHidden = false;

function uiToggleMap() {
  mapVisible = !mapVisible;
  $mapWrap.classList.toggle('collapsed', !mapVisible);
  var lbl = mapVisible ? t('map') : t('showMap');
  $btnMap.textContent = '\u25ce ' + lbl;
  $btnMap.setAttribute('aria-expanded', mapVisible);
  if (mapVisible) {
    mapInvalidateSize();
  }
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
  var txt = stopCount + ' ' + t('stops') + ' \u00b7 ' + cardCount + ' ' + t('routes');
  $sectionLabel.textContent = txt;
}

function uiUpdateTimestamp(ts) {
  if (ts) {
    var d = new Date(ts);
    $dataTs.textContent = t('dataLabel') + ': ' + d.toLocaleDateString('zh-HK');
  }
}

function uiRenderCards(cards) {
  $cardContainer.innerHTML = '';
  var prev = null;
  for (var i = 0; i < cards.length; i++) {
    var c = cards[i];
    if (c.stopId !== prev) {
      $cardContainer.appendChild(uiBuildStopSeparator(c));
      prev = c.stopId;
    }
    $cardContainer.appendChild(uiBuildCard(c));
  }
}

function uiBuildStopSeparator(card) {
  var div = document.createElement('div');
  div.className = 'stop-separator';
  var lang = uiLoadLang();
  var pri = lang === 'en' ? card.stopNameEn : card.stopNameTc;
  var sec = lang === 'en' ? card.stopNameTc : card.stopNameEn;
  var h = '';
  h += '<span class="stop-sep-name">';
  h += uiEsc(pri);
  h += ' <span style="opacity:0.5;font-size:0.65rem">';
  h += uiEsc(sec);
  h += '</span></span>';
  h += '<span class="stop-sep-dist">';
  h += geoFormatDistance(card.dist);
  h += '</span>';
  div.innerHTML = h;
  return div;
}

function uiBuildCard(card) {
  card.op = (card.op || '').toLowerCase();
  var el = document.createElement('article');
  var cls = 'eta-card ' + card.op;
  if (card.isStarred) cls += ' starred';
  if (card.isTooFar) cls += ' too-far';
  el.className = cls;
  el.setAttribute('data-stop-id', card.stopId);
  el.setAttribute('data-route', card.route);

  var sid = card.stopId;
  var rt = card.route;
  var op = card.op;

  var starBtn = document.createElement('button');
  starBtn.className = 'star-btn ' + op;
  if (card.isStarred) starBtn.className += ' active';
  starBtn.textContent = card.isStarred ? '\u2605' : '\u2606';
  starBtn.setAttribute('aria-label', card.isStarred ? t('unstar') : t('star'));
  starBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    Stars.toggle(sid, rt, op);
  });
  el.appendChild(starBtn);

  var topDiv = document.createElement('div');
  topDiv.className = 'card-top';
  var th  th += '<span class="route-num">' + uiEsc(card.route) + '</span>';
  th += '<span class="op-badge ' + op + '">' + (CONFIG.OP_LABEL[op] || op) + '</span>';
  th += '</div>';
  th += '<span class="destination">' + uiEsc(card.dest) + '</span>';
  topDiv.innerHTML = th;
  el.appendChild(topDiv);

  var etaDiv = document.createElement('div');
  etaDiv.className = 'eta-row';
  etaDiv.setAttribute('data-route', card.route);

  var eh = '';
  if (card.etas.length > 0) {
    var lim = Math.min(card.etas = '';
  th += '<div class="route-block">';
.length, CONFIG.MAX_ETA_TIMES);
    for (var j = 0; j < lim; j++) {
      var m = card.etas[j];
      var cc = 'cool';
      if (m <= 2) cc = 'hot';
      else if (m <= 8) cc = 'warm';
      if (j > 0) eh += '<span class="sep">\u00b7</span>';
      eh += '<span class="eta-chip ' + cc + '">' + m + t('minutes') + '</span>';
    }
  } else {
    eh = '<span class="eta-chip na">' + t('noETA') + '</span>';
  }
  etaDiv.innerHTML = '<span class="eta-label">' + t('eta') + '</span><div class="eta-vals">' + eh + '</div>';
  el.appendChild(etaDiv);

  uiSetupStarGesture(el, sid, rt, op);
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
  el.addEventListener('touchend', function() {
    clearTimeout(pressTimer);
  });
  el.addEventListener('touchmove', function() {
    clearTimeout(pressTimer);
  });
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
