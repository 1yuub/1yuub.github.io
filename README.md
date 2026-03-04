# TechMap — Global Hackathon & Tech News Monitor

A modern, interactive world map that monitors and displays hackathons, tech news, security incidents, and conferences across the globe in real time.

🔗 **Live Site**: [https://1yuub.github.io](https://1yuub.github.io)

---

## Features

- 🗺️ **Interactive World Map** — Pan, zoom, and click markers powered by Leaflet.js + OpenStreetMap
- ⚡ **Event Tracking** — Hackathons, Tech News, Security Alerts, and Conferences
- 📡 **Live Data** — Fetches real-time stories from HackerNews Algolia API
- 🔍 **Search & Filter** — Filter by event type or search by keyword / country
- 🌙 **Dark / Light Theme** — Persistent theme preference via localStorage
- 📥 **Export** — Download filtered events as JSON
- 🔄 **Auto-refresh** — Events refresh every 30 minutes; data is cached locally
- 📱 **Responsive** — Works on desktop and mobile

---

## Project Structure

```
1yuub.github.io/
├── index.html          # Main app shell
├── css/
│   └── style.css       # Custom styles, CSS variables for theming
├── js/
│   ├── utils.js        # Helper functions (time, storage, sanitization)
│   ├── api.js          # Data fetching (HackerNews API + seed data)
│   ├── map.js          # Leaflet map setup and marker management
│   ├── ui.js           # UI state, sidebar, modal, filters, toasts
│   └── app.js          # Main entry point wiring everything together
├── data/
│   └── countries.json  # Country coordinates for marker placement
└── README.md
```

---

## Data Sources

| Source | Type | API Key Required |
|--------|------|-----------------|
| [HackerNews Algolia API](https://hn.algolia.com/api) | Tech news | ❌ Free |
| [OpenStreetMap](https://www.openstreetmap.org) | Map tiles | ❌ Free |
| [CARTO](https://carto.com) | Dark/Light map tiles | ❌ Free |
| Curated seed data | Hackathons, Conferences, Security | ❌ Built-in |

---

## Event Categories

| Category | Icon | Description |
|----------|------|-------------|
| Hackathon | ⚡ | Coding competitions and hack days |
| Security | 🔒 | Cyber incidents, CVEs, breaches |
| Conference | 🎯 | Tech conferences and summits |
| Tech News | 📡 | General technology news and updates |

---

## Running Locally

No build step required — pure static files.

```bash
# Any static file server works, e.g.:
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

---

## Deployment

The site is automatically deployed to GitHub Pages from the `main` branch via the built-in GitHub Pages action.

---

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES2020+)
- **Mapping**: [Leaflet.js 1.9](https://leafletjs.com/) with CartoDB tiles
- **Data**: [HackerNews Algolia API](https://hn.algolia.com/api)
- **Styling**: Custom CSS with CSS custom properties (no frameworks, fast load)
- **Build**: Zero build step — static files served directly
