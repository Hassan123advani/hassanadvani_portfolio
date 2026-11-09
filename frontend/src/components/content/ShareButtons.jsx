import { useState } from 'react';
import Icon from '../ui/Icon.jsx';

export default function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { name: 'x', label: 'Share on X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { name: 'linkedin', label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'whatsapp', label: 'Share on WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  }

  return (
    <div className="share" aria-label="Share this article">
      <span className="mono muted small">Share</span>
      {links.map((l) => (
        <a key={l.name} className="icon-btn" href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label}>
          <Icon name={l.name} size={16} />
        </a>
      ))}
      <button type="button" className="icon-btn" onClick={copy} aria-label="Copy link" title="Copy link">
        <Icon name={copied ? 'check' : 'link'} size={16} />
      </button>
      {typeof navigator !== 'undefined' && navigator.share && (
        <button type="button" className="icon-btn" onClick={() => navigator.share({ url, title }).catch(() => {})} aria-label="More sharing options">
          <Icon name="share" size={16} />
        </button>
      )}
      <span className="sr-only" role="status">
        {copied ? 'Link copied' : ''}
      </span>
    </div>
  );
}
