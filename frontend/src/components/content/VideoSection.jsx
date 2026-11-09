import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import Reveal from '../ui/Reveal.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';
import { useSite } from '../../context/SiteContext.jsx';
import { cdn } from '../../lib/format.js';

/** Click-to-load YouTube embed: no third-party requests until the visitor asks to play. */
function YouTubeFacade({ id, title, poster }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <iframe
        className="video-frame__media"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button type="button" className="video-frame__facade" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`}>
      <img src={poster || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
      <span className="video-frame__play">
        <Icon name="play" size={26} />
      </span>
    </button>
  );
}

const toSeconds = (t = '') => t.split(':').reduce((acc, n) => acc * 60 + Number(n || 0), 0);
const autoplayAllowed = () =>
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !navigator.connection?.saveData;

/**
 * Self-hosted / Cloudinary video: starts muted when scrolled into view (never with sound),
 * one tap to unmute, English captions on by default, optional language versions.
 */
function FilePlayer({ video, poster, onTime }) {
  const ref = useRef(null);
  const versions = video.versions?.length ? video.versions : [{ label: 'Video', url: video.url, captionsUrl: video.captionsUrl }];
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);
  const autoPausing = useRef(false);
  const current = versions[active];

  // Autoplay (muted) only while visible; pause when scrolled away.
  useEffect(() => {
    const el = ref.current;
    if (!el || !autoplayAllowed() || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.55 && !userPaused.current) el.play().catch(() => {});
        else if (!entry.isIntersecting && !el.paused) {
          autoPausing.current = true;
          el.pause();
        }
      },
      { threshold: [0, 0.55] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active]);

  // Make the default captions track visible (some browsers ignore `default` until load).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => {
      if (el.textTracks[0]) el.textTracks[0].mode = 'showing';
    };
    el.addEventListener('loadedmetadata', show);
    show();
    return () => el.removeEventListener('loadedmetadata', show);
  }, [active]);

  const toggleMute = () => {
    const el = ref.current;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted && el.paused) {
      userPaused.current = false;
      el.play().catch(() => {});
    }
  };

  // Position / sound / play state to restore on the new <video> after a language switch.
  const pendingResume = useRef(null);

  const switchTo = (i) => {
    if (i === active) return;
    const el = ref.current;
    pendingResume.current = { t: el?.currentTime || 0, play: el ? !el.paused : playing, muted: el ? el.muted : muted };
    setActive(i);
  };

  // Runs on the NEW element (React attaches it), so it can't miss the event like a late addEventListener could.
  const onLoadedMetadata = (e) => {
    const el = e.currentTarget;
    const resume = pendingResume.current;
    if (!resume) return;
    pendingResume.current = null;
    el.muted = resume.muted;
    el.currentTime = Math.min(resume.t, Math.max(0, el.duration - 0.5));
    if (resume.play) {
      userPaused.current = false;
      el.play().catch(() => {});
    }
  };

  return (
    <>
      <div className="video-frame">
      <video
        key={current.url}
        ref={ref}
        className="video-frame__media"
        src={current.url}
        poster={poster}
        controls
        muted
        playsInline
        preload="metadata"
        // Captions from another origin (e.g. Cloudinary) only load with CORS enabled on the media element.
        crossOrigin={/^https?:/.test(current.captionsUrl || '') ? 'anonymous' : undefined}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={(e) => e.currentTarget.isConnected && setPlaying(true)}
        onPause={(e) => {
          // The browser pauses the old element when a language switch removes it: not the visitor's choice.
          if (!e.currentTarget.isConnected) return;
          setPlaying(false);
          // A pause we didn't trigger ourselves is the visitor's choice: don't auto-resume it.
          if (!autoPausing.current) userPaused.current = true;
          autoPausing.current = false;
        }}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime, (s) => (ref.current.currentTime = s))}
        aria-label={video.title}
      >
        {current.captionsUrl && <track kind="captions" srcLang="en" label="English captions" src={current.captionsUrl} default />}
        Your browser can’t play this video. <a href={current.url}>Download it</a>.
      </video>
      </div>
      <div className="video-controls">
        <button type="button" className={`video-chip ${muted ? 'is-muted' : ''}`} onClick={toggleMute} aria-pressed={!muted}>
          <Icon name={muted ? 'volumeOff' : 'volumeOn'} size={16} /> {muted ? 'Tap for sound' : 'Mute'}
        </button>
        {versions.length > 1 && (
          <div className="video-langs" role="group" aria-label="Voice-over language">
            {versions.map((v, i) => (
              <button key={v.url} type="button" className={`video-chip ${i === active ? 'is-active' : ''}`} aria-pressed={i === active} onClick={() => switchTo(i)} lang={v.lang}>
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function VideoSection() {
  const { profile } = useSite();
  const v = profile.video || {};
  const [time, setTime] = useState(0);
  const seekRef = useRef(null);
  const poster = v.poster?.url ? cdn(v.poster.url, { w: 1280, h: 720 }) : undefined;
  const isFile = (v.provider === 'cloudinary' || v.provider === 'file') && (v.url || v.versions?.length);
  const ready = (v.provider === 'youtube' && v.youtubeId) || isFile;
  const chapters = (v.chapters || []).map((c) => ({ ...c, s: toSeconds(c.time) }));
  const currentChapter = chapters.reduce((acc, c, i) => (time >= c.s ? i : acc), -1);

  return (
    <section className="section" id="intro-video" aria-labelledby="video-title">
      <div className="container">
        <SectionHeading index="◉" kicker="Introduction" title={<span id="video-title">{v.title || 'Meet me in two minutes'}</span>} lead={v.description} />
        <div className="video-layout">
          <Reveal className="video-shell">
            {ready && isFile && (
              <FilePlayer
                video={v}
                poster={poster}
                onTime={(t, seek) => {
                  seekRef.current = seek;
                  setTime(t);
                }}
              />
            )}
            {!isFile && (
            <div className="video-frame">
              {ready && v.provider === 'youtube' && <YouTubeFacade id={v.youtubeId} title={v.title} poster={poster} />}
              {!ready && (
                <div className="video-frame__pending">
                  <span className="video-frame__rec" aria-hidden="true">
                    <i /> REC
                  </span>
                  <p className="video-frame__pending-title">Intro video in production</p>
                  <p className="muted">The script and storyboard are ready — the recorded video will appear here once it’s published.</p>
                </div>
              )}
            </div>
            )}
          </Reveal>
          {chapters.length > 0 && (
            <Reveal as="ol" className="chapters" delay={120}>
              {chapters.map((c, i) => (
                <li key={`${c.time}-${c.label}`} className={i === currentChapter ? 'is-current' : ''}>
                  {isFile ? (
                    <button type="button" onClick={() => seekRef.current?.(c.s)} disabled={!seekRef.current} aria-label={`Jump to ${c.label} (${c.time})`}>
                      <span className="mono">{c.time}</span>
                      {c.label}
                    </button>
                  ) : (
                    <>
                      <span className="mono">{c.time}</span>
                      {c.label}
                    </>
                  )}
                </li>
              ))}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
