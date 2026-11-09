// Renders one 3840x2160 PNG per scene from scene.html (needs Chrome running with --remote-debugging-port=9333).
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, wait } from './cdp.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const work = join(here, '.work');
const photo = join(here, '../../frontend/public/assets/profile.jpeg');
const types = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url === '/photo.jpeg' ? photo : url.startsWith('/shots/') ? join(work, normalize(url)) : join(here, normalize(url));
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
}).listen(5181);

const data = JSON.parse(readFileSync(join(here, 'script.json'), 'utf8'));
mkdirSync(join(work, 'frames'), { recursive: true });
const c = await connect();
await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 2, mobile: false });
for (const s of data.scenes) {
  await c.send('Page.navigate', { url: `http://localhost:5181/scene.html?scene=${s.id}&shots=/shots&photo=/photo.jpeg` });
  for (let i = 0; i < 40 && (await c.evaluate('document.body.dataset.ready')) !== '1'; i += 1) await wait(250);
  await wait(300);
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(work, 'frames', `${s.id}.png`), Buffer.from(shot.data, 'base64'));
  console.log('frame', s.id);
}
c.close();
server.close();
process.exit(0);
