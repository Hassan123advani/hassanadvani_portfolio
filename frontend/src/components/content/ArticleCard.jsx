import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal.jsx';
import Icon from '../ui/Icon.jsx';
import { cdn, formatDate } from '../../lib/format.js';
import { articlePath } from '../../lib/writing.js';
import { useSite } from '../../context/SiteContext.jsx';

/** Cover visual for an article: the uploaded image, or a typographic pattern when there is none. */
export function ArticleCover({ post, w, h, eager = false, showLabel = true }) {
  if (post.coverImage?.url) {
    return (
      <img
        src={cdn(post.coverImage.url, { w, h })}
        srcSet={`${cdn(post.coverImage.url, { w: Math.round(w / 2), h: Math.round(h / 2) })} ${Math.round(w / 2)}w, ${cdn(post.coverImage.url, { w, h })} ${w}w`}
        sizes={`(max-width: 760px) 100vw, ${w}px`}
        alt={post.coverImage.alt || ''}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }
  return (
    <div className="w-cover-fallback" aria-hidden="true">
      <span className="w-cover-fallback__glyph">{'{ }'}</span>
      {showLabel && <span className="w-cover-fallback__label">{post.category || 'Notes'}</span>}
    </div>
  );
}

export default function ArticleCard({ post, index = 0 }) {
  const { profile } = useSite();
  return (
    <Reveal as="article" className="w-card" delay={(index % 3) * 70}>
      <Link to={articlePath(post.slug)} className="w-card__link">
        <div className="w-card__media">
          <ArticleCover post={post} w={720} h={450} showLabel={!post.category} />
          {post.category && <span className="w-badge w-card__badge">{post.category}</span>}
        </div>
        <div className="w-card__body">
          <h3 className="w-card__title">{post.title}</h3>
          {post.excerpt && <p className="w-card__excerpt">{post.excerpt}</p>}
          <p className="w-meta">
            <span>{post.author || profile.name}</span>
            <span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </span>
            <span>{post.readingTime || 1} min read</span>
          </p>
          <span className="w-card__cta">
            Read article <Icon name="arrowRight" size={15} />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
