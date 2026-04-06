/* ═══════════════════════════════════════════════════
   stars.js — Star individual routes (not stops)
   Key format: "stopId:route" e.g. "001027:2"
   ═══════════════════════════════════════════════════ */

const Stars = {
  _set: new Set(),

  /** Build the composite key used for storage. */
  key(stopId, route) {
    return stopId + ':' + route;
  },

  /** Load from localStorage. */
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('hkbus_starred') || '[]');
      this._set = new Set(saved);
    } catch {
      this._set = new Set();
    }
  },

  /** Persist to localStorage. */
  _save() {
    localStorage.setItem('hkbus_starred', JSON.stringify([...this._set]));
  },

  /** Check if a specific route at a stop is starred. */
  has(stopId, route) {
    return this._set.has(this.key(stopId, route));
  },

  /** Get count of starred routes. */
  get size() {
    return this._set.size;
  },

  /** Get all starred keys as an array. */
  all() {
    return [...this._set];
  },

  /**
   * Toggle a route's starred state.
   * Returns { changed, starred, limitReached }
   */
  toggle(stopId, route, op) {
    const k = this.key(stopId, route);

    if (this._set.has(k)) {
      this._set.delete(k);
      this._save();
      if (typeof AppRefresh === 'function') AppRefresh();
      return { changed: true, starred: false, limitReached: false };
    }

    if (this._set.size >= CONFIG.MAX_STARRED) {
      uiToast(`最多收藏 ${CONFIG.MAX_STARRED} 條路線`);
      return { changed: false, starred: false, limitReached: true };
    }

    this._set.add(k);
    this._save();
    if (typeof AppRefresh === 'function') AppRefresh();
    return { changed: true, starred: true, limitReached: false };
  },
};
