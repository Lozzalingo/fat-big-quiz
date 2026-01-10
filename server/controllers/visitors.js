/**
 * Comprehensive Visitor Analytics Controller
 * Handles visitor tracking, device detection, geolocation, and analytics
 */
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const prisma = new PrismaClient();
const requestIp = require("request-ip");

// IP Geolocation cache (24-hour TTL)
const geoCache = new Map();
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Get geolocation for IP address with caching
 */
async function getGeolocation(ip) {
  // Skip local/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' ||
      ip.startsWith('192.168.') || ip.startsWith('10.') ||
      ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
      ip === 'unknown') {
    return {
      city: 'Local',
      country: 'Local',
      region: null,
      latitude: null,
      longitude: null,
    };
  }

  // Check cache
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
    if (response.data.status === "success") {
      const data = {
        city: response.data.city,
        country: response.data.country,
        region: response.data.regionName,
        latitude: response.data.lat,
        longitude: response.data.lon,
      };
      geoCache.set(ip, { data, timestamp: Date.now() });
      return data;
    }
  } catch (error) {
    console.error("Geolocation error:", error.message);
  }

  return { city: null, country: null, region: null, latitude: null, longitude: null };
}

/**
 * Track a page view with comprehensive analytics data
 */
const trackView = async (req, res) => {
  try {
    const ip = requestIp.getClientIp(req) || req.body.ip || 'unknown';
    const userAgent = req.get('User-Agent') || req.body.userAgent || '';

    // Skip bots from user-agent header (server-side check)
    const uaLower = userAgent.toLowerCase();
    if (uaLower.includes('bot') && !req.body.isBot) {
      // Client didn't detect bot but server did - trust server
      req.body.isBot = true;
      req.body.botType = 'crawler';
    }

    // Get geolocation
    const geo = await getGeolocation(ip);

    // Extract all fields from request body
    const {
      // Session
      sessionId,
      sessionPageCount,
      isNewVisitor = true,

      // Device & Browser
      deviceType,
      deviceBrand,
      deviceConfidence,
      browser,
      browserVersion,
      os,
      osVersion,

      // Hardware
      screenWidth,
      screenHeight,
      viewportWidth,
      viewportHeight,
      pixelRatio,
      colorDepth,
      touchPoints,
      orientation,
      hardwareCores,
      deviceMemory,
      connectionType,

      // Fingerprinting
      fingerprint,
      canvasHash,
      webglHash,

      // Bot detection
      isBot = false,
      botType,
      jsEnabled = true,

      // Page timing
      pageLoadTime,
      timeOnPage,

      // UTM
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,

      // Event
      eventType = 'page_view',
      eventData,

      // E-commerce
      productViewed,
      addedToCart = false,
      checkoutStarted = false,
      purchaseComplete = false,
      orderValue,

      // Page info
      path,
      referrer,
      referrerCategory,
    } = req.body;

    // Create visitor record
    const visitor = await prisma.visitor.create({
      data: {
        ip,
        path: path || req.originalUrl || '/',
        referrer: referrer || req.get('Referrer') || null,
        referrerCategory: referrerCategory || categorizeReferrer(referrer || req.get('Referrer')),

        // Geo
        city: geo.city,
        country: geo.country,
        region: geo.region,
        latitude: geo.latitude,
        longitude: geo.longitude,

        // Session
        sessionId,
        sessionPageCount,
        isNewVisitor,

        // Device & Browser
        userAgent,
        deviceType,
        deviceBrand,
        deviceConfidence,
        browser,
        browserVersion,
        os,
        osVersion,

        // Hardware
        screenWidth,
        screenHeight,
        viewportWidth,
        viewportHeight,
        pixelRatio,
        colorDepth,
        touchPoints,
        orientation,
        hardwareCores,
        deviceMemory,
        connectionType,

        // Fingerprinting
        fingerprint,
        canvasHash,
        webglHash,

        // Bot detection
        isBot,
        botType,
        jsEnabled,

        // Page timing
        pageLoadTime,
        timeOnPage,

        // UTM
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,

        // Event
        eventType,
        eventData: eventData ? JSON.stringify(eventData) : null,

        // E-commerce
        productViewed,
        addedToCart,
        checkoutStarted,
        purchaseComplete,
        orderValue,
      },
    });

    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').emit('newVisitorAdded', {
        id: visitor.id,
        path: visitor.path,
        country: visitor.country,
        deviceType: visitor.deviceType,
        timestamp: visitor.timestamp,
      });
    }

    res.status(200).json({ success: true, visitorId: visitor.id });
  } catch (error) {
    console.error("Error tracking visitor:", error);
    res.status(500).json({ error: "Failed to track view" });
  }
};

