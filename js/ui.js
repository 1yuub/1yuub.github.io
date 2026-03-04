/**
 * ui.js — UI interactions, rendering, and state management
 */

const UI = (() => {
  // ── State ─────────────────────────────────────────────────
  const state = {
    allEvents: [],
    filteredEvents: [],
    activeTypes: new Set(['hackathon', 'security', 'conference', 'technews']),
    searchQuery: '',
    isDarkTheme: true,
  };

  // ── DOM References ────────────────────────────────────────
  const els = {};

  function cacheEls() {
    els.eventList    = document.getElementById('event-list');
    els.searchInput  = document.getElementById('search-input');
    els.themeToggle  = document.getElementById('theme-toggle');
    els.refreshBtn   = document.getElementById('refresh-btn');
    els.exportBtn    = document.getElementById('export-btn');
    els.sidebarToggle = document.getElementById('sidebar-toggle');
    els.sidebar      = document.getElementById('sidebar');
    els.modal        = document.getElementById('event-modal');
    els.modalOverlay = document.getElementById('modal-overlay');
    els.loadingOverlay = document.getElementById('loading-overlay');
    els.toastContainer = document.getElementById('toast-container');
    els.statusSource = document.getElementById('status-source');
    els.statusUpdate = document.getElementById('status-update');
    els.statusCount  = document.getElementById('status-count');
    els.countHackathon  = document.getElementById('count-hackathon');
    els.countSecurity   = document.getElementById('count-security');
    els.countConference = document.getElementById('count-conference');
    els.countTechnews   = document.getElementById('count-technews');
  }

  // ── Loading ───────────────────────────────────────────────
  function showLoading() {
    if (els.loadingOverlay) els.loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    if (els.loadingOverlay) {
      els.loadingOverlay.classList.add('hidden');
    }
  }

  // ── Toast Notifications ───────────────────────────────────
  function showToast(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${Utils.escapeHtml(type)}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${Utils.escapeHtml(message)}</span>`;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // ── Filter chips ──────────────────────────────────────────
  function initFilterChips(onFilterChange) {
    const chips = document.querySelectorAll('.chip[data-type]');
    chips.forEach(chip => {
      chip.classList.add('active');
      chip.addEventListener('click', () => {
        const type = chip.dataset.type;
        if (state.activeTypes.has(type)) {
          // Don't allow deactivating all filters
          if (state.activeTypes.size > 1) {
            state.activeTypes.delete(type);
            chip.classList.remove('active');
            chip.classList.add('inactive');
          }
        } else {
          state.activeTypes.add(type);
          chip.classList.add('active');
          chip.classList.remove('inactive');
        }
        onFilterChange();
      });
    });
  }

  // ── Search ────────────────────────────────────────────────
  function initSearch(onSearchChange) {
    if (!els.searchInput) return;
    els.searchInput.addEventListener('input', Utils.debounce(() => {
      state.searchQuery = els.searchInput.value.trim().toLowerCase();
      onSearchChange();
    }, 300));
  }

  // ── Theme toggle ──────────────────────────────────────────
  function initThemeToggle(onThemeChange) {
    const saved = Utils.storageGet('techmap_theme', 'dark');
    state.isDarkTheme = saved !== 'light';
    applyTheme(state.isDarkTheme);

    if (els.themeToggle) {
      els.themeToggle.addEventListener('click', () => {
        state.isDarkTheme = !state.isDarkTheme;
        Utils.storageSet('techmap_theme', state.isDarkTheme ? 'dark' : 'light');
        applyTheme(state.isDarkTheme);
        onThemeChange(state.isDarkTheme);
      });
    }
  }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (els.themeToggle) els.themeToggle.textContent = dark ? '☀️' : '🌙';
  }

  // ── Sidebar toggle ────────────────────────────────────────
  function initSidebarToggle() {
    if (!els.sidebarToggle || !els.sidebar) return;
    els.sidebarToggle.addEventListener('click', () => {
      const collapsed = els.sidebar.classList.toggle('collapsed');
      els.sidebarToggle.style.left = collapsed ? '0px' : '340px';
      els.sidebarToggle.textContent = collapsed ? '›' : '‹';
    });
  }

  // ── Apply filters ─────────────────────────────────────────
  function applyFilters() {
    let events = [...state.allEvents];

    // Type filter
    events = events.filter(e => state.activeTypes.has(e.type));

    // Search filter
    if (state.searchQuery) {
      const q = state.searchQuery;
      events = events.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.countryName || '').toLowerCase().includes(q) ||
        (e.country || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      );
    }

    // Sort by newest first
    events.sort((a, b) => b.timestamp - a.timestamp);
    state.filteredEvents = events;
    return events;
  }

  // ── Event List Rendering ──────────────────────────────────
  function renderEventList(onEventClick) {
    if (!els.eventList) return;
    const events = state.filteredEvents;

    if (events.length === 0) {
      els.eventList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌍</div>
          <div class="empty-state-text">No events match your filters.</div>
        </div>`;
      return;
    }

    els.eventList.innerHTML = events.map(event => `
      <div class="event-card ${Utils.escapeHtml(event.type)}" data-event-id="${Utils.escapeHtml(event.id)}">
        <div class="event-card-type">${Utils.escapeHtml(event.type)}</div>
        <div class="event-card-title">${Utils.escapeHtml(event.title)}</div>
        <div class="event-card-meta">
          <span>📍 ${Utils.escapeHtml(event.countryName || event.country)}</span>
          <span>🕐 ${Utils.timeAgo(event.timestamp)}</span>
          ${event.points ? `<span>▲ ${event.points}</span>` : ''}
        </div>
      </div>`).join('');

    // Attach click listeners
    els.eventList.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.eventId;
        const event = state.allEvents.find(e => e.id === id);
        if (event) onEventClick(event);
      });
    });
  }

  // ── Counter badges ────────────────────────────────────────
  function updateCounts(events) {
    const counts = { hackathon: 0, security: 0, conference: 0, technews: 0 };
    events.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
    if (els.countHackathon)  els.countHackathon.textContent  = counts.hackathon;
    if (els.countSecurity)   els.countSecurity.textContent   = counts.security;
    if (els.countConference) els.countConference.textContent = counts.conference;
    if (els.countTechnews)   els.countTechnews.textContent   = counts.technews;
  }

  // ── Status Bar ────────────────────────────────────────────
  function updateStatus(sourceOk, eventCount) {
    if (els.statusSource) {
      els.statusSource.textContent = sourceOk ? '● Live' : '● Cached';
      els.statusSource.className = `status-item ${sourceOk ? 'status-ok' : 'status-error'}`;
    }
    if (els.statusUpdate) {
      els.statusUpdate.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
    if (els.statusCount) {
      els.statusCount.textContent = `${eventCount} events`;
    }
  }

  // ── Event Modal ───────────────────────────────────────────
  function showEventModal(event) {
    const overlay = els.modalOverlay;
    if (!overlay) return;

    const typeColors = {
      hackathon: 'badge-hackathon',
      security: 'badge-security',
      conference: 'badge-conference',
      technews: 'badge-technews',
    };

    const typeLabel = event.type.charAt(0).toUpperCase() + event.type.slice(1);
    const typeEmojis = { hackathon: '⚡', security: '🔒', conference: '🎯', technews: '📡' };

    overlay.querySelector('#modal-content').innerHTML = `
      <div class="modal-header">
        <div>
          <div class="modal-type-badge ${Utils.escapeHtml(typeColors[event.type] || '')}">
            ${typeEmojis[event.type] || ''} ${Utils.escapeHtml(typeLabel)}
          </div>
          <h2 class="modal-title">${Utils.escapeHtml(event.title)}</h2>
        </div>
        <button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-meta-row">
          <div class="modal-meta-item">📍 ${Utils.escapeHtml(event.countryName || event.country)}</div>
          <div class="modal-meta-item">🕐 ${Utils.timeAgo(event.timestamp)}</div>
          <div class="modal-meta-item">📰 ${Utils.escapeHtml(event.source || 'Unknown')}</div>
          ${event.points ? `<div class="modal-meta-item">▲ ${event.points} points</div>` : ''}
          ${event.comments ? `<div class="modal-meta-item">💬 ${event.comments} comments</div>` : ''}
        </div>
        ${event.description
          ? `<p class="modal-description">${Utils.escapeHtml(event.description)}</p>`
          : ''}
        <div class="modal-footer">
          ${event.url ? `<a href="${Utils.escapeHtml(event.url)}" target="_blank" rel="noopener noreferrer" class="btn-primary">🔗 Open Source ↗</a>` : ''}
          <button class="btn-secondary" id="modal-fly-btn">🗺️ Show on Map</button>
          <button class="btn-secondary" id="modal-close-btn2">Close</button>
        </div>
      </div>`;

    overlay.classList.remove('hidden');

    // Close handlers
    const closeModal = () => overlay.classList.add('hidden');
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-close-btn2')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); }, { once: true });

    return overlay.querySelector('#modal-fly-btn');
  }

  // ── Export ────────────────────────────────────────────────
  function initExport() {
    if (!els.exportBtn) return;
    els.exportBtn.addEventListener('click', () => {
      const data = JSON.stringify(state.filteredEvents, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `techmap-events-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Events exported successfully!', 'success');
    });
  }

  // ── Setters ───────────────────────────────────────────────
  function setAllEvents(events) {
    state.allEvents = events;
  }

  function getState() { return state; }

  return {
    cacheEls,
    showLoading,
    hideLoading,
    showToast,
    initFilterChips,
    initSearch,
    initThemeToggle,
    applyTheme,
    initSidebarToggle,
    applyFilters,
    renderEventList,
    updateCounts,
    updateStatus,
    showEventModal,
    initExport,
    setAllEvents,
    getState,
  };
})();
