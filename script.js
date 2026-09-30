const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];

const root = document.documentElement;

// Theme toggle
try {
  const t = localStorage.getItem('theme');
  if (t) root.dataset.theme = t;
} catch (e) {}

$('#theme').onclick = () => {
  const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch (e) {}
};

// Mobile menu
const links = $('#links'), ham = $('#ham');
ham.onclick = () => {
  const o = links.classList.toggle('open');
  ham.setAttribute('aria-expanded', o);
};
$$('#links a').forEach(a => a.onclick = () => {
  links.classList.remove('open');
  ham.setAttribute('aria-expanded', false);
});

// Sticky nav
const nav = $('#nav');
const sc = () => nav.classList.toggle('sc', scrollY > 30);
addEventListener('scroll', sc, { passive: true });
sc();

// Subjects data
const subs = [
  ['💻', 'Programming Fundamentals', 'C / C++ basics and how to think in code.'],
  ['🧩', 'Object-Oriented Programming', 'Classes, inheritance, and clean design.'],
  ['🌳', 'Data Structures & Algorithms', 'Organizing data and solving problems fast.'],
  ['🗄️', 'Database Systems', 'Storing and querying data with SQL.'],
  ['🖥️', 'Operating Systems', 'Processes, memory, and file systems.'],
  ['🌍', 'Computer Networks', 'How data moves across the internet.'],
  ['🛠️', 'Software Engineering', 'Planning, building, and testing software.'],
  ['🕸️', 'Web Technologies', 'Building modern websites and web apps.'],
  ['➗', 'Discrete Mathematics', 'Logic, sets, and graphs for computing.'],
  ['📐', 'Linear Algebra & Calculus', 'The math behind computing and graphics.'],
  ['🔌', 'Digital Logic Design', 'Gates, circuits, and binary logic.'],
  ['🏗️', 'Computer Architecture', 'How CPUs and memory really work.']
];

$('#sg').innerHTML = subs.map(s =>
  `<div class="glass sj rv"><div class="e">${s[0]}</div><h3>${s[1]}</h3><p>${s[2]}</p></div>`
).join('');

/* ============================================================
   📸 COURSE CERTIFICATE IMAGES — MAPPED TO YOUR ACTUAL FILES
   ============================================================
   Each entry below matches one Google certificate you uploaded.
   The image filenames match your existing files in the folder.
   ============================================================ */

const cs = [
  // 1 of 8 — Foundations of Digital Marketing and E-commerce
  [
    'Foundations of Digital Marketing and E-commerce',
    'cirtificate 2.png',
    'An introduction to digital marketing and e-commerce: how businesses reach customers online and the basics of selling on the web.'
  ],
  // 2 of 8 — Make the Sale: Build, Launch, and Manage E-commerce Stores
  [
    'Make the Sale: Build, Launch, and Manage E-commerce Stores',
    'cirtificate 3.png',
    'Setting up an online store, launching it, and managing it day to day.'
  ],
  // 3 of 8 — Satisfaction Guaranteed: Develop Customer Loyalty Online
  [
    'Satisfaction Guaranteed: Develop Customer Loyalty Online',
    'cirtificate 4.png',
    'Building customer satisfaction and loyalty so people come back after their first purchase.'
  ],
  // 4 of 8 — Assess for Success: Marketing Analytics and Measurement
  [
    'Assess for Success: Marketing Analytics and Measurement',
    'cirtificate 5.png',
    'Measuring how marketing performs and using data to decide what to improve.'
  ],
  // 5 of 8 — From Likes to Leads: Interact with Customers Online
  [
    'From Likes to Leads: Interact with Customers Online',
    'cirtificate 6.png',
    'Using social media and online conversations to build relationships that turn attention into real leads.'
  ],
  // 6 of 8 — Think Outside the Inbox: Email Marketing
  [
    'Think Outside the Inbox: Email Marketing',
    'cirtificate 7.png',
    'Planning and running email campaigns that reach the right people and get results.'
  ],
  // 7 of 8 — Attract and Engage Customers with Digital Marketing
  [
    'Attract and Engage Customers with Digital Marketing',
    'cirtificate 8.png',
    'How businesses draw customers in through digital channels and keep them interested once they arrive.'
  ],
  // 8 of 8 — Google AI Essentials
  [
    'Google AI Essentials',
    'cirtificate 9.png',
    'The basics of AI and how to use AI tools responsibly to work faster and smarter.'
  ]
];

// Render the 8 course certificate cards
$('#cgrid').innerHTML = cs.map((c, i) =>
  `<article class="glass cc rv">
    <div class="ci">
      <span class="no">${i + 1}</span>
      <div>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>
        <div>Add certificate image<br><small>${c[1]}</small></div>
      </div>
      <img src="${c[1]}" alt="${c[0]} certificate" loading="lazy" onerror="this.remove()">
    </div>
    <div class="cb">
      <h3>${c[0]}</h3>
      <div class="m">
        <span class="tag">Google</span>
        <span class="tag">Coursera</span>
        <span class="tag">Dec 27, 2024</span>
      </div>
      <p>${c[2]}</p>
    </div>
  </article>`
).join('');

// Reveal, bars, terminal
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  $$('.bar i', e.target).forEach(b => b.style.width = b.dataset.w + '%');
  io.unobserve(e.target);
}), { threshold: .15 });

$$('.rv').forEach(el => io.observe(el));

$$('.tb .l').forEach((l, i) => setTimeout(() => l.classList.add('on'), 700 + i * 420));

// Typing effect
const words = ['BSCS Student @ GU Tech', 'Web Developer', 'Python & C++ Programmer', 'Learning Every Day', 'Future Software Engineer'];
const out = $('#typed');
let w = 0, c = 0, del = false;

if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
  out.textContent = words[0];
} else {
  (function tick() {
    const full = words[w];
    c += del ? -1 : 1;
    out.textContent = full.slice(0, c);
    let d = del ? 40 : 85;
    if (!del && c === full.length) {
      del = true;
      d = 1600;
    } else if (del && c === 0) {
      del = false;
      w = (w + 1) % words.length;
      d = 400;
    }
    setTimeout(tick, d);
  })();
}

// Form validation
const fs = {
  nm: v => v.trim().length < 2 ? 'Please enter your name (at least 2 characters).' : '',
  em: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email address.',
  ms: v => v.trim().length < 10 ? 'Your message should be at least 10 characters.' : ''
};

function chk(id) {
  const el = $('#' + id),
    m = fs[id](el.value),
    f = el.parentElement;
  f.classList.toggle('bad', !!m);
  $('.err', f).textContent = m;
  return !m;
}

Object.keys(fs).forEach(id => $('#' + id).addEventListener('input', () => chk(id)));

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const ok = Object.keys(fs).map(chk).every(Boolean);
  if (!ok) return;
  $('#ok').style.display = 'block';
  e.target.reset();
  setTimeout(() => $('#ok').style.display = 'none', 5000);
});

// Progress bar + card spotlight
const pg = document.createElement('div');
pg.id = 'prog';
document.body.prepend(pg);

addEventListener('scroll', () => {
  pg.style.width = (scrollY / (document.body.scrollHeight - innerHeight) * 100) + '%';
}, { passive: true });

document.addEventListener('pointermove', e => {
  const g = e.target.closest && e.target.closest('.glass');
  if (!g) return;
  const r = g.getBoundingClientRect();
  g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  g.style.setProperty('--my', (e.clientY - r.top) + 'px');
});