/**
 * Update existing visitor record (for time on page, etc.)
 */
const updateVisitor = async (req, res) => {
  try {
    const { visitorId, timeOnPage, pageLoadTime, eventType } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: "Visitor ID required" });
    }

    await prisma.visitor.update({
      where: { id: visitorId },
      data: {
        timeOnPage,
        pageLoadTime,
        ...(eventType && { eventType }),
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating visitor:", error);
    res.status(500).json({ error: "Failed to update visitor" });
  }
};

/**
 * Track custom events (e-commerce, button clicks, etc.)
 */
const trackEvent = async (req, res) => {
  try {
    const ip = requestIp.getClientIp(req) || 'unknown';
    const {
      eventType,
      eventData,
      productViewed,
      addedToCart,
      checkoutStarted,
      purchaseComplete,
      orderValue,
      path,
    } = req.body;

    // Get session ID from the most recent visitor with this IP
    const recentVisitor = await prisma.visitor.findFirst({
      where: { ip },
      orderBy: { timestamp: 'desc' },
      select: { sessionId: true, fingerprint: true },
    });

    const visitor = await prisma.visitor.create({
      data: {
        ip,
        path: path || '/',
        eventType,
        eventData: eventData ? JSON.stringify(eventData) : null,
        productViewed,
        addedToCart: addedToCart || false,
        checkoutStarted: checkoutStarted || false,
        purchaseComplete: purchaseComplete || false,
        orderValue,
        sessionId: recentVisitor?.sessionId,
        fingerprint: recentVisitor?.fingerprint,
      },
    });

    res.status(200).json({ success: true, visitorId: visitor.id });
  } catch (error) {
    console.error("Error tracking event:", error);
    res.status(500).json({ error: "Failed to track event" });
  }
};

// Platform detection dictionaries
const SOCIAL_PLATFORMS = {
  'facebook.com': 'Facebook',
  'fb.me': 'Facebook',
  'fb.com': 'Facebook',
  'l.facebook.com': 'Facebook',
  'lm.facebook.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'l.instagram.com': 'Instagram',
  'twitter.com': 'Twitter/X',
  'x.com': 'Twitter/X',
  't.co': 'Twitter/X',
  'linkedin.com': 'LinkedIn',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'tiktok.com': 'TikTok',
  'pinterest.com': 'Pinterest',
  'reddit.com': 'Reddit',
  'redd.it': 'Reddit',
  'snapchat.com': 'Snapchat',
  'sc-cdn.net': 'Snapchat',
  'whatsapp.com': 'WhatsApp',
  'telegram.org': 'Telegram',
  't.me': 'Telegram',
  'discord.gg': 'Discord',
  'discord.com': 'Discord',
};

const SEARCH_ENGINES = {
  'google.com': 'Google',
  'google.co.uk': 'Google',
  'google.co.za': 'Google',
  'google.ca': 'Google',
  'google.com.au': 'Google',
  'google.de': 'Google',
  'google.fr': 'Google',
  'google.es': 'Google',
  'google.it': 'Google',
  'google.nl': 'Google',
  'google.be': 'Google',
  'google.ie': 'Google',
  'bing.com': 'Bing',
  'yahoo.com': 'Yahoo',
  'duckduckgo.com': 'DuckDuckGo',
  'yandex.com': 'Yandex',
  'yandex.ru': 'Yandex',
  'baidu.com': 'Baidu',
  'ecosia.org': 'Ecosia',
};

/**
 * Parse referrer and return specific platform info
 */
function parseReferrer(referrerUrl) {
  const result = {
    source: 'Direct',
    category: 'Direct',
    platform: null,
    isSocial: false,
    isSearch: false,
  };

  if (!referrerUrl) return result;

  const ref = referrerUrl.toLowerCase();

  // Internal navigation (same site) - treat as Direct
  if (/fatbigquiz\.com/i.test(ref)) {
    return result;
  }

  try {
    // Parse URL to get hostname
    let hostname = ref;
    if (ref.includes('://')) {
      hostname = ref.split('://')[1].split('/')[0];
    }
    hostname = hostname.replace('www.', '');

    // Check for Facebook click tracking (fbclid parameter)
    if (ref.includes('fbclid=')) {
      return {
        source: 'Facebook',
        category: 'Social Media',
        platform: 'Facebook',
        isSocial: true,
        isSearch: false,
      };
    }

    // Check for Instagram tracking (igshid parameter)
    if (ref.includes('igshid=') || ref.includes('utm_source=ig')) {
      return {
        source: 'Instagram',
        category: 'Social Media',
        platform: 'Instagram',
        isSocial: true,
        isSearch: false,
      };
    }

    // Check social media platforms
    for (const [domain, platform] of Object.entries(SOCIAL_PLATFORMS)) {
      if (hostname.includes(domain) || hostname === domain) {
        return {
          source: platform,
          category: 'Social Media',
          platform: platform,
          isSocial: true,
          isSearch: false,
        };
      }
    }

    // Check search engines
    for (const [domain, engine] of Object.entries(SEARCH_ENGINES)) {
      if (hostname.includes(domain) || hostname === domain) {
        return {
          source: engine,
          category: 'Organic Search',
          platform: engine,
          isSocial: false,
          isSearch: true,
        };
      }
    }

    // Check for email
    if (/mail\.|gmail\.|outlook\.|mailchimp\.|campaign-archive/i.test(ref)) {
      return {
        source: 'Email',
        category: 'Email',
        platform: 'Email',
        isSocial: false,
        isSearch: false,
      };
    }

    // Check for paid ads
    if (/googleads\.|doubleclick\.|googlesyndication\.|ads\.|ad\./i.test(ref)) {
      return {
        source: 'Google Ads',
        category: 'Paid Ads',
        platform: 'Google Ads',
        isSocial: false,
        isSearch: false,
      };
    }

    // Other referral - extract domain name for display
    const displayName = hostname.split('.')[0];
    return {
      source: hostname,
      category: 'Referral',
      platform: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      isSocial: false,
      isSearch: false,
    };

  } catch (e) {
    return {
      source: 'Referral',
      category: 'Referral',
      platform: null,
      isSocial: false,
      isSearch: false,
    };
  }
}

/**
 * Categorize referrer source (for backward compatibility)
 */
function categorizeReferrer(referrer) {
  const parsed = parseReferrer(referrer);
  return parsed.category;
}

/**
 * Get visitor change percentage
 */
const getVisitorChange = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCount = await prisma.visitor.count({
      where: {
        timestamp: { gte: startOfToday },
        isBot: { not: true },
      },
    });

    // Get yesterday's count for comparison
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const yesterdayCount = await prisma.visitor.count({
      where: {
        timestamp: { gte: startOfYesterday, lt: startOfToday },
        isBot: { not: true },
      },
    });

    const percentageChange = yesterdayCount > 0
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
      : 0;

    res.json({
      todayCount,
      yesterdayCount,
      percentageChange: percentageChange.toFixed(1)
    });
  } catch (error) {
    console.error("Error calculating visitor change:", error);
    res.status(500).json({ error: "Failed to calculate visitor change" });
  }
};

