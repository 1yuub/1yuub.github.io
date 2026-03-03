let map;
let markers = [];
let allEvents = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  fetchAllData();
  setupFilterButtons();
  setInterval(fetchAllData, 300000);
  setInterval(updateLastUpdated, 60000);
});

function initMap() {
  map = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
}

async function fetchAllData() {
  try {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    allEvents = [];

    await fetchCybersecurityNews();
    addMockThreatData();
    updateStats();
    updateLastUpdated();
    displayNews();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchCybersecurityNews() {
  try {
    const newsUrl = 'https://newsapi.org/v2/everything?q=cybersecurity+hacking+breach&sortBy=publishedAt&language=en&pageSize=20';
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const encodedUrl = encodeURIComponent(newsUrl);
    
    const response = await fetch(`${proxyUrl}${encodedUrl}`);
    const data = await response.json();
    
    if (data.articles) {
      data.articles.forEach(article => {
        const event = {
          title: article.title,
          description: article.description || 'No description available',
          source: article.source.name,
          url: article.url,
          date: new Date(article.publishedAt),
          type: categorizeNews(article.title),
          severity: calculateSeverity(article.title),
          location: extractLocation(article.title)
        };
        allEvents.push(event);
      });
    }
  } catch (error) {
    console.log('News API error:', error);
  }
}

function addMockThreatData() {
  const mockThreats = [
    {
      title: '🚨 Critical Ransomware Attack - Financial Institutions Targeted Across Europe',
      description: 'Major ransomware campaign targeting financial institutions across Europe with advanced encryption methods',
      lat: 51.5074,
      lon: -0.1278,
      severity: 'critical',
      type: 'attack',
      location: 'London, UK',
      date: new Date(),
      source: 'Threat Intelligence'
    },
    {
      title: '⚠️ Zero-Day Vulnerability Discovered - Critical Web Framework Flaw',
      description: 'Critical zero-day vulnerability found in popular web framework affecting millions of applications worldwide',
      lat: 40.7128,
      lon: -74.0060,
      severity: 'critical',
      type: 'vulnerability',
      location: 'New York, USA',
      date: new Date(Date.now() - 3600000),
      source: 'CVSS Database'
    },
    {
      title: '🔓 Major Data Breach - Retail Company Compromised',
      description: 'Major retail company experiences significant data breach affecting millions of customer records',
      lat: 35.6762,
      lon: 139.6503,
      severity: 'high',
      type: 'breach',
      location: 'Tokyo, Japan',
      date: new Date(Date.now() - 7200000),
      source: 'HaveIBeenPwned'
    },
    {
      title: '🎯 Malware Campaign - Widespread Phishing Attack Detected',
      description: 'New malware variant spreading through sophisticated email campaigns across North America',
      lat: 37.7749,
      lon: -122.4194,
      severity: 'high',
      type: 'attack',
      location: 'San Francisco, USA',
      date: new Date(Date.now() - 10800000),
      source: 'Security Alert'
    },
    {
      title: '📊 Banking Sector Targeted - Large-Scale Phishing Campaign',
      description: 'Coordinated large-scale phishing campaign targeting major banking institutions in Europe',
      lat: 48.8566,
      lon: 2.3522,
      severity: 'medium',
      type: 'attack',
      location: 'Paris, France',
      date: new Date(Date.now() - 14400000),
      source: 'Threat Report'
    },
    {
      title: '⛓️ Supply Chain Attack - Software Vendor Compromised',
      description: 'Sophisticated supply chain attack compromises major software vendor affecting downstream clients',
      lat: 31.2304,
      lon: 121.4737,
      severity: 'critical',
      type: 'attack',
      location: 'Shanghai, China',
      date: new Date(Date.now() - 18000000),
      source: 'CyberSecurity News'
    }
  ];

  mockThreats.forEach(threat => {
    allEvents.push(threat);
    
    const color = threat.severity === 'critical' ? '#ff0080' : threat.severity === 'high' ? '#ff6b00' : '#ffb300';
    const marker = L.circleMarker([threat.lat, threat.lon], {
      radius: 12,
      fillColor: color,
      color: color,
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`
      <div style="color: #333; font-family: Arial;">
        <strong style="color: #ff0080;">${threat.title}</strong>
        <p style="margin: 8px 0;">${threat.description}</p>
        <small style="color: #666;">📍 ${threat.location}</small>
      </div>
    `);

    markers.push(marker);
  });
}

function categorizeNews(title) {
  const text = title.toLowerCase();
  if (text.includes('breach') || text.includes('stolen')) return 'breach';
  if (text.includes('vulnerability') || text.includes('cve')) return 'vulnerability';
  if (text.includes('attack') || text.includes('hack')) return 'attack';
  return 'other';
}

function calculateSeverity(title) {
  const text = title.toLowerCase();
  if (text.includes('critical') || text.includes('zero-day')) return 'critical';
  if (text.includes('high') || text.includes('major')) return 'high';
  return 'medium';
}

function extractLocation(title) {
  const locations = ['USA', 'Europe', 'Asia', 'UK', 'Japan', 'China', 'Russia', 'India', 'Germany', 'France'];
  for (let loc of locations) {
    if (title.includes(loc)) return loc;
  }
  return 'Global';
}

function displayNews() {
  const newsFeed = document.getElementById('news-feed');
  
  allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const filteredEvents = currentFilter === 'all' 
    ? allEvents 
    : allEvents.filter(event => event.type === currentFilter);

  if (filteredEvents.length === 0) {
    newsFeed.innerHTML = '<li class="loading">No events found for this filter.</li>';
    return;
  }

  newsFeed.innerHTML = filteredEvents.map(event => `
    <li data-type="${event.type}">
      <div class="news-title">${event.title}</div>
      <div class="news-description">${event.description}</div>
      <div class="news-meta">
        <span class="news-tag">${event.type.toUpperCase()}</span>
        <span class="news-tag">${event.severity.toUpperCase()}</span>
        <span>⏰ ${formatDate(event.date)}</span>
        <span>📡 ${event.source}</span>
        ${event.url ? `<a href="${event.url}" target="_blank">📖 Read More</a>` : ''}
      </div>
    </li>
  `).join('');
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      displayNews();
    });
  });
}

function updateStats() {
  document.getElementById('total-events').textContent = allEvents.length;
  
  const today = new Date().toDateString();
  const todayEvents = allEvents.filter(e => new Date(e.date).toDateString() === today).length;
  document.getElementById('today-events').textContent = todayEvents;
  
  const activeThreats = allEvents.filter(e => e.severity !== 'medium').length;
  document.getElementById('active-threats').textContent = activeThreats;
  
  const criticalCount = allEvents.filter(e => e.severity === 'critical').length;
  document.getElementById('critical-count').textContent = criticalCount;
  document.getElementById('critical-issues').textContent = criticalCount;
  
  document.getElementById('event-count').textContent = allEvents.length;
}

function updateLastUpdated() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('last-updated').textContent = `${hours}:${minutes}`;
}
