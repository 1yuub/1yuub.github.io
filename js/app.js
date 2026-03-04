/**
 * app.js — Main application entry point
 */

(async () => {
  // ── Boot ─────────────────────────────────────────────────
  UI.cacheEls();
  UI.showLoading();

  // ── Load countries ────────────────────────────────────────
  let countries = [];
  try {
    const res = await fetch('./data/countries.json');
    if (!res.ok) throw new Error('Failed to load countries.json');
    countries = await res.json();
  } catch (err) {
    console.error('[App] Countries load failed:', err);
    UI.showToast('Failed to load country data.', 'error');
    UI.hideLoading();
    return;
  }

  // ── Initialize Map ────────────────────────────────────────
  MapManager.init('map');

  // ── Theme ─────────────────────────────────────────────────
  UI.initThemeToggle(isDark => {
    MapManager.switchTileLayer(isDark);
  });

  // ── Refresh handler ───────────────────────────────────────
  async function refreshData() {
    UI.showLoading();
    // Clear cache to force fresh fetch
    Utils.storageSet('techmap_events_ts', null);
    await loadAndRender();
    UI.showToast('Events refreshed!', 'success');
  }

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshData);

  // ── Core load + render cycle ───────────────────────────────
  async function loadAndRender(sourceOverride) {
    let events = [];
    let sourceOk = false;
    try {
      events = await API.loadAllEvents(countries);
      sourceOk = true;
    } catch (err) {
      console.error('[App] Failed to load events:', err);
      UI.showToast('Could not fetch live events. Showing cached data.', 'error');
    }

    UI.setAllEvents(events);

    function applyAndRender() {
      const filtered = UI.applyFilters();
      UI.renderEventList(onEventClick);
      UI.updateCounts(filtered);
      MapManager.renderMarkers(filtered, countries, onEventClick);
    }

    applyAndRender();
    UI.updateStatus(sourceOk, events.length);
    UI.hideLoading();

    // ── Wire up filter chips ───────────────────────────────
    UI.initFilterChips(applyAndRender);

    // ── Wire up search ─────────────────────────────────────
    UI.initSearch(applyAndRender);

    // ── Wire up sidebar toggle ─────────────────────────────
    UI.initSidebarToggle();

    // ── Wire up export ─────────────────────────────────────
    UI.initExport();

    // ── Auto-refresh every 30 minutes ─────────────────────
    setTimeout(() => {
      Utils.storageSet('techmap_events_ts', null);
      loadAndRender();
    }, 30 * 60 * 1000);
  }

  // ── Event click handler ────────────────────────────────────
  function onEventClick(event) {
    const flyBtn = UI.showEventModal(event);
    if (flyBtn) {
      flyBtn.addEventListener('click', () => {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.add('hidden');
        MapManager.flyToEvent(event, countries);
      });
    }
  }

  // ── Map reset button ───────────────────────────────────────
  const resetBtn = document.getElementById('reset-view-btn');
  if (resetBtn) resetBtn.addEventListener('click', () => MapManager.resetView());

  // ── Kick off ───────────────────────────────────────────────
  await loadAndRender();
})();