/**
 * Get overview statistics
 */
const getOverviewStats = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Simple where clause that allows old data (null isBot)
    const whereClause = {
      timestamp: { gte: startDate },
      isBot: { not: true },
    };

    // Total page views
    const totalPageViews = await prisma.visitor.count({
      where: whereClause,
    });

    // Unique visitors (by fingerprint or sessionId)
    const uniqueVisitors = await prisma.visitor.groupBy({
      by: ['fingerprint'],
      where: { ...whereClause, fingerprint: { not: null } },
    });

    // New vs returning visitors
    const newVisitors = await prisma.visitor.count({
      where: { ...whereClause, isNewVisitor: true },
    });

    // Average session duration
    const avgSessionTime = await prisma.visitor.aggregate({
      _avg: { timeOnPage: true },
      where: { ...whereClause, timeOnPage: { not: null } },
    });

    // Average pages per session
    const avgPagesPerSession = await prisma.visitor.aggregate({
      _avg: { sessionPageCount: true },
      where: { ...whereClause, sessionPageCount: { not: null } },
    });

    // Bounce rate (sessions with only 1 page)
    const singlePageSessions = await prisma.visitor.count({
      where: { ...whereClause, sessionPageCount: 1 },
    });

    const bounceRate = totalPageViews > 0
      ? ((singlePageSessions / totalPageViews) * 100).toFixed(1)
      : 0;

    res.json({
      totalPageViews,
      uniqueVisitors: uniqueVisitors.length,
      newVisitors,
      returningVisitors: uniqueVisitors.length - newVisitors,
      avgSessionDuration: Math.round(avgSessionTime._avg.timeOnPage || 0),
      avgPagesPerSession: (avgPagesPerSession._avg.sessionPageCount || 0).toFixed(1),
      bounceRate,
    });
  } catch (error) {
    console.error("Error getting overview stats:", error);
    res.status(500).json({ error: "Failed to get overview stats" });
  }
};

