// Captures 1920x1080 screenshots of the live local site for the intro video.
import { writeFileSync } from 'node:fs';
import { connect, wait } from './cdp.mjs';
const out = process.argv[2];
const B = 'http://localhost:5173';
const shots = [
  ['hero', `${B}/`, null],
  ['skills', `${B}/`, '#skills'],
  ['about', `${B}/about`, null],
  ['services', `${B}/services`, null],
  ['focusflow', `${B}/demos/focusflow/index.html`, null],
  ['budgetwise', `${B}/demos/budgetwise/index.html`, null],
  ['coursepilot', `${B}/demos/coursepilot/index.html`, null],
  ['certificates', `${B}/certificates`, null],
  ['contact', `${B}/contact`, null],
];
const c = await connect();
await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
for (const [name, url, anchor] of shots) {
  await c.send('Page.navigate', { url });
  await wait(3500);
  await c.evaluate(`try{localStorage.setItem('theme','dark')}catch(e){}; document.documentElement.dataset.theme='dark'; document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in')); ${anchor ? `document.querySelector('${anchor}')?.scrollIntoView(); window.scrollBy(0,-40);` : 'window.scrollTo(0,0);'} document.querySelector('.scroll-progress')?.remove(); true`);
  await wait(1600);
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(shot.data, 'base64'));
  console.log('captured', name);
}
c.close(); process.exit(0);
