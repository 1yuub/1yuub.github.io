/**
 * api.js — Data fetching and event generation
 *
 * Sources:
 *  - HackerNews Algolia API (free, no key)
 *  - Reddit r/technology (free, no key)
 *  - Devpost API (free, no key) for hackathons
 *  - NVD CVE API (free, no key) for security CVEs
 *  - CISA Known Exploited Vulnerabilities (free, no key)
 *  - Curated seed data (fallback for all categories)
 */

const API = (() => {
  const HN_API = 'https://hn.algolia.com/api/v1';
  const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
  ];

  // Country detection keyword map
  const COUNTRY_KEYWORDS = {
    US: ['united states', 'usa', 'america', 'san francisco', 'new york', 'silicon valley',
         'seattle', 'boston', 'austin', 'chicago', 'los angeles', 'washington dc', 'nyc', 'sf bay'],
    GB: ['uk', 'united kingdom', 'britain', 'london', 'manchester', 'cambridge', 'oxford', 'england'],
    DE: ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt', 'deutsche'],
    FR: ['france', 'paris', 'french', 'lyon', 'bordeaux'],
    JP: ['japan', 'tokyo', 'osaka', 'kyoto', 'japanese'],
    IN: ['india', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'indian', 'bengaluru'],
    CN: ['china', 'beijing', 'shanghai', 'shenzhen', 'chinese', 'alibaba', 'tencent', 'baidu'],
    CA: ['canada', 'toronto', 'vancouver', 'montreal', 'canadian'],
    AU: ['australia', 'sydney', 'melbourne', 'brisbane', 'australian'],
    BR: ['brazil', 'são paulo', 'sao paulo', 'rio de janeiro', 'brasília', 'brazilian'],
    RU: ['russia', 'moscow', 'russian', 'kremlin', 'russians'],
    KR: ['south korea', 'korea', 'seoul', 'korean', 'samsung', 'lg electronics'],
    SG: ['singapore', 'singaporean'],
    NL: ['netherlands', 'amsterdam', 'dutch', 'holland'],
    SE: ['sweden', 'stockholm', 'swedish', 'spotify'],
    IL: ['israel', 'tel aviv', 'israeli', 'jerusalem'],
    NG: ['nigeria', 'lagos', 'abuja', 'nigerian'],
    ZA: ['south africa', 'cape town', 'johannesburg', 'african tech'],
    UA: ['ukraine', 'kyiv', 'ukrainian'],
    TR: ['turkey', 'istanbul', 'ankara', 'turkish'],
    CH: ['switzerland', 'zurich', 'geneva', 'swiss'],
    AE: ['uae', 'dubai', 'abu dhabi', 'emirati'],
    PL: ['poland', 'warsaw', 'polish', 'krakow'],
    AR: ['argentina', 'buenos aires', 'argentinian'],
    MX: ['mexico', 'mexico city', 'guadalajara', 'mexican'],
    PT: ['portugal', 'lisbon', 'porto', 'portuguese'],
  };

  // Classify event type from title/tags
  function classifyEvent(title = '', tags = [], story_text = '') {
    const text = (title + ' ' + tags.join(' ') + ' ' + story_text).toLowerCase();
    if (/hackathon|hack\s?day|hackers|hacker\s+news|build challenge|buildathon/.test(text)) return 'hackathon';
    if (/breach|hack(ed|ing)|ransomware|malware|vulnerability|cve|exploit|phishing|ddos|zero.?day|security incident/.test(text)) return 'security';
    if (/conference|summit|meetup|expo|symposium|dev ?con|techcrunch disrupt|web summit/.test(text)) return 'conference';
    return 'technews';
  }

  // Detect country from title/body
  function detectCountry(text = '') {
    const lower = text.toLowerCase();
    for (const [code, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) return code;
      }
    }
    return null;
  }

  // Fetch a URL, falling back to CORS proxies on failure
  async function fetchWithProxy(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (directErr) {
      for (const proxy of CORS_PROXIES) {
        try {
          const proxyUrl = proxy + encodeURIComponent(url);
          const res = await fetch(proxyUrl, options);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res;
        } catch (_) {
          // try next proxy
        }
      }
      throw new Error(`All fetch attempts failed for: ${url}`);
    }
  }

  // Fetch latest HN stories matching query
  async function fetchHNStories(query, numericFilters = '') {
    const params = new URLSearchParams({
      query,
      tags: 'story',
      hitsPerPage: 30,
    });
    if (numericFilters) params.set('numericFilters', numericFilters);
    const res = await fetch(`${HN_API}/search?${params}`);
    if (!res.ok) throw new Error(`HN API error: ${res.status}`);
    const data = await res.json();
    return data.hits || [];
  }

  // Convert HN hit to internal event object
  function hnHitToEvent(hit, countryCode, countryName) {
    const type = classifyEvent(hit.title, hit._tags || [], hit.story_text || '');
    return {
      id: hit.objectID || Utils.uid(),
      title: hit.title || 'Untitled',
      description: Utils.truncate(hit.story_text || hit.comment_text || '', 300),
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      type,
      country: countryCode,
      countryName,
      source: 'HackerNews',
      points: hit.points || 0,
      comments: hit.num_comments || 0,
      timestamp: hit.created_at_i ? hit.created_at_i * 1000 : Date.now(),
      author: hit.author || 'anonymous',
    };
  }

  // ── Hackathon seed fallback ───────────────────────────────────────────────
  function getHackathonSeeds(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });
    const now = Date.now();
    const day = 86400000;
    return [
      {
        id: 'h1', title: 'Global AI Hackathon — San Francisco',
        description: 'A 48-hour hackathon focused on building AI-powered solutions for real-world problems. Open to developers worldwide.',
        url: 'https://devpost.com', type: 'hackathon', country: 'US', countryName: 'United States',
        source: 'Devpost', timestamp: now - 2 * day, points: 0, comments: 0, author: 'organizer',
      },
      {
        id: 'h2', title: 'MLH Local Hack Day — London',
        description: 'Major League Hacking local hack day at Imperial College London. Students build projects in 24 hours.',
        url: 'https://mlh.io', type: 'hackathon', country: 'GB', countryName: 'United Kingdom',
        source: 'MLH', timestamp: now - 1 * day, points: 0, comments: 0, author: 'mlh',
      },
      {
        id: 'h3', title: 'Hack the North — Waterloo, Canada',
        description: 'Canada\'s biggest hackathon at the University of Waterloo. 1000+ hackers, 36 hours of building.',
        url: 'https://hackthenorth.com', type: 'hackathon', country: 'CA', countryName: 'Canada',
        source: 'HackTheNorth', timestamp: now - 3 * day, points: 0, comments: 0, author: 'htn',
      },
      {
        id: 'h4', title: 'HackIndia — Bangalore',
        description: 'India\'s largest hackathon series with ₹1Cr+ prize pool. Focus on Web3, AI, and social impact.',
        url: 'https://hackindia.xyz', type: 'hackathon', country: 'IN', countryName: 'India',
        source: 'HackIndia', timestamp: now - 5 * day, points: 0, comments: 0, author: 'hackindia',
      },
      {
        id: 'h5', title: 'Berlin Blockchain Hackathon',
        description: 'Build decentralized applications and win prizes at this Web3 hackathon in the heart of Berlin.',
        url: 'https://ethglobal.com', type: 'hackathon', country: 'DE', countryName: 'Germany',
        source: 'ETHGlobal', timestamp: now - 4 * day, points: 0, comments: 0, author: 'ethglobal',
      },
      {
        id: 'h6', title: 'Tokyo Dev Hackathon — Japan',
        description: 'Annual developer hackathon in Tokyo focusing on robotics, IoT, and smart city solutions.',
        url: 'https://devpost.com', type: 'hackathon', country: 'JP', countryName: 'Japan',
        source: 'Devpost', timestamp: now - 6 * day, points: 0, comments: 0, author: 'tokyo-devs',
      },
      {
        id: 'h7', title: 'Africa Code Week Hackathon — Lagos',
        description: 'Pan-African hackathon celebrating Africa Code Week, focusing on edtech and fintech solutions.',
        url: 'https://africacodeweek.org', type: 'hackathon', country: 'NG', countryName: 'Nigeria',
        source: 'ACW', timestamp: now - 7 * day, points: 0, comments: 0, author: 'acw',
      },
    ];
  }

  // ── Conference seed fallback ──────────────────────────────────────────────
  function getConferenceSeeds(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });
    const now = Date.now();
    const day = 86400000;
    return [
      {
        id: 'c1', title: 'Web Summit — Lisbon',
        description: 'The world\'s largest technology conference returns to Lisbon with 70,000+ attendees from 160 countries.',
        url: 'https://websummit.com', type: 'conference', country: 'PT', countryName: 'Portugal',
        source: 'WebSummit', timestamp: now - 1 * day, points: 0, comments: 0, author: 'websummit',
      },
      {
        id: 'c2', title: 'Google I/O — Mountain View',
        description: 'Google\'s annual developer conference showcasing Android, Google Cloud, AI/ML, and more.',
        url: 'https://io.google', type: 'conference', country: 'US', countryName: 'United States',
        source: 'Google', timestamp: now - 2 * day, points: 0, comments: 0, author: 'google',
      },
      {
        id: 'c3', title: 'AWS re:Invent — Las Vegas',
        description: 'Amazon Web Services annual conference with 60,000+ cloud professionals, launches, and deep dives.',
        url: 'https://reinvent.awsevents.com', type: 'conference', country: 'US', countryName: 'United States',
        source: 'AWS', timestamp: now - 3 * day, points: 0, comments: 0, author: 'aws',
      },
      {
        id: 'c4', title: 'KubeCon + CloudNativeCon — Amsterdam',
        description: 'The Cloud Native Computing Foundation flagship conference co-located with KubeCon.',
        url: 'https://events.linuxfoundation.org', type: 'conference', country: 'NL', countryName: 'Netherlands',
        source: 'CNCF', timestamp: now - 4 * day, points: 0, comments: 0, author: 'cncf',
      },
      {
        id: 'c5', title: 'Tech in Asia Conference — Singapore',
        description: 'Asia\'s premier startup conference connecting tech founders, investors, and ecosystem players.',
        url: 'https://techinasia.com', type: 'conference', country: 'SG', countryName: 'Singapore',
        source: 'TechInAsia', timestamp: now - 5 * day, points: 0, comments: 0, author: 'tia',
      },
    ];
  }

  // ── Security seed fallback ────────────────────────────────────────────────
  function getSecuritySeeds(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });
    const now = Date.now();
    const day = 86400000;
    return [
      {
        id: 's1', title: 'Critical CVE in Popular npm Package Exposes Millions',
        description: 'Security researchers discovered a critical remote code execution vulnerability affecting over 2 million projects.',
        url: 'https://nvd.nist.gov', type: 'security', country: 'US', countryName: 'United States',
        source: 'NVD', timestamp: now - 1 * day, points: 0, comments: 0, author: 'security-researcher',
      },
      {
        id: 's2', title: 'Major Data Breach Hits European Healthcare System',
        description: 'Personal health records of 1.2 million patients exposed in a ransomware attack on German hospital network.',
        url: 'https://www.bsi.bund.de', type: 'security', country: 'DE', countryName: 'Germany',
        source: 'BSI', timestamp: now - 2 * day, points: 0, comments: 0, author: 'bsi',
      },
      {
        id: 's3', title: 'Zero-Day Exploit Found in iOS — Patch Released',
        description: 'Apple released emergency security patches for a zero-day vulnerability actively exploited in the wild.',
        url: 'https://support.apple.com', type: 'security', country: 'US', countryName: 'United States',
        source: 'Apple Security', timestamp: now - 3 * day, points: 0, comments: 0, author: 'apple',
      },
      {
        id: 's4', title: 'Russian APT Group Targets Ukraine Infrastructure',
        description: 'CERT-UA reports coordinated cyberattacks against critical infrastructure targeting energy and communications.',
        url: 'https://cert.gov.ua', type: 'security', country: 'UA', countryName: 'Ukraine',
        source: 'CERT-UA', timestamp: now - 2 * day, points: 0, comments: 0, author: 'cert-ua',
      },
      {
        id: 's5', title: 'New Malware Campaign Targets Singapore Banks',
        description: 'Banking trojan campaign discovered targeting online banking customers in Singapore via SMS phishing.',
        url: 'https://csa.gov.sg', type: 'security', country: 'SG', countryName: 'Singapore',
        source: 'CSA Singapore', timestamp: now - 4 * day, points: 0, comments: 0, author: 'csa',
      },
    ];
  }

  // ── Fetch hackathons from Devpost API ─────────────────────────────────────
  async function fetchHackathons(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });
    const events = [];

    try {
      const res = await fetchWithProxy(
        'https://devpost.com/api/hackathons?status=open&order_by=deadline&per_page=20'
      );
      const data = await res.json();
      const hackathons = data.hackathons || [];

      for (const h of hackathons) {
        const locationText = [h.title, h.location, (h.themes || []).map(t => t.name).join(' ')].join(' ');
        let countryCode = detectCountry(locationText) || 'US';
        const countryName = countryMap[countryCode]?.name || countryCode;

        let timestamp = Date.now();
        if (h.submission_period_dates) {
          const datePart = h.submission_period_dates.split(' - ')[0].trim();
          const parsed = Date.parse(datePart);
          if (!isNaN(parsed)) timestamp = parsed;
        } else if (h.created_at) {
          const parsed = Date.parse(h.created_at);
          if (!isNaN(parsed)) timestamp = parsed;
        }

        events.push({
          id: `devpost-${h.id || Utils.uid()}`,
          title: h.title || 'Hackathon',
          description: Utils.truncate(h.tagline || h.title || '', 300),
          url: h.url || 'https://devpost.com',
          type: 'hackathon',
          country: countryCode,
          countryName,
          source: 'Devpost',
          timestamp,
          points: h.registrations_count || 0,
          comments: 0,
          author: h.organization_name || 'devpost',
        });
      }

      if (events.length > 0) {
        console.log(`[API] Devpost: loaded ${events.length} hackathons`);
        return events;
      }
    } catch (err) {
      console.warn('[API] Devpost fetch failed:', err.message);
    }

    console.log('[API] Hackathons: falling back to seed data');
    return getHackathonSeeds(countries);
  }

  // ── Fetch security events from NVD and CISA ───────────────────────────────
  async function fetchSecurityEvents(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });
    const events = [];
    const seenIds = new Set();

    // NVD CVE API
    try {
      const res = await fetchWithProxy(
        'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=10'
      );
      const data = await res.json();
      const vulns = data.vulnerabilities || [];

      for (const vuln of vulns) {
        const cve = vuln.cve;
        if (!cve) continue;
        const cveId = cve.id || '';
        if (seenIds.has(cveId)) continue;
        seenIds.add(cveId);

        const desc = (cve.descriptions || []).find(d => d.lang === 'en')?.value || '';
        const severity =
          cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ||
          cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity ||
          cve.metrics?.cvssMetricV2?.[0]?.baseSeverity || '';

        let countryCode = detectCountry(desc) || 'US';
        const countryName = countryMap[countryCode]?.name || 'United States';
        const timestamp = cve.published ? new Date(cve.published).getTime() : Date.now();
        const severityLabel = severity ? ` [${severity}]` : '';

        events.push({
          id: `nvd-${cveId}`,
          title: `${cveId}${severityLabel}: ${Utils.truncate(desc, 80)}`,
          description: Utils.truncate(desc, 300),
          url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
          type: 'security',
          country: countryCode,
          countryName,
          source: 'NVD',
          timestamp,
          points: 0,
          comments: 0,
          author: 'nvd',
        });
      }
      console.log(`[API] NVD: loaded ${events.length} CVEs`);
    } catch (err) {
      console.warn('[API] NVD fetch failed:', err.message);
    }

    // CISA Known Exploited Vulnerabilities
    try {
      const res = await fetchWithProxy(
        'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
      );
      const data = await res.json();
      // Sort by dateAdded descending and take the 10 most recently added entries
      const latestVulns = (data.vulnerabilities || [])
        .slice()
        .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
        .slice(0, 10);

      for (const vuln of latestVulns) {
        const cveId = vuln.cveID || '';
        if (seenIds.has(`cisa-${cveId}`)) continue;
        seenIds.add(`cisa-${cveId}`);

        const desc = vuln.shortDescription || vuln.vulnerabilityName || '';
        const timestamp = vuln.dateAdded ? new Date(vuln.dateAdded).getTime() : Date.now();

        events.push({
          id: `cisa-${cveId || Utils.uid()}`,
          title: `CISA KEV: ${vuln.vulnerabilityName || cveId}`,
          description: Utils.truncate(
            `${desc} Required action: ${vuln.requiredAction || 'Apply patches immediately.'}`,
            300
          ),
          url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
          type: 'security',
          country: 'US',
          countryName: 'United States',
          source: 'CISA',
          timestamp,
          points: 0,
          comments: 0,
          author: 'cisa',
        });
      }
      console.log(`[API] CISA: loaded ${latestVulns.length} KEV entries`);
    } catch (err) {
      console.warn('[API] CISA fetch failed:', err.message);
    }

    if (events.length > 0) return events;

    console.log('[API] Security: falling back to seed data');
    return getSecuritySeeds(countries);
  }

  // ── Fetch conferences from GitHub-hosted confs.tech data ─────────────────
  async function fetchConferences(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });
    const events = [];

    // confs.tech publishes JSON per year/topic on GitHub raw
    const year = new Date().getFullYear();
    const topics = ['javascript', 'devops', 'security', 'ai', 'general'];
    const seen = new Set();

    for (const topic of topics) {
      if (events.length >= 15) break;
      try {
        const url = `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${year}/${topic}.json`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const confs = await res.json();
        if (!Array.isArray(confs)) continue;

        for (const conf of confs) {
          const key = (conf.name || '') + (conf.startDate || '');
          if (seen.has(key)) continue;
          seen.add(key);

          const locationText = [conf.name, conf.city, conf.country].filter(Boolean).join(' ');
          let countryCode = detectCountry(locationText);
          if (!countryCode && conf.country) {
            // Attempt a direct 2-letter country code match
            const upper = conf.country.toUpperCase();
            if (countryMap[upper]) countryCode = upper;
          }
          if (!countryCode) countryCode = 'US';
          const countryName = countryMap[countryCode]?.name || countryCode;

          const timestamp = conf.startDate ? new Date(conf.startDate).getTime() : Date.now();

          events.push({
            id: `confstech-${Utils.slugify(conf.name || topic)}-${conf.startDate || Utils.uid()}`,
            title: conf.name || 'Tech Conference',
            description: Utils.truncate(
              conf.description || `${conf.name} — ${conf.city || conf.country || 'TBD'}`,
              300
            ),
            url: conf.url || 'https://confs.tech',
            type: 'conference',
            country: countryCode,
            countryName,
            source: 'Confs.tech',
            timestamp,
            points: 0,
            comments: 0,
            author: 'confs.tech',
          });

          if (events.length >= 15) break;
        }
      } catch (err) {
        console.warn(`[API] Confs.tech fetch failed for ${topic}:`, err.message);
      }
    }

    if (events.length > 0) {
      console.log(`[API] Confs.tech: loaded ${events.length} conferences`);
      return events;
    }

    console.log('[API] Conferences: falling back to seed data');
    return getConferenceSeeds(countries);
  }

  // ── Fetch tech news from HN Algolia + Reddit ──────────────────────────────
  async function fetchTechNews(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });

    const queries = [
      { q: 'AI machine learning startup', defaultCountry: 'US' },
      { q: 'cybersecurity hack breach', defaultCountry: 'US' },
      { q: 'open source release launch', defaultCountry: 'US' },
      { q: 'tech company acquisition funding', defaultCountry: 'US' },
    ];

    const events = [];
    const seenIds = new Set();

    // HackerNews Algolia
    for (const { q, defaultCountry } of queries) {
      try {
        const hits = await fetchHNStories(q);
        for (const hit of hits.slice(0, 8)) {
          if (seenIds.has(hit.objectID)) continue;
          seenIds.add(hit.objectID);

          const text = `${hit.title || ''} ${hit.story_text || ''}`;
          let countryCode = detectCountry(text) || defaultCountry;
          if (!countryMap[countryCode]) countryCode = defaultCountry;

          events.push(hnHitToEvent(hit, countryCode, countryMap[countryCode]?.name || 'Global'));
        }
      } catch (err) {
        console.warn('[API] HN fetch failed for query:', q, err.message);
      }
    }

    // Reddit r/technology — free public JSON, no key required
    try {
      const res = await fetchWithProxy(
        'https://www.reddit.com/r/technology/top.json?t=day&limit=10'
      );
      const data = await res.json();
      const posts = (data?.data?.children || []).map(c => c.data).filter(Boolean);

      for (const post of posts) {
        const postId = `reddit-${post.id}`;
        if (seenIds.has(postId)) continue;
        seenIds.add(postId);

        const text = `${post.title || ''} ${post.selftext || ''}`;
        let countryCode = detectCountry(text) || 'US';
        if (!countryMap[countryCode]) countryCode = 'US';
        const type = classifyEvent(post.title, [], post.selftext || '');

        events.push({
          id: postId,
          title: post.title || 'Untitled',
          description: Utils.truncate(post.selftext || post.title || '', 300),
          url: post.url || `https://reddit.com${post.permalink}`,
          type,
          country: countryCode,
          countryName: countryMap[countryCode]?.name || 'Global',
          source: 'Reddit',
          timestamp: post.created_utc ? post.created_utc * 1000 : Date.now(),
          points: post.score || 0,
          comments: post.num_comments || 0,
          author: post.author || 'anonymous',
        });
      }
      console.log(`[API] Reddit: loaded ${posts.length} posts`);
    } catch (err) {
      console.warn('[API] Reddit fetch failed:', err.message);
    }

    return events;
  }

  // ── Main entry: load all events in parallel ───────────────────────────────
  async function loadAllEvents(countries) {
    const CACHE_KEY = 'techmap_events';
    const CACHE_TS_KEY = 'techmap_events_ts';
    const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

    const cachedTs = Utils.storageGet(CACHE_TS_KEY);
    if (Utils.isCacheFresh(cachedTs, CACHE_MAX_AGE)) {
      const cached = Utils.storageGet(CACHE_KEY);
      if (cached && cached.length > 0) {
        console.log('[API] Using cached events:', cached.length);
        return cached;
      }
    }

    const [hackathonsResult, securityResult, conferencesResult, newsResult] =
      await Promise.allSettled([
        fetchHackathons(countries),
        fetchSecurityEvents(countries),
        fetchConferences(countries),
        fetchTechNews(countries),
      ]);

    const allEvents = [
      ...(hackathonsResult.status === 'fulfilled' ? hackathonsResult.value : getHackathonSeeds(countries)),
      ...(securityResult.status === 'fulfilled'   ? securityResult.value   : getSecuritySeeds(countries)),
      ...(conferencesResult.status === 'fulfilled' ? conferencesResult.value : getConferenceSeeds(countries)),
      ...(newsResult.status === 'fulfilled'        ? newsResult.value        : []),
    ];

    Utils.storageSet(CACHE_KEY, allEvents);
    Utils.storageSet(CACHE_TS_KEY, Date.now());
    console.log('[API] Loaded events:', allEvents.length);
    return allEvents;
  }

  return { loadAllEvents, classifyEvent, detectCountry };
})();