/**
 * Get device breakdown
 */
const getDeviceStats = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Simple where clause - don't filter by isBot/eventType for groupBy
    // as old data doesn't have these fields and Prisma groupBy struggles with OR
    const whereClause = {
      timestamp: { gte: startDate },
      isBot: { not: true }, // Excludes bots but allows null (old data)
    };

    // Device types
    const deviceTypes = await prisma.visitor.groupBy({
      by: ['deviceType'],
      where: whereClause,
      _count: { deviceType: true },
    });

    // Browsers
    const browsers = await prisma.visitor.groupBy({
      by: ['browser'],
      where: { ...whereClause, browser: { not: null } },
      _count: { browser: true },
      orderBy: { _count: { browser: 'desc' } },
      take: 10,
    });

    // Operating systems
    const operatingSystems = await prisma.visitor.groupBy({
      by: ['os'],
      where: { ...whereClause, os: { not: null } },
      _count: { os: true },
      orderBy: { _count: { os: 'desc' } },
      take: 10,
    });

    // Device brands
    const deviceBrands = await prisma.visitor.groupBy({
      by: ['deviceBrand'],
      where: { ...whereClause, deviceBrand: { not: null } },
      _count: { deviceBrand: true },
      orderBy: { _count: { deviceBrand: 'desc' } },
      take: 10,
    });

    // Screen resolutions - handle old data without eventType
    let screenResolutions = [];
    try {
      const rawResolutions = await prisma.$queryRaw`
        SELECT CONCAT(screenWidth, 'x', screenHeight) as resolution, COUNT(*) as count
        FROM Visitor
        WHERE timestamp >= ${startDate}
          AND (isBot = 0 OR isBot IS NULL)
          AND (eventType = 'page_view' OR eventType IS NULL)
          AND screenWidth IS NOT NULL AND screenHeight IS NOT NULL
        GROUP BY screenWidth, screenHeight
        ORDER BY count DESC
        LIMIT 10
      `;
      // Convert BigInt to Number for JSON serialization
      screenResolutions = rawResolutions.map(r => ({
        resolution: r.resolution,
        count: Number(r.count),
      }));
    } catch (err) {
      console.error("Screen resolution query error:", err.message);
    }

    res.json({
      deviceTypes: deviceTypes.map(d => ({ name: d.deviceType || 'Unknown', count: d._count.deviceType })),
      browsers: browsers.map(b => ({ name: b.browser, count: b._count.browser })),
      operatingSystems: operatingSystems.map(o => ({ name: o.os, count: o._count.os })),
      deviceBrands: deviceBrands.map(d => ({ name: d.deviceBrand, count: d._count.deviceBrand })),
      screenResolutions,
    });
  } catch (error) {
    console.error("Error getting device stats:", error);
    res.status(500).json({ error: "Failed to get device stats" });
  }
};

/**
 * Get geographic data
 */
