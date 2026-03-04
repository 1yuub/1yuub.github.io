/**
 * utils.js — Helper functions
 */

const Utils = (() => {
  /**
   * Format a Unix timestamp (seconds) or Date into a relative time string.
   */
  function timeAgo(timestamp) {
    const now = Date.now();
    const ts = typeof timestamp === 'number' && timestamp < 1e12
      ? timestamp * 1000
      : typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const diff = Math.floor((now - ts) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  /**
   * Format a date to a readable string.
   */
  function formatDate(ts) {
    const d = ts < 1e12 ? new Date(ts * 1000) : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Truncate text to maxLen characters.
   */
  function truncate(text, maxLen = 120) {
    if (!text) return '';
    return text.length <= maxLen ? text : text.slice(0, maxLen).trimEnd() + '…';
  }

  /**
   * Escape HTML to prevent XSS.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Debounce a function.
   */
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Generate a random ID.
   */
  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  /**
   * Deep clone a plain object.
   */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get from localStorage with JSON parse; return fallback on error.
   */
  function storageGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /**
   * Save to localStorage with JSON stringify.
   */
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota errors silently
    }
  }

  /**
   * Determine if cached data is still fresh (within maxAgeMs).
   */
  function isCacheFresh(timestamp, maxAgeMs) {
    return timestamp && (Date.now() - timestamp) < maxAgeMs;
  }

  /**
   * Slugify a string for use as an ID.
   */
  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  return {
    timeAgo,
    formatDate,
    truncate,
    escapeHtml,
    debounce,
    uid,
    clone,
    storageGet,
    storageSet,
    isCacheFresh,
    slugify,
  };
})();
