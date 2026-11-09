# Portfolio Intro Video

**Status: produced and live on the home page** (`#intro-video`).

| File (in `frontend/public/video/`) | What |
| --- | --- |
| `intro-en.mp4` | 54.9 s, 1280×720 H.264 + AAC, 4.7 MB — English voice-over (`en-US-AndrewMultilingualNeural`) |
| `intro-ur.mp4` | 54.9 s, 4.6 MB — Urdu voice-over (`ur-PK-AsadNeural`) |
| `intro-en.en.vtt`, `intro-ur.en.vtt` | English captions, timed to each voice-over |
| `intro-poster.jpg` | Poster / thumbnail (scene 1) |
| `intro-manifest.json` | Durations, chapters, voices (written by the build) |

All facts come from `frontend/src/content/portfolio.json`. No pricing, timelines or years of experience
are mentioned. The voices are free Microsoft neural voices (via `edge-tts`); the visuals are real
screenshots of this website and its three project demos.

## Player behaviour
Starts **muted** only when scrolled into view (never with sound; respects reduced-motion and data-saver),
pauses when scrolled away, **Tap for sound / Mute** button, native controls, English captions on by
default, **English / اردو** voice-over switch (keeps the playback position), clickable chapters,
`preload="metadata"`, poster, `playsInline` for iOS. Tested at 1280 px and 390 px with real taps.

## Script & storyboard (English timings; Urdu in brackets)
| # | Time | On screen | Voice-over (EN) |
| --- | --- | --- | --- |
| 1 Hook | 0.0–3.9 s (0.0–6.0) | Dimmed home page, portrait, **"Hi, I'm Hassan. / I build websites."** — slow zoom in | Hi, I'm Hassan, and I build websites. |
| 2 About | 3.4–15.5 s (5.5–18.5) | Skills section in a browser window; title *Muhammad Hassan Advani*; bullets BSCS · GU Tech, Karachi / HTML · CSS · JavaScript / Learning Python · C · C++ — fade | I'm Muhammad Hassan Advani, a computer science student at GU Tech, Karachi. I build with HTML, CSS and JavaScript, and I'm learning Python, C and C plus plus. |
| 3 Services | 15.0–23.6 s (18.0–27.0) | Hire-me page; *How I can help*: Responsive websites / Small browser tools / Front-end fixes & polish / Open to collaboration | I build responsive websites and small browser tools, and fix and polish existing sites. I'm open to collaboration too. |
| 4 FocusFlow | 23.1–28.7 s (26.5–31.5) | FocusFlow demo; *Project 01 · Productivity* | My projects: FocusFlow, a task planner with a Pomodoro timer. |
| 5 BudgetWise | 28.2–32.4 s (31.0–34.5) | BudgetWise demo — slide left | BudgetWise, an income and spending tracker. |
| 6 CoursePilot | 31.9–36.8 s (34.0–38.3) | CoursePilot demo — slide left | And CoursePilot, a planner for student deadlines and grades. |
| 7 Certificates | 36.3–43.4 s (37.8–42.5) | Certificates page; *9 Google certificates*: Digital Marketing & E-commerce / Google AI Essentials / Completed on Coursera | I've also earned nine Google certificates on Coursera, including Google AI Essentials. |
| 8 Contact | 42.9–54.9 s (42.0–54.9) | Contact page; *Get in touch*: hassanadvani08@gmail.com / github.com/Hassan123advani / Contact form on my website | Let's work together. Email hassanadvani08@gmail.com, find me on GitHub as Hassan123advani, or use the contact form on my website. |

Every frame keeps the bottom ~180 px clear for captions. Transitions: 0.5 s crossfade (slide-left between
projects). Motion: alternating 6 % zoom in/out (Ken Burns). Brand: dark `#0c0d10`, lime `#d6ff5c`, amber glow,
Bricolage Grotesque / Inter / JetBrains Mono — the website's own design tokens.

