/**
 * Replace Etsy links with FBQ shop links in blog posts
 * Reads mapping from the user's CSV and applies to local MySQL database
 */

const fs = require('fs');
const path = require('path');

// Ensure we load Prisma from the server directory
const serverDir = path.join(__dirname, '..', 'server');
process.chdir(serverDir);
const { PrismaClient } = require(path.join(serverDir, 'node_modules', '@prisma/client'));

const prisma = new PrismaClient();

async function main() {
  // Read the CSV mapping
  const csvPath = '/Users/laurencestephan/Desktop/etsy-to-fbq-mapping new.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');

  // Parse CSV - skip header
  const mappings = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const etsyUrl = parts[1]?.trim();
    const fbqUrl = parts[2]?.trim();

    if (etsyUrl && fbqUrl && etsyUrl !== '' && fbqUrl !== '') {
      mappings.push({ etsy: etsyUrl, fbq: fbqUrl });
    }
  }

  console.log(`[EtsyReplace] Loaded ${mappings.length} URL mappings from CSV`);

  // Get all blog posts
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, content: true }
  });

  console.log(`[EtsyReplace] Found ${posts.length} blog posts to process`);

  let totalReplacements = 0;
  let postsUpdated = 0;

  for (const post of posts) {
    let content = post.content;
    let replacementsInPost = 0;

    for (const mapping of mappings) {
      // Count occurrences before replacing
      const regex = new RegExp(escapeRegex(mapping.etsy), 'g');
      const matches = content.match(regex);
      if (matches) {
        replacementsInPost += matches.length;
        content = content.replace(regex, mapping.fbq);
      }
    }

    if (replacementsInPost > 0) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { content }
      });
      postsUpdated++;
      totalReplacements += replacementsInPost;
      console.log(`[EtsyReplace] Updated "${post.slug}" - ${replacementsInPost} link(s) replaced`);
    }
  }

  console.log(`\n[EtsyReplace] DONE`);
  console.log(`[EtsyReplace] Posts updated: ${postsUpdated}`);
  console.log(`[EtsyReplace] Total link replacements: ${totalReplacements}`);

  // Verify: check if any Etsy links remain
  const remaining = await prisma.$queryRaw`
    SELECT slug,
      (LENGTH(content) - LENGTH(REPLACE(content, 'etsy.com', ''))) / LENGTH('etsy.com') as etsy_count
    FROM BlogPost
    WHERE content LIKE '%etsy.com%'
    ORDER BY etsy_count DESC
  `;

  if (remaining.length > 0) {
    console.log(`\n[EtsyReplace] WARNING: ${remaining.length} posts still contain Etsy links:`);
    for (const r of remaining) {
      console.log(`  - ${r.slug}: ${r.etsy_count} remaining`);
    }
  } else {
    console.log(`\n[EtsyReplace] All Etsy links successfully replaced!`);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main()
  .catch(e => {
    console.error('[EtsyReplace] Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
