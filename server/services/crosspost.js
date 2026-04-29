/**
 * Social Media Crossposting Service
 * Posts blog articles to external platforms
 */

const PLATFORMS = {
  twitter: {
    name: 'Twitter/X',
    enabled: () => !!process.env.TWITTER_BEARER_TOKEN,
  },
  linkedin: {
    name: 'LinkedIn',
    enabled: () => !!process.env.LINKEDIN_ACCESS_TOKEN,
  },
};

/**
 * Strip HTML and truncate to character limit
 */
function htmlToPlainText(html, maxLen = 280) {
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
}

/**
 * Post to Twitter/X
 */
async function postToTwitter(article) {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    console.log('[Crosspost] Twitter not configured, skipping');
    return { success: false, reason: 'not_configured' };
  }

  const url = `https://fatbigquiz.com/blog/${article.slug}?utm_source=twitter&utm_medium=social&utm_campaign=crosspost`;
  const text = `${article.title}\n\n${url}`;

  try {
    console.log('[Crosspost] Posting to Twitter:', article.title);
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('[Crosspost] Twitter post successful:', data.data?.id);
      return { success: true, platform: 'twitter', postId: data.data?.id };
    } else {
      console.error('[Crosspost] Twitter error:', data);
      return { success: false, platform: 'twitter', error: data };
    }
  } catch (error) {
    console.error('[Crosspost] Twitter error:', error.message);
    return { success: false, platform: 'twitter', error: error.message };
  }
}

/**
 * Post to LinkedIn
 */
async function postToLinkedIn(article) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const authorUrn = process.env.LINKEDIN_AUTHOR_URN;
  if (!token || !authorUrn) {
    console.log('[Crosspost] LinkedIn not configured, skipping');
    return { success: false, reason: 'not_configured' };
  }

  const url = `https://fatbigquiz.com/blog/${article.slug}?utm_source=linkedin&utm_medium=social&utm_campaign=crosspost`;
  const excerpt = htmlToPlainText(article.excerpt || article.content || '', 500);

  try {
    console.log('[Crosspost] Posting to LinkedIn:', article.title);
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: `${article.title}\n\n${excerpt}` },
            shareMediaCategory: 'ARTICLE',
            media: [{
              status: 'READY',
              originalUrl: url,
              title: { text: article.title },
              description: { text: excerpt.substring(0, 200) },
            }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log('[Crosspost] LinkedIn post successful');
      return { success: true, platform: 'linkedin', postId: data.id };
    } else {
      const error = await res.text();
      console.error('[Crosspost] LinkedIn error:', error);
      return { success: false, platform: 'linkedin', error };
    }
  } catch (error) {
    console.error('[Crosspost] LinkedIn error:', error.message);
    return { success: false, platform: 'linkedin', error: error.message };
  }
}

/**
 * Crosspost an article to all configured platforms
 */
async function crosspostArticle(article) {
  console.log('[Crosspost] Starting crosspost for:', article.title);

  const results = [];

  if (PLATFORMS.twitter.enabled()) {
    results.push(await postToTwitter(article));
  }
  if (PLATFORMS.linkedin.enabled()) {
    results.push(await postToLinkedIn(article));
  }

  const succeeded = results.filter(r => r.success).length;
  console.log(`[Crosspost] Done: ${succeeded}/${results.length} platforms`);

  return results;
}

/**
 * Get status of configured platforms
 */
function getPlatformStatus() {
  return Object.entries(PLATFORMS).map(([key, p]) => ({
    platform: key,
    name: p.name,
    configured: p.enabled(),
  }));
}

module.exports = {
  crosspostArticle,
  getPlatformStatus,
  postToTwitter,
  postToLinkedIn,
};