const getGeographicStats = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Simple where clause that allows old data (null isBot/eventType)
    const whereClause = {
      timestamp: { gte: startDate },
      isBot: { not: true },
    };

    // Countries
    const countries = await prisma.visitor.groupBy({
      by: ['country'],
      where: { ...whereClause, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 20,
    });

    // Cities
    const cities = await prisma.visitor.groupBy({
      by: ['city', 'country'],
      where: { ...whereClause, city: { not: null } },
      _count: { city: true },
      orderBy: { _count: { city: 'desc' } },
      take: 20,
    });

    // Get visitor locations for map
    const locations = await prisma.visitor.findMany({
      where: { ...whereClause, latitude: { not: null }, longitude: { not: null } },
      select: { latitude: true, longitude: true, city: true, country: true },
      take: 500,
    });

    res.json({
      countries: countries.map(c => ({ name: c.country, count: c._count.country })),
      cities: cities.map(c => ({ name: `${c.city}, ${c.country}`, count: c._count.city })),
      locations,
    });
  } catch (error) {
    console.error("Error getting geographic stats:", error);
    res.status(500).json({ error: "Failed to get geographic stats" });
  }
};

/**
 * Get traffic timeline
 */
const getTrafficTimeline = async (req, res) => {
  try {
    const { timeRange = 'week' } = req.query;
    const startDate = getStartDate(timeRange);

    // Group by date - handle old data without eventType
    let timeline = [];
    try {
      const rawTimeline = await prisma.$queryRaw`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as pageViews,
          COUNT(DISTINCT fingerprint) as uniqueVisitors,
          SUM(CASE WHEN isNewVisitor = 1 THEN 1 ELSE 0 END) as newVisitors
        FROM Visitor
        WHERE timestamp >= ${startDate}
          AND (isBot = 0 OR isBot IS NULL)
          AND (eventType = 'page_view' OR eventType IS NULL)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `;
      // Convert BigInt to Number for JSON serialization
      timeline = rawTimeline.map(t => ({
        date: t.date,
        pageViews: Number(t.pageViews),
        uniqueVisitors: Number(t.uniqueVisitors),
        newVisitors: Number(t.newVisitors || 0),
      }));
    } catch (err) {
      console.error("Timeline query error:", err.message);
    }

    res.json({ timeline });
  } catch (error) {
    console.error("Error getting traffic timeline:", error);
    res.status(500).json({ error: "Failed to get traffic timeline" });
  }
};

/**
 * Get referrer/traffic source data with specific platform breakdown
 */
const getReferrerStats = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Simple where clause that allows old data (null isBot/eventType)
    const whereClause = {
      timestamp: { gte: startDate },
      isBot: { not: true },
    };

    // Get all referrers with counts
    const rawReferrers = await prisma.visitor.groupBy({
      by: ['referrer'],
      where: whereClause,
      _count: { referrer: true },
    });

    // Parse each referrer and aggregate by platform
    const platformCounts = {};
    const categoryCounts = {};
    let totalVisits = 0;

    rawReferrers.forEach(r => {
      const count = r._count.referrer;
      totalVisits += count;

      const parsed = parseReferrer(r.referrer);
      const platform = parsed.source;
      const category = parsed.category;

      // Aggregate by platform (Facebook, Google, Instagram, etc.)
      platformCounts[platform] = (platformCounts[platform] || 0) + count;

      // Aggregate by category (Social Media, Organic Search, etc.)
      categoryCounts[category] = (categoryCounts[category] || 0) + count;
    });

    // Sort platforms by count
    const sortedPlatforms = Object.entries(platformCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Sort categories by count
    const sortedCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Get social media breakdown
    const socialPlatforms = sortedPlatforms.filter(p => {
      const parsed = parseReferrer(p.name);
      // Check if original source was a social platform
      return parsed.isSocial || ['Facebook', 'Instagram', 'Twitter/X', 'Snapchat', 'TikTok', 'YouTube', 'LinkedIn', 'Pinterest', 'Reddit', 'WhatsApp', 'Telegram', 'Discord'].includes(p.name);
    });

    // Get search engine breakdown
    const searchEngines = sortedPlatforms.filter(p => {
      const parsed = parseReferrer(p.name);
      return parsed.isSearch || ['Google', 'Bing', 'Yahoo', 'DuckDuckGo', 'Yandex', 'Baidu', 'Ecosia'].includes(p.name);
    });

    // UTM sources
    const utmSources = await prisma.visitor.groupBy({
      by: ['utmSource', 'utmMedium', 'utmCampaign'],
      where: { ...whereClause, utmSource: { not: null } },
      _count: { utmSource: true },
      orderBy: { _count: { utmSource: 'desc' } },
      take: 20,
    });

    res.json({
      // Categories (Direct, Social Media, Organic Search, etc.)
      categories: sortedCategories,
      // All platforms sorted by count (Facebook, Google, Direct, Instagram, etc.)
      platforms: sortedPlatforms.slice(0, 20),
      // Social media breakdown (Facebook, Instagram, Snapchat, etc.)
      socialPlatforms: socialPlatforms,
      // Search engines breakdown (Google, Bing, Yahoo, etc.)
      searchEngines: searchEngines,
      // Raw referrer URLs (for debugging/detail view)
      referrers: sortedPlatforms.filter(p => p.name !== 'Direct').slice(0, 20),
      // UTM campaign data
      utmSources: utmSources.map(u => ({
        source: u.utmSource,
        medium: u.utmMedium,
        campaign: u.utmCampaign,
        count: u._count.utmSource,
      })),
      // Total for percentage calculations
      totalVisits,
    });
  } catch (error) {
    console.error("Error getting referrer stats:", error);
    res.status(500).json({ error: "Failed to get referrer stats" });
  }
};

