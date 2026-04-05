/* ═══════════════════════════════════════════════════
   stars.js — Star/favorite stop management
   Responsibilities:
     - Load/save starred stops from localStorage
     - Toggle star state
     - Enforce max limit
     - Provide query interface for app layer
   ═══════════════════════════════════════════════════ */

const Stars = {
  _set: new Set(),

  /** Load from localStorage. Call once at startup. */
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

  /** Check if a stop is starred. */
  has(stopId) {
    return this._set.has(stopId);
  },

  /** Get count of starred stops. */
  get size() {
    return this._set.size;
  },

  /** Get all starred stop IDs as an array. */
  all() {
    return [...this._set];
  },

  /**
   * Toggle a stop's starred state.
   * Returns { changed: boolean, starred: boolean, limitReached: boolean }
   */
  toggle(stopId, op) {
    if (this._set.has(stopId)) {
      this._set.delete(stopId);
      this._save();
      if (typeof AppRefresh === 'function') AppRefresh();
      return { changed: true, starred: false, limitReached: false };
    }

    if (this._set.size >= CONFIG.MAX_STARRED) {
      uiToast(`最多收藏 ${CONFIG.MAX_STARRED} 個巴士站`);
      return { changed: false, starred: false, limitReached: true };
    }

    this._set.add(stopId);
    this._save();
    if (typeof AppRefresh === 'function') AppRefresh();
    return { changed: true, starred: true, limitReached: false };
  },
};
