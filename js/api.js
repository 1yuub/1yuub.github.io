/**
 * api.js — Data fetching and event generation
 *
 * Sources:
 *  - HackerNews Algolia API (free, no key)
 *  - Curated seed data (hackathons, conferences)
 */

const API = (() => {
  const HN_API = 'https://hn.algolia.com/api/v1';

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

  // Seed events for hackathons and conferences (static curated data)
  function getSeedEvents(countries) {
    const countryMap = {};
    countries.forEach(c => { countryMap[c.code] = c; });

    const now = Date.now();
    const day = 86400000;

    return [
      {
        id: 'h1', title: 'Global AI Hackathon 2025 — San Francisco',
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
        id: 'h4', title: 'HackIndia 2025 — Bangalore',
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
      {
        id: 'c1', title: 'Web Summit 2025 — Lisbon',
        description: 'The world\'s largest technology conference returns to Lisbon with 70,000+ attendees from 160 countries.',
        url: 'https://websummit.com', type: 'conference', country: 'PT', countryName: 'Portugal',
        source: 'WebSummit', timestamp: now - 1 * day, points: 0, comments: 0, author: 'websummit',
      },
      {
        id: 'c2', title: 'Google I/O 2025 — Mountain View',
        description: 'Google\'s annual developer conference showcasing Android, Google Cloud, AI/ML, and more.',
        url: 'https://io.google', type: 'conference', country: 'US', countryName: 'United States',
        source: 'Google', timestamp: now - 2 * day, points: 0, comments: 0, author: 'google',
      },
      {
        id: 'c3', title: 'AWS re:Invent 2025 — Las Vegas',
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

  // Fetch tech news from HN
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

    for (const { q, defaultCountry } of queries) {
      try {
        const hits = await fetchHNStories(q);
        for (const hit of hits.slice(0, 8)) {
          if (seenIds.has(hit.objectID)) continue;
          seenIds.add(hit.objectID);

          const text = `${hit.title || ''} ${hit.story_text || ''}`;
          let countryCode = detectCountry(text) || defaultCountry;
          const country = countryMap[countryCode];
          if (!country) countryCode = defaultCountry;

          const event = hnHitToEvent(hit, countryCode, countryMap[countryCode]?.name || 'Global');
          events.push(event);
        }
      } catch (err) {
        console.warn('HN fetch failed for query:', q, err.message);
      }
    }

    return events;
  }

  // Main entry: load all events
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

    const seedEvents = getSeedEvents(countries);
    let liveEvents = [];

    try {
      liveEvents = await fetchTechNews(countries);
    } catch (err) {
      console.warn('[API] Live fetch failed, using seed data only:', err.message);
    }

    // Merge: seed first, then live (deduplicate by title similarity)
    const allEvents = [...seedEvents, ...liveEvents];

    Utils.storageSet(CACHE_KEY, allEvents);
    Utils.storageSet(CACHE_TS_KEY, Date.now());
    console.log('[API] Loaded events:', allEvents.length);
    return allEvents;
  }

  return { loadAllEvents, classifyEvent, detectCountry };
})();