/**
 * Get top pages
 */
const getTopPages = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Simple where clause that allows old data (null isBot/eventType)
    const pages = await prisma.visitor.groupBy({
      by: ['path'],
      where: {
        timestamp: { gte: startDate },
        isBot: { not: true },
        path: { not: null },
      },
      _count: { path: true },
      _avg: { timeOnPage: true },
      orderBy: { _count: { path: 'desc' } },
      take: 20,
    });

    res.json({
      pages: pages.map(p => ({
        path: p.path,
        views: p._count.path,
        avgTimeOnPage: Math.round(p._avg.timeOnPage || 0),
      })),
    });
  } catch (error) {
    console.error("Error getting top pages:", error);
    res.status(500).json({ error: "Failed to get top pages" });
  }
};

/**
 * Get e-commerce funnel stats
 */
const getEcommerceFunnel = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Simple where clause that allows old data (null isBot)
    const whereClause = {
      timestamp: { gte: startDate },
      isBot: { not: true },
    };

    // Product views
    const productViews = await prisma.visitor.count({
      where: { ...whereClause, eventType: 'product_view' },
    });

    // Add to cart
    const addedToCart = await prisma.visitor.count({
      where: { ...whereClause, addedToCart: true },
    });

    // Checkout started
    const checkoutStarted = await prisma.visitor.count({
      where: { ...whereClause, checkoutStarted: true },
    });

    // Purchases
    const purchases = await prisma.visitor.count({
      where: { ...whereClause, purchaseComplete: true },
    });

    // Total revenue
    const revenue = await prisma.visitor.aggregate({
      _sum: { orderValue: true },
      where: { ...whereClause, purchaseComplete: true },
    });

    // Top viewed products
    const topProducts = await prisma.visitor.groupBy({
      by: ['productViewed'],
      where: { ...whereClause, productViewed: { not: null } },
      _count: { productViewed: true },
      orderBy: { _count: { productViewed: 'desc' } },
      take: 10,
    });

    res.json({
      funnel: {
        productViews,
        addedToCart,
        checkoutStarted,
        purchases,
      },
      conversionRates: {
        viewToCart: productViews > 0 ? ((addedToCart / productViews) * 100).toFixed(1) : 0,
        cartToCheckout: addedToCart > 0 ? ((checkoutStarted / addedToCart) * 100).toFixed(1) : 0,
        checkoutToPurchase: checkoutStarted > 0 ? ((purchases / checkoutStarted) * 100).toFixed(1) : 0,
        overall: productViews > 0 ? ((purchases / productViews) * 100).toFixed(2) : 0,
      },
      totalRevenue: revenue._sum.orderValue || 0,
      topProducts: topProducts.map(p => ({ productId: p.productViewed, views: p._count.productViewed })),
    });
  } catch (error) {
    console.error("Error getting e-commerce funnel:", error);
    res.status(500).json({ error: "Failed to get e-commerce funnel" });
  }
};