## Voice-over text for ElevenLabs / Google TTS (copy-paste)
**English**
```
Hi, I'm Hassan, and I build websites.

I'm Muhammad Hassan Advani, a computer science student at GU Tech, Karachi. I build with HTML, CSS and JavaScript, and I'm learning Python, C and C plus plus.

I build responsive websites and small browser tools, and fix and polish existing sites. I'm open to collaboration too.

My projects: FocusFlow, a task planner with a Pomodoro timer.
BudgetWise, an income and spending tracker.
And CoursePilot, a planner for student deadlines and grades.

I've also earned nine Google certificates on Coursera, including Google AI Essentials.

Let's work together. Email hassan advani zero eight at gmail dot com, find me on GitHub as Hassan one two three Advani, or use the contact form on my website.
```

**Urdu (Urdu script — best for Urdu voices such as ur-PK-Asad / ElevenLabs Urdu)**
```
السلام علیکم! میں حسن ہوں، اور میں ویب سائٹس بناتا ہوں۔

میرا نام محمد حسن ایڈوانی ہے، اور میں جی یو ٹیک کراچی میں کمپیوٹر سائنس کا طالب علم ہوں۔ میں HTML، CSS اور JavaScript سے کام کرتا ہوں، اور Python اور C plus plus سیکھ رہا ہوں۔

میں ویب سائٹس اور براؤزر ٹولز بناتا ہوں، اور پرانی سائٹس کو بہتر کرتا ہوں۔ مل کر کام کرنے کے لیے بھی تیار ہوں۔

میرے پروجیکٹس: FocusFlow، پومودورو ٹائمر والا ٹاسک پلانر۔
BudgetWise، آمدنی اور خرچ کا حساب۔
اور CoursePilot، طلبہ کی ڈیڈ لائنز اور گریڈز کا پلانر۔

میں نے Coursera پر گوگل کے نو سرٹیفکیٹس بھی حاصل کیے ہیں۔

مل کر کام کریں؟ ای میل کریں: hassan advani zero eight at gmail dot com، GitHub پر Hassan one two three Advani، یا ویب سائٹ کا کانٹیکٹ فارم۔ شکریہ!
```

**Roman Urdu / Hinglish (for recording yourself, or English-script voices)**
```
Assalam-o-Alaikum! Main Hassan hoon, aur main websites banata hoon.

Mera naam Muhammad Hassan Advani hai, aur main GU Tech Karachi mein computer science ka student hoon. Main HTML, CSS aur JavaScript se kaam karta hoon, aur Python aur C++ seekh raha hoon.

Main websites aur browser tools banata hoon, aur purani sites ko behtar karta hoon. Mil kar kaam karne ke liye bhi tayyar hoon.

Mere projects: FocusFlow, Pomodoro timer wala task planner. BudgetWise, aamdani aur kharch ka hisaab. Aur CoursePilot, students ki deadlines aur grades ka planner.

Maine Coursera par Google ke nau certificates bhi hasil kiye hain.

Mil kar kaam karein? Email kijiye: hassanadvani08 at gmail dot com, GitHub par Hassan123advani, ya website ka contact form. Shukriya!
```

## Rebuilding (after changing the script, content or design)
Everything lives in `scripts/video/` (`script.json` = text, `scene.html` = frame design).
```powershell
python -m venv .venv-video; .\.venv-video\Scripts\pip install edge-tts imageio-ffmpeg
# 1. start the site (cd frontend; npm run dev) and Chrome with remote debugging:
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --remote-debugging-port=9333 --user-data-dir=$env:TEMP\cdp about:blank
cd scripts\video
node capture.mjs .work/shots      # real screenshots of the site + demos
node render-frames.mjs            # one 4K frame per scene
..\..\.venv-video\Scripts\python build.py   # TTS + video + captions -> frontend/public/video
```
The voice lines are cached; only changed lines are re-synthesised. `edge-tts` needs internet; for an
offline or custom voice, record each scene as `scripts/video/.work/audio/<lang>/<scene>.mp3` and re-run `build.py`.

## Moving the video to Cloudinary later (optional)
Admin → Media library → upload `intro-en.mp4` (folder *video*, ≤ 100 MB) and the `.vtt` files →
Admin → Profile → Introduction video → Source *Uploaded video (Cloudinary)* (or keep *Video file hosted
with the site*), and update the language versions' URLs. Captions from Cloudinary work because the
player sets `crossorigin` automatically.
