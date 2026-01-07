// scripts/test-visitor-tracking.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * This script simulates visitors to test your tracking system
 * Run it with: node scripts/test-visitor-tracking.js
 */

// Configuration
const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/track`; // Update to match your Next.js port (typically 3000)
const NUM_SIMULATIONS = 20; // Number of simulated visits
const DELAY_MS = 500; // Delay between simulations in milliseconds

// Sample referrers for testing
const referrers = [
  'https://www.google.com/search?q=your+website',
  'https://www.facebook.com/post/123',
  'https://twitter.com/someone/status/123',
  'https://www.linkedin.com/share/123',
  'https://mail.google.com/mail/123',
  'https://www.bing.com/search?q=your+website',
  'https://www.reddit.com/r/webdev/comments/123',
  'https://www.youtube.com/watch?v=123',
  null // Direct visit
];

// Sample user agents for testing
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 11; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
];

// Sample paths for testing
const paths = [
  '/',
  '/about',
  '/products',
  '/services',
  '/blog',
  '/contact',
  '/pricing',
  '/features',
  '/blog/how-to-optimize-your-website',
  '/blog/top-10-web-design-trends'
];

// Function to generate a random IP address
function getRandomIp() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

// Function to pick a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to simulate a visit
async function simulateVisit() {
  const ip = getRandomIp();
  const referrer = getRandomItem(referrers);
  const userAgent = getRandomItem(userAgents);
  const path = getRandomItem(paths);
  
  try {
    const response = await axios.post(API_URL, {
      ip: ip,
      referrer: referrer,
      path: path
    }, {
      headers: {
        'User-Agent': userAgent
      }
    });
    
    console.log(`✅ Visit simulated from IP: ${ip}`);
    console.log(`   Path: ${path}`);
    console.log(`   Referrer: ${referrer || 'Direct'}`);
    console.log(`   Status: ${response.status}`);
    console.log('-'.repeat(50));
    
    return response.data;
  } catch (error) {
    console.error(`❌ Error simulating visit: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    console.log('-'.repeat(50));
  }
}

// Main function to run the test
async function runTest() {
  console.log('🚀 Starting visitor tracking test');
  console.log('='.repeat(50));
  
  for (let i = 0; i < NUM_SIMULATIONS; i++) {
    console.log(`\nSimulating visit ${i + 1} of ${NUM_SIMULATIONS}`);
    await simulateVisit();
    
    // Add delay between simulations
    if (i < NUM_SIMULATIONS - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('\n='.repeat(50));
  console.log(`✅ Test completed with ${NUM_SIMULATIONS} simulated visits`);
  console.log('Check your admin dashboard to see the results!');
}

// Run the test
runTest();