/**
 * Get recent activity
 */
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Simple where clause that allows old data (null isBot)
    const activities = await prisma.visitor.findMany({
      where: {
        isBot: { not: true },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        path: true,
        eventType: true,
        eventData: true,
        country: true,
        city: true,
        deviceType: true,
        browser: true,
        os: true,
        timestamp: true,
        referrerCategory: true,
      },
    });

    res.json({ activities });
  } catch (error) {
    console.error("Error getting recent activity:", error);
    res.status(500).json({ error: "Failed to get recent activity" });
  }
};

/**
 * Get bot vs human breakdown
 */
const getBotStats = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Bot count
    const botCount = await prisma.visitor.count({
      where: {
        timestamp: { gte: startDate },
        isBot: true,
      },
    });

    // Human count (isBot = false or null for old data)
    const humanCount = await prisma.visitor.count({
      where: {
        timestamp: { gte: startDate },
        isBot: { not: true },
      },
    });

    // Bot types breakdown
    const botTypes = await prisma.visitor.groupBy({
      by: ['botType'],
      where: {
        timestamp: { gte: startDate },
        isBot: true,
        botType: { not: null },
      },
      _count: { botType: true },
      orderBy: { _count: { botType: 'desc' } },
    });

    res.json({
      humanCount,
      botCount,
      total: humanCount + botCount,
      botPercentage: ((botCount / (humanCount + botCount)) * 100).toFixed(1),
      botTypes: botTypes.map(b => ({ type: b.botType, count: b._count.botType })),
    });
  } catch (error) {
    console.error("Error getting bot stats:", error);
    res.status(500).json({ error: "Failed to get bot stats" });
  }
};

/**
 * Get interaction/click stats
 */
const getInteractionStats = async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    const startDate = getStartDate(timeRange);

    // Get all interaction events grouped by eventType
    const interactions = await prisma.visitor.groupBy({
      by: ['eventType'],
      where: {
        timestamp: { gte: startDate },
        isBot: { not: true },
        eventType: { not: null, notIn: ['page_view'] },
      },
      _count: { eventType: true },
      orderBy: { _count: { eventType: 'desc' } },
      take: 20,
    });

    // Get button clicks from eventData
    const buttonClicks = await prisma.visitor.findMany({
      where: {
        timestamp: { gte: startDate },
        isBot: { not: true },
        eventType: 'button_click',
        eventData: { not: null },
      },
      select: {
        eventData: true,
      },
    });

    // Parse button clicks and count by button name
    const buttonCounts = {};
    buttonClicks.forEach(click => {
      try {
        const data = typeof click.eventData === 'string'
          ? JSON.parse(click.eventData)
          : click.eventData;
        const buttonName = data?.buttonName || data?.button || 'Unknown';
        buttonCounts[buttonName] = (buttonCounts[buttonName] || 0) + 1;
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Sort buttons by count
    const sortedButtons = Object.entries(buttonCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({
      interactions: interactions.map(i => ({ type: i.eventType, count: i._count.eventType })),
      buttonClicks: sortedButtons,
    });
  } catch (error) {
    console.error("Error getting interaction stats:", error);
    res.status(500).json({ error: "Failed to get interaction stats" });
  }
};

/**
 * Helper: Get start date based on time range
 */
function getStartDate(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'yesterday':
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    case 'week':
      const week = new Date();
      week.setDate(week.getDate() - 7);
      week.setHours(0, 0, 0, 0);
      return week;
    case 'month':
      const month = new Date();
      month.setMonth(month.getMonth() - 1);
      month.setHours(0, 0, 0, 0);
      return month;
    case '3months':
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() - 3);
      threeMonths.setHours(0, 0, 0, 0);
      return threeMonths;
    default:
      return new Date(0); // All time
  }
}

module.exports = {
  trackView,
  updateVisitor,
  trackEvent,
  getVisitorChange,
  getOverviewStats,
  getDeviceStats,
  getGeographicStats,
  getTrafficTimeline,
  getReferrerStats,
  getTopPages,
  getEcommerceFunnel,
  getRecentActivity,
  getBotStats,
  getInteractionStats,
};
