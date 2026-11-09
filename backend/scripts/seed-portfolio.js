#!/usr/bin/env node
/**
 * Seed Firestore with the projects and certificates from the original site.
 *
 *   npm run seed-portfolio              # add what is missing
 *   npm run seed-portfolio -- --dry-run # only show what would be added
 *
 * Source: frontend/src/content/portfolio.json — the same content the old static site
 * showed (FocusFlow, BudgetWise, CoursePilot and the 9 Google/Coursera certificates).
 *
 * Safe to run again:
 *   - it only ever CREATES documents, it never updates or deletes anything;
 *   - a project is skipped if any project already has its slug;
 *   - a certificate is skipped if any certificate already has its title (case-insensitive);
 *   - documents use fixed ids (seed-project-<slug>, seed-cert-<slug>) and Firestore's
 *     create(), which refuses to overwrite an existing document.
 * Every item is validated with the same schema the admin API uses.
 */
import { readFileSync } from 'node:fs';
import { services } from '../src/services/context.js';
import { certificateSchema, projectSchema } from '../src/schemas.js';
import { sanitizeRichText, slugify } from '../src/utils/text.js';

const dryRun = process.argv.includes('--dry-run');
const source = JSON.parse(readFileSync(new URL('../../frontend/src/content/portfolio.json', import.meta.url), 'utf8'));
const norm = (s = '') => s.trim().toLowerCase().replace(/\s+/g, ' ');

const db = services.db();
const now = new Date();
const audit = { createdAt: now, updatedAt: now, createdBy: 'seed-portfolio', updatedBy: 'seed-portfolio' };

async function seed(collection, items, { schema, key, idPrefix, prepare = (d) => d }) {
  const existing = await db.collection(collection).get();
  const taken = new Set(existing.docs.map((d) => key(d.data())).filter(Boolean));
  const result = { added: [], skipped: [] };

  for (const raw of items) {
    const data = prepare(schema.parse(raw));
    const k = key(data);
    if (taken.has(k)) {
      result.skipped.push(`${data.title} (already in Firestore)`);
      continue;
    }
    const id = `${idPrefix}-${slugify(data.slug || data.title)}`;
    const doc = { ...data, ...audit, ...(data.status === 'published' && 'publishedAt' in data ? { publishedAt: data.publishedAt ? new Date(data.publishedAt) : now } : {}) };
    if (!dryRun) {
      try {
        await db.collection(collection).doc(id).create(doc);
      } catch (err) {
        if (err.code === 6 /* ALREADY_EXISTS */) {
          result.skipped.push(`${data.title} (document ${id} already exists)`);
          continue;
        }
        throw err;
      }
      await db.collection('activityLogs').add({
        action: `${collection}.create`, targetType: collection, targetId: id, targetLabel: data.title,
        actorUid: null, actorEmail: null, actorName: 'seed-portfolio script', meta: { source: 'portfolio.json' }, createdAt: now,
      });
    }
    taken.add(k);
    result.added.push(`${data.title} [${data.status}] → ${collection}/${id}`);
  }
  return result;
}

try {
  const projects = await seed('projects', source.projects, {
    schema: projectSchema,
    key: (d) => d.slug || slugify(d.title),
    idPrefix: 'seed-project',
    prepare: (d) => ({ ...d, slug: d.slug || slugify(d.title), description: sanitizeRichText(d.description) }),
  });
  const certificates = await seed('certificates', source.certificates, {
    schema: certificateSchema,
    key: (d) => norm(d.title),
    idPrefix: 'seed-cert',
  });

  for (const [name, r] of [['Projects', projects], ['Certificates', certificates]]) {
    console.log(`\n${name}: ${r.added.length} ${dryRun ? 'would be added' : 'added'}, ${r.skipped.length} skipped`);
    r.added.forEach((x) => console.log(`  + ${x}`));
    r.skipped.forEach((x) => console.log(`  = ${x}`));
  }
  if (dryRun) console.log('\nDry run: nothing was written.');
  process.exit(0);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
}
