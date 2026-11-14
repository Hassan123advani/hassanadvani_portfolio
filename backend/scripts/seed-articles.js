#!/usr/bin/env node
/**
 * Seed the Writing section with starter articles — always as DRAFTS.
 *
 *   npm run seed-articles              # add the drafts that are missing
 *   npm run seed-articles -- --dry-run # only show what would be added
 *
 * Safe to run again: it only CREATES documents, skips any slug that already exists,
 * and uses Firestore's create() with fixed ids (seed-article-<slug>) so nothing is
 * ever overwritten. Every article is validated with the admin API's schema and
 * sanitized exactly like an article saved from the editor.
 */
import { services } from '../src/services/context.js';
import { postSchema } from '../src/schemas.js';
import { excerptFrom, readingTime, sanitizeRichText, slugify } from '../src/utils/text.js';
import { starterArticles } from './starter-articles.js';

const dryRun = process.argv.includes('--dry-run');

export function prepareStarter(raw) {
  const data = postSchema.parse({ ...raw, content: raw.content.trim(), status: 'draft', featured: false, publishedAt: null });
  const content = sanitizeRichText(data.content);
  return {
    ...data,
    slug: data.slug || slugify(data.title),
    content,
    excerpt: data.excerpt || excerptFrom(content),
    readingTime: data.readingTimeOverride || readingTime(content),
    status: 'draft',
    publishedAt: null,
    views: 0,
  };
}

async function main() {
  const db = services.db();
  const existing = await db.collection('posts').get();
  const taken = new Set(existing.docs.map((d) => d.data().slug).filter(Boolean));
  const now = new Date();
  const added = [];
  const skipped = [];

  for (const raw of starterArticles) {
    const data = prepareStarter(raw);
    if (taken.has(data.slug)) {
      skipped.push(`${data.title} (slug already used)`);
      continue;
    }
    const id = `seed-article-${data.slug}`.slice(0, 120);
    if (!dryRun) {
      try {
        await db.collection('posts').doc(id).create({ ...data, createdAt: now, updatedAt: now, createdBy: 'seed-articles', updatedBy: 'seed-articles' });
      } catch (err) {
        if (err.code === 6 /* ALREADY_EXISTS */) {
          skipped.push(`${data.title} (document ${id} already exists)`);
          continue;
        }
        throw err;
      }
      await db.collection('activityLogs').add({
        action: 'posts.create', targetType: 'posts', targetId: id, targetLabel: data.title,
        actorUid: null, actorEmail: null, actorName: 'seed-articles script', meta: { source: 'starter-articles.js' }, createdAt: now,
      });
    }
    taken.add(data.slug);
    added.push(`${data.title} [draft, ${data.readingTime} min] → posts/${id}`);
  }

  console.log(`\nStarter articles: ${added.length} ${dryRun ? 'would be added' : 'added'} as drafts, ${skipped.length} skipped`);
  added.forEach((x) => console.log(`  + ${x}`));
  skipped.forEach((x) => console.log(`  = ${x}`));
  if (dryRun) console.log('\nDry run: nothing was written.');
}

// Run only when executed directly (tests import prepareStarter without seeding anything).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed-articles.js')) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err.message);
      process.exit(1);
    });
}
