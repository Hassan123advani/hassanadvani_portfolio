"""
Builds the portfolio intro video(s) from rendered frames + neural TTS.

    python build.py            # English and Urdu versions
    python build.py --lang en  # one version

Needs:  pip install edge-tts imageio-ffmpeg   (free; edge-tts uses Microsoft's online voices)
Inputs: script.json, .work/frames/<scene>.png  (run capture.mjs + render-frames.mjs first)
Output: frontend/public/video/intro-<lang>.mp4, intro-<lang>.en.vtt, intro-poster.jpg, intro-manifest.json
"""
import argparse
import asyncio
import hashlib
import json
import re
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
WORK = HERE / ".work"
OUT = HERE.parent.parent / "frontend" / "public" / "video"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 30
W, H = 1280, 720
XFADE = 0.5   # transition length (s)
LEAD = 0.25   # silence before each scene's voice line
TAIL = 0.3   # breathing room after each line (before the next transition)


def run(args):
    res = subprocess.run([FFMPEG, "-hide_banner", "-y", *args], capture_output=True, text=True)
    if res.returncode != 0:
        raise SystemExit(res.stderr[-3000:])
    return res


def duration(path):
    res = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", res.stderr)
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


async def tts(text, voice, rate, path):
    """Synthesise once; cached by a hash of (text, voice, rate)."""
    key = hashlib.sha1(f"{voice}|{rate}|{text}".encode()).hexdigest()[:12]
    stamp = path.with_suffix(".key")
    if path.exists() and path.stat().st_size > 1000 and stamp.exists() and stamp.read_text() == key:
        return
    for attempt in range(5):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(path))
            if path.stat().st_size > 1000:
                stamp.write_text(key)
                return
        except edge_tts.exceptions.NoAudioReceived:
            pass
        await asyncio.sleep(2 + attempt * 3)  # the free service occasionally throttles
    raise SystemExit(f"TTS failed for {path.name} after retries")


def chunks(text, limit=78):
    """Split a caption into readable cues (sentence, then comma boundaries)."""
    parts, out = re.split(r"(?<=[.!?])\s+", text.strip()), []
    for p in parts:
        while len(p) > limit:
            cut = max(p.rfind(", ", 0, limit), p.rfind(" ", 0, limit))
            out.append(p[: cut + (1 if p[cut] == "," else 0)].strip())
            p = p[cut + 1 :].strip()
        if p:
            out.append(p)
    return out


def ts(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def build(lang, data):
    voice = data["voices"][lang]
    scenes = data["scenes"]
    adir = WORK / "audio" / lang
    adir.mkdir(parents=True, exist_ok=True)

    async def synth_all():
        for s in scenes:
            await tts(s[lang]["tts"], voice["voice"], voice["rate"], adir / f"{s['id']}.mp3")

    asyncio.run(synth_all())

    # Timeline: each scene is long enough for its line; consecutive scenes overlap by XFADE.
    timeline, start = [], 0.0
    for i, s in enumerate(scenes):
        a = duration(adir / f"{s['id']}.mp3")
        extra = 0.9 if i == len(scenes) - 1 else 0
        d = LEAD + a + TAIL + XFADE + extra
        timeline.append({"scene": s, "start": start, "dur": d, "audio": a, "voiceAt": start + LEAD})
        start += d - XFADE
    total = start + XFADE

    # ---- video: zoompan per frame, then crossfades ----
    inputs, filters = [], []
    for i, t in enumerate(timeline):
        inputs += ["-i", str(WORK / "frames" / f"{t['scene']['id']}.png")]
        n = round(t["dur"] * FPS)
        zin = i % 2 == 0  # alternate gentle zoom in / out
        z = f"1+0.06*on/{n}" if zin else f"1.06-0.06*on/{n}"
        filters.append(
            f"[{i}:v]scale=3840:2160,zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p[v{i}]"
        )
    prev = "v0"
    for i in range(1, len(timeline)):
        trans = "slideleft" if timeline[i]["scene"]["chapter"] == "Projects" and timeline[i - 1]["scene"]["chapter"] == "Projects" else "fade"
        filters.append(f"[{prev}][v{i}]xfade=transition={trans}:duration={XFADE}:offset={timeline[i]['start']:.3f}[x{i}]")
        prev = f"x{i}"
    # ---- audio: place each line at its scene's voice time ----
    base = len(timeline)
    for i, t in enumerate(timeline):
        inputs += ["-i", str(adir / f"{t['scene']['id']}.mp3")]
        ms = round(t["voiceAt"] * 1000)
        filters.append(f"[{base + i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]")
    filters.append("".join(f"[a{i}]" for i in range(len(timeline))) + f"amix=inputs={len(timeline)}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=0:{total:.3f},afade=t=out:st={total - 0.6:.3f}:d=0.6[aout]")

    OUT.mkdir(parents=True, exist_ok=True)
    mp4 = OUT / f"intro-{lang}.mp4"
    run([
        *inputs,
        "-filter_complex", ";".join(filters),
        "-map", f"[{prev}]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "112k", "-ac", "2",
        "-movflags", "+faststart", "-t", f"{total:.3f}",
        "-metadata", f"title=Muhammad Hassan Advani - portfolio intro ({lang})",
        str(mp4),
    ])

    # ---- English captions timed to this version's voice ----
    cues = []
    for t in timeline:
        parts = chunks(t["scene"][lang]["caption"])
        total_chars = sum(len(p) for p in parts)
        cur = t["voiceAt"]
        for p in parts:
            span = t["audio"] * len(p) / total_chars
            cues.append((cur, cur + span, p))
            cur += span
    vtt = OUT / f"intro-{lang}.en.vtt"
    # Hold each cue slightly longer, but never into the next one (no two captions on screen at once).
    ends = [min(b + 0.15, cues[i + 1][0] if i + 1 < len(cues) else total) for i, (_, b, _) in enumerate(cues)]
    vtt.write_text("WEBVTT\n\n" + "\n\n".join(f"{i + 1}\n{ts(a)} --> {ts(ends[i])}\n{p}" for i, (a, _, p) in enumerate(cues)) + "\n", encoding="utf-8")

    chapters, seen = [], set()
    for t in timeline:
        ch = t["scene"]["chapter"]
        if ch not in seen:
            seen.add(ch)
            m, s = divmod(int(t["start"]), 60)
            chapters.append({"time": f"{m}:{s:02d}", "seconds": round(t["start"], 2), "label": ch})
    return {"lang": lang, "voice": voice["voice"], "file": mp4.name, "captions": vtt.name, "duration": round(total, 2), "bytes": mp4.stat().st_size, "chapters": chapters}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["en", "ur", "all"], default="all")
    args = ap.parse_args()
    data = json.loads((HERE / "script.json").read_text(encoding="utf-8"))
    langs = ["en", "ur"] if args.lang == "all" else [args.lang]
    results = [build(lang, data) for lang in langs]
    run(["-i", str(WORK / "frames" / "hook.png"), "-vf", f"scale={W}:{H}", "-q:v", "3", str(OUT / "intro-poster.jpg")])
    manifest = OUT / "intro-manifest.json"
    old = json.loads(manifest.read_text()) if manifest.exists() else {}
    old.update({r["lang"]: r for r in results})
    old["poster"] = "intro-poster.jpg"
    manifest.write_text(json.dumps(old, indent=2), encoding="utf-8")
    for r in results:
        print(f"{r['file']}: {r['duration']}s, {r['bytes'] / 1e6:.1f} MB, captions {r['captions']}, chapters {[c['time'] + ' ' + c['label'] for c in r['chapters']]}")


if __name__ == "__main__":
    main()
