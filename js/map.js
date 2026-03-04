/**
 * map.js — Leaflet.js map initialization and marker management
 */

const MapManager = (() => {
  let map = null;
  let markerLayer = null;
  const markerMap = {}; // eventId -> L.Marker

  // Type → emoji icon
  const TYPE_ICONS = {
    hackathon:  '⚡',
    security:   '🔒',
    conference: '🎯',
    technews:   '📡',
  };

  const TYPE_COLORS = {
    hackathon:  '#22c55e',
    security:   '#ef4444',
    conference: '#f59e0b',
    technews:   '#3b82f6',
  };

  function init(containerId) {
    map = L.map(containerId, {
      center: [20, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      worldCopyJump: false,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 0.8,
    });

    // Add OpenStreetMap tile layer (dark variant via CartoDB)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    // Add zoom control in bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer group for markers
    markerLayer = L.layerGroup().addTo(map);

    return map;
  }

  function switchTileLayer(dark) {
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const url = dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(url, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }

  function createMarkerIcon(type, count = 1) {
    const icon = TYPE_ICONS[type] || '📍';
    const color = TYPE_COLORS[type] || '#64748b';
    const size = count > 5 ? 36 : count > 2 ? 32 : 28;
    const badge = count > 1
      ? `<span style="position:absolute;top:-6px;right:-6px;background:#0f172a;color:${color};border:1.5px solid ${color};border-radius:10px;font-size:10px;font-weight:700;padding:0 4px;line-height:16px;">${count}</span>`
      : '';

    const html = `
      <div class="custom-marker marker-${Utils.escapeHtml(type)}" style="width:${size}px;height:${size}px;position:relative;">
        <span style="font-size:${Math.floor(size * 0.5)}px;line-height:1;">${icon}</span>
        ${badge}
      </div>`;

    return L.divIcon({
      html,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2) - 4],
    });
  }

  function buildPopupHtml(event) {
    const color = TYPE_COLORS[event.type] || '#64748b';
    const typeLabel = event.type.charAt(0).toUpperCase() + event.type.slice(1);
    return `
      <div>
        <div class="popup-type" style="color:${color}">${Utils.escapeHtml(typeLabel)}</div>
        <div class="popup-title">${Utils.escapeHtml(Utils.truncate(event.title, 80))}</div>
        <div class="popup-meta">
          📍 ${Utils.escapeHtml(event.countryName || event.country)}
          &nbsp;·&nbsp; 🕐 ${Utils.timeAgo(event.timestamp)}
        </div>
        <button class="popup-btn" data-event-id="${Utils.escapeHtml(event.id)}">View Details →</button>
      </div>`;
  }

  /**
   * Render markers from an array of events grouped by (country, type).
   * Multiple events at the same location are shown with a count badge.
   */
  function renderMarkers(events, countries, onMarkerClick) {
    markerLayer.clearLayers();
    Object.keys(markerMap).forEach(k => delete markerMap[k]);

    if (!events || events.length === 0) return;

    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });

    // Group events by country+type for clustering
    const groups = {};
    for (const event of events) {
      const c = countryMap[event.country];
      if (!c) continue;
      const key = `${event.country}__${event.type}`;
      if (!groups[key]) {
        groups[key] = { country: c, type: event.type, events: [] };
      }
      groups[key].events.push(event);
    }

    for (const group of Object.values(groups)) {
      const { country, type, events: groupEvents } = group;

      // Slight random jitter so markers of different types don't overlap exactly
      const jitter = () => (Math.random() - 0.5) * 1.5;
      const lat = country.lat + jitter();
      const lon = country.lon + jitter();

      const icon = createMarkerIcon(type, groupEvents.length);
      const marker = L.marker([lat, lon], { icon });

      // Popup for the first event (most recent)
      const topEvent = groupEvents.sort((a, b) => b.timestamp - a.timestamp)[0];
      const popup = L.popup({ closeButton: true, autoPan: true })
        .setContent(buildPopupHtml(topEvent));
      marker.bindPopup(popup);

      marker.on('popupopen', () => {
        // Attach click handler to popup button
        setTimeout(() => {
          const btn = document.querySelector(`.popup-btn[data-event-id="${topEvent.id}"]`);
          if (btn) btn.addEventListener('click', () => onMarkerClick(topEvent));
        }, 50);
      });

      // Tooltip on hover
      marker.bindTooltip(
        `<strong>${Utils.escapeHtml(Utils.truncate(topEvent.title, 60))}</strong><br>
         <small>${Utils.escapeHtml(country.name)} · ${groupEvents.length} event${groupEvents.length > 1 ? 's' : ''}</small>`,
        { direction: 'top', offset: [0, -10] }
      );

      markerLayer.addLayer(marker);
      markerMap[topEvent.id] = marker;
    }
  }

  function flyToCountry(countryCode, countries) {
    const c = countries.find(c => c.code === countryCode);
    if (c) map.flyTo([c.lat, c.lon], 5, { duration: 1.2 });
  }

  function flyToEvent(event, countries) {
    const c = countries.find(c => c.code === event.country);
    if (c) {
      map.flyTo([c.lat, c.lon], 5, { duration: 1.2 });
      const marker = markerMap[event.id];
      if (marker) setTimeout(() => marker.openPopup(), 1300);
    }
  }

  function resetView() {
    map.flyTo([20, 10], 2, { duration: 1 });
  }

  function getMap() { return map; }

  return { init, switchTileLayer, renderMarkers, flyToCountry, flyToEvent, resetView, getMap };
})();
