import { services } from './context.js';
import { env } from '../config/env.js';
import { toMillis } from '../utils/serialize.js';
import { stripHtml } from '../utils/text.js';

/**
 * Builds the ONLY facts the AI may use: published portfolio data that Hassan
 * manages in the admin panel (settings/profile, published projects and
 * certificates). Nothing from the visitor ever enters this text.
 */
const TTL = 5 * 60 * 1000;
let cache = { at: 0, value: null };

const published = (d) => d.status === 'published' && (!d.publishedAt || toMillis(d.publishedAt) <= Date.now());

export async function getKnowledge({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < TTL) return cache.value;
  const db = services.db();
  const [profileSnap, projectsSnap, certsSnap] = await Promise.all([
    db.collection('settings').doc('profile').get(),
    db.collection('projects').where('status', '==', 'published').get(),
    db.collection('certificates').where('status', '==', 'published').get(),
  ]);
  if (!profileSnap.exists) {
    cache = { at: Date.now(), value: null };
    return null; // no verified profile yet → AI must not answer
  }
  const p = profileSnap.data();
  const projects = projectsSnap.docs.map((d) => d.data()).filter(published).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const certs = certsSnap.docs.map((d) => d.data()).filter(published).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const site = env.siteUrl;
  const lines = [];
  lines.push(`Name: ${p.name}`);
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  if (p.availability) lines.push(`Availability: ${p.availability}`);
  if (p.email) lines.push(`Contact email: ${p.email}`);
  if (p.bio?.length) lines.push(`About:\n${p.bio.map((b) => `- ${b}`).join('\n')}`);
  if (p.education?.length)
    lines.push(`Education:\n${p.education.map((e) => `- ${[e.credential, e.institution, e.period, e.status].filter(Boolean).join(' | ')}`).join('\n')}`);
  lines.push(
    p.experience?.length
      ? `Work experience:\n${p.experience.map((x) => `- ${[x.role, x.organization, x.period].filter(Boolean).join(' | ')}: ${x.description || ''}`).join('\n')}`
      : 'Work experience: none listed yet (student; open to learning and collaboration).',
  );
  if (p.skills?.length)
    lines.push(`Skills (self-assessed):\n${p.skills.map((g) => `- ${g.group}: ${g.items.map((i) => i.name).join(', ')}`).join('\n')}`);
  if (p.learning?.length) lines.push(`Currently learning: ${p.learning.map((l) => l.title).join(', ')}`);
  if (p.services?.length)
    lines.push(`Services offered:\n${p.services.map((s) => `- ${s.title}: ${s.description}${s.deliverables?.length ? ` (${s.deliverables.join(', ')})` : ''}`).join('\n')}`);
  lines.push('Pricing, rates, timelines and availability dates: NOT published — Hassan discusses these personally.');
  if (projects.length)
    lines.push(
      `Projects:\n${projects
        .map((x) => `- ${x.title} (${[x.level, x.category].filter(Boolean).join(', ')}): ${x.summary} Tech: ${(x.techStack || []).join(', ')}. Page: ${site}/projects/${x.slug}${x.liveUrl ? `. Live demo: ${x.liveUrl.startsWith('/') ? site + x.liveUrl : x.liveUrl}` : ''}${x.githubUrl ? `. Code: ${x.githubUrl}` : ''}. Details: ${stripHtml(x.description || '').slice(0, 500)}`)
        .join('\n')}`,
    );
  if (certs.length)
    lines.push(`Certificates:\n${certs.map((c) => `- ${c.title} — ${[c.issuer, c.platform, c.issuedOn].filter(Boolean).join(', ')}`).join('\n')}`);
  if (p.socials?.length) lines.push(`Links:\n${p.socials.map((s) => `- ${s.label}: ${s.url}`).join('\n')}`);
  lines.push(`Website pages: ${site}/ , ${site}/projects , ${site}/about , ${site}/services , ${site}/certificates , ${site}/contact`);

  const allowedLinks = new Set([
    site,
    ...(p.socials || []).map((s) => s.url),
    ...projects.flatMap((x) => [x.githubUrl, x.liveUrl?.startsWith('/') ? site + x.liveUrl : x.liveUrl]),
  ].filter(Boolean));

  const value = { text: lines.join('\n\n'), allowedLinks: [...allowedLinks], ownerEmail: p.email || env.mail.notifyTo, ownerName: p.name };
  cache = { at: Date.now(), value };
  return value;
}

export const _resetKnowledgeCache = () => {
  cache = { at: 0, value: null };
};
