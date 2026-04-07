/* ui.js - DOM rendering, toast, theme, language */

var $cardContainer, $sectionLabel, $dataTs, $loadingMsg, $toast, $mapWrap, $btnMap;

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
  $cardContainer.innerHTML =
    '<div class="loading-msg" style="color:var(--eta-hot)">' + uiEsc(msg) + '</div>';
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
  var els = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-i18n');
    els[i].textContent = t(key);
  }

  var langBtn = document.getElementById('btnLang');
  if (langBtn) langBtn.textContent = uiLoadLang() === 'tc' ? 'EN' : '\u4e2d';

  var skip = document.querySelector('.skip');
  if (skip) skip.textContent = t('skipLink');

  var btnT = document.getElementById('btnTheme');
  if (btnT) btnT.setAttribute('aria-label', t('themeLabel'));

  var btnM = document.getElementById('btnMap');
  if (btnM) btnM.setAttribute('aria-label', t('mapLabel'));

  if (typeof AppRefresh === 'function') AppRefresh();
}

var mapVisible = true;
var autoHidden = false;

function uiToggleMap() {
  mapVisible = !mapVisible;
  $mapWrap.classList.toggle('collapsed', !mapVisible);
  var label = mapVisible ? t('map') : t('showMap');
  $btnMap.textContent = '\u25ce ' + label;
  $btnMap.setAttribute('aria-expanded', mapVisible);
  if (mapVisible) mapInvalidateSize();
}

function uiInitScrollHide() {
  window.addEventListener('scroll', function() {
    if (!autoHidden && window.scrollY > 80 && mapVisible) {
      autoHidden = true;
      mapVisible = false;
      $mapWrapu25ce ' + t('showMap');
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
  var prevStopId = null;
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].stopId !== prevStopId) {
      $cardContainer.appendChild(uiBuildStopSeparator(cards[i]));
      prevStopId = cards[i].stopId;
    }
    $cardContainer.appendChild(uiBuildCard(cards[i]));
  }
}

function uiBuildStopSeparator(card) {
  var div = document.createElement('div');
  div.className = 'stop-separator';

  var lang = uiLoadLang();
  var primary = lang === 'en' ? card.stopNameEn : card.stopNameTc;
  var secondary = lang === 'en' ? card.stopNameTc : card.stopNameEn;

  var html = '';
  html += '<span class="stop-sep-name">';
  html += uiEsc(primary);
  html += ' <span style="opacity:0.5;font-size:0.65rem">';
  html += uiEsc(secondary);
  html += '</span></span>';
  html += '<span class="stop-sep-dist">';
  html += geoFormatDistance(card.dist);
  html += '</span>';

  div.innerHTML = html;
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
  el.setAttribute('aria-label', card.route + ' ' + card.dest + ' ' + card.stopNameTc);

  // Star button
  var starBtn = document.createElement('button');
  starBtn.className = 'star-btn ' + card.op;
  if (card.isStarred) starBtn.className += ' active';
  starBtn.textContent = card.isStarred ? '\u2605' : '\u2606';
  starBtn.setAttribute('aria-label', card.isStarred ? t('unstar') : t('star'));
  var sid = card.stopId;
  var rt = card.route;
  var op = card.op;
  starBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    Stars.toggle(sid, rt, op);
  });
  el.appendChild(starBtn);

  // Card top
  var cardTop = document.createElement('div');
  cardTop.className = 'card-top';

  var topHTML = '';
  topHTML += '<div class="route-block">';
  topHTML += '<span class="route-num">' + uiEsc(card.route) + '</span>';
  topHTML += '<span class="op-badge ' + card.op + '">';
  topHTML += (CONFIG.OP_LABEL[card.op] || card.op);
  topHTML += '</span>';
  topHTML += '</div>';
  topHTML += '<span class="destination">' + uiEsc(card.dest) + '</span>';

  cardTop.innerHTML = topHTML;
  el.appendChild(cardTop);

  // ETA row
  var etaRow = document.createElement('div');
  etaRow.className = 'eta-row';
  etaRow.setAttribute('data-route', card.route);

  var etaHTML = '';
  if (card.etas.length > 0) {
    var limit = Math.min(card.etas.length, CONFIG.MAX_ETA_TIMES);
    for (var j = 0; j < limit; j++) {
      var m = card.etas[j];
      var chipCls = m <= 2 ? 'hot' : (m <= 8 ? 'warm' : 'cool');
      if (j > 0) etaHTML += '<span class="sep">\u00b7</span>';
      etaHTML += '<span class="eta-chip ' + chipCls + '">' + m + t('minutes') +.classList.add('collapsed');
      $btnMap.textContent = '\ '</span>';
   ;
}
