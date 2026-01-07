// Improved controllers/visitors.js
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const prisma = new PrismaClient();
const requestIp = require("request-ip"); // Add this package for better IP detection

// Add this to anonymize IP addresses
function anonymizeIp(ipAddress) {
  if (!ipAddress) return null;
  // Handle IPv4
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  // Handle IPv6
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':');
    return `${parts.slice(0, 4).join(':')}:0000:0000:0000:0000`;
  }
  return ipAddress;
}

// Helper function for development testing
function getMockLocation(ip) {
  // For localhost or development testing
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      city: 'Test City',
      country: 'Test Country',
      latitude: Math.random() * 180 - 90,  // Random latitude between -90 and 90
      longitude: Math.random() * 360 - 180 // Random longitude between -180 and 180
    };
  }
  return null;
}

const getVisitorChange = async (req, res) => {
  try {
    // Get today's visitors
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const today = await prisma.visitor.count({
      where: {
        timestamp: { gte: startOfToday },
      },
    });
    
    // Get visitors from the previous month
    const startOfLastMonth = new Date();
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    
    const lastMonth = await prisma.visitor.count({
      where: {
        timestamp: {
          gte: startOfLastMonth,
          lt: new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000), // yesterday
        },
      },
    });
    
    // Calculate percentage change
    const averageLastMonth = lastMonth / 30; // Normalize to daily average
    const percentageChange = averageLastMonth ? ((today - averageLastMonth) / averageLastMonth) * 100 : 0;
    
    res.json({ percentageChange: percentageChange.toFixed(1) });
  } catch (error) {
    console.error("Error calculating visitor change:", error);
    res.status(500).json({ error: "Failed to calculate visitor change" });
  }
};

const trackView = async (req, res) => {
  try {
    const ip = requestIp.getClientIp(req) || req.body.ip || 'unknown';
    const referrer = req.get('Referrer') || req.body.referrer;

    const userAgent = req.get('User-Agent') || '';
    if (userAgent.toLowerCase().includes('bot') || 
        userAgent.toLowerCase().includes('crawler') ||
        userAgent.toLowerCase().includes('spider')) {
      return res.status(200).json({ success: true, skipped: true, reason: 'bot' });
    }

    const cleanRef = referrer ? cleanReferrer(referrer) : "Direct";
    const category = referrer ? categorizeReferrer(referrer) : "Direct";

    // ❌ Anonymize IP for privacy
    // const anonymizedIp = anonymizeIp(ip);

    // ✅ Use full IP address instead
    const fullIp = ip;

    let location = null;
    const mockLocation = getMockLocation(ip);
    if (mockLocation) {
      location = mockLocation;
    } else {
      try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
        if (response.data.status === "success") {
          location = {
            city: response.data.city,
            country: response.data.country,
            latitude: response.data.lat,
            longitude: response.data.lon,
          };
        }
      } catch (error) {
        console.error("Geolocation error:", error.message);
      }
    }

    const visitor = await prisma.visitor.create({
      data: {
        ip: fullIp, 
        referrer: cleanRef,
        referrerCategory: category,
        city: location?.city,
        country: location?.country,
        latitude: location?.latitude,
        longitude: location?.longitude,
        path: req.body.path || req.originalUrl || '/',
      },
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('newVisitorAdded');
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error tracking visitor:", error);
    res.status(500).json({ error: "Failed to track view" });
  }
};

function cleanReferrer(referrer) {
  if (!referrer || referrer === "direct") return "Direct";
  try {
    const url = require("url");
    const parsed = url.parse(referrer);
    const hostname = parsed.hostname || referrer;
    return hostname.replace(/^www\./, "");
  } catch (error) {
    return "Unknown";
  }
}

function categorizeReferrer(referrer) {
  if (!referrer || referrer === "direct") return "Direct";
  
  const clean = cleanReferrer(referrer).toLowerCase();
  
  // Search engines
  if (clean.includes("google") || 
      clean.includes("bing") || 
      clean.includes("yahoo") || 
      clean.includes("duckduckgo") || 
      clean.includes("baidu") ||
      clean.includes("yandex")) {
    return "Organic Search";
  }
  
  // Social Media
  if (clean.includes("twitter") || 
      clean.includes("x.com") || 
      clean.includes("facebook") || 
      clean.includes("instagram") || 
      clean.includes("linkedin") || 
      clean.includes("pinterest") || 
      clean.includes("reddit") || 
      clean.includes("tiktok") ||
      clean.includes("youtube")) {
    return "Social Media";
  }
  
  // Email services
  if (clean.includes("gmail") || 
      clean.includes("outlook") || 
      clean.includes("yahoo") || 
      clean.includes("hotmail") ||
      clean.includes("mail.") ||
      clean.includes("mailchimp")) {
    return "Email";
  }
  
  // Ads
  if (clean.includes("ad.") || 
      clean.includes("ads.") || 
      clean.includes("adwords") || 
      clean.includes("doubleclick") ||
      clean.includes("campaign")) {
    return "Paid Ads";
  }
  
  return "Other";
}

module.exports = {
  getVisitorChange,
  trackView,
};