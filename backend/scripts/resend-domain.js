#!/usr/bin/env node
/**
 * Manage the Resend sending domain (needed for visitor auto-replies).
 *
 *   npm run resend-domain -- add yourdomain.com     # registers it and prints the DNS records to add
 *   npm run resend-domain -- status                 # lists domains and their verification state
 *   npm run resend-domain -- verify yourdomain.com  # asks Resend to re-check DNS now
 *
 * Requires a Resend key with full access (sending-only keys can't manage domains).
 */
import { env } from '../src/config/env.js';

const [cmd, name] = process.argv.slice(2);
const api = async (path, init = {}) => {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.mail.resendApiKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${body.name || ''}: ${body.message || 'request failed'}`);
  return body;
};

const printRecords = (d) => {
  console.log(`\n${d.name} - status: ${d.status}${d.region ? ` (region ${d.region})` : ''}`);
  if (!d.records?.length) return;
  console.log('\nAdd these DNS records at your domain registrar / DNS host:\n');
  for (const r of d.records) {
    console.log(`  [${r.status || 'pending'}] ${r.record} ${r.type}`);
    console.log(`     Name:  ${r.name}`);
    console.log(`     Value: ${r.value}`);
    if (r.priority !== undefined) console.log(`     Priority: ${r.priority}`);
    if (r.ttl) console.log(`     TTL: ${r.ttl}`);
  }
  console.log(`\nThen: npm run resend-domain -- verify ${d.name}`);
  console.log(`And set RESEND_FROM="Hassan Advani <hello@${d.name}>" in backend/.env.local (and in the deploy config).`);
};

try {
  if (!env.mail.resendApiKey) throw new Error('RESEND_API_KEY is not set in backend/.env.local');
  const list = await api('/domains');
  const find = (n) => list.data.find((d) => d.name === n);

  if (cmd === 'add' && name) {
    if (find(name)) printRecords(await api(`/domains/${find(name).id}`));
    else printRecords(await api('/domains', { method: 'POST', body: JSON.stringify({ name }) }));
  } else if (cmd === 'verify' && name) {
    const d = find(name);
    if (!d) throw new Error(`${name} is not registered - run "add" first`);
    await api(`/domains/${d.id}/verify`, { method: 'POST' });
    printRecords(await api(`/domains/${d.id}`));
  } else if (cmd === 'status' || !cmd) {
    if (!list.data.length) console.log('No sending domains registered. Visitor auto-replies are disabled until one is verified.');
    for (const d of list.data) printRecords(await api(`/domains/${d.id}`));
  } else {
    console.log('Usage: npm run resend-domain -- add|verify <domain>   or   npm run resend-domain -- status');
  }
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
