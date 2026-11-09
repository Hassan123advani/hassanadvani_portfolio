import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal.jsx';
import { cdn, formatDate } from '../../lib/format.js';

export default function PostCard({ post, index = 0, featured = false }) {
  return (
    <Reveal as="article" className={`post-card ${featured ? 'post-card--featured' : ''}`} delay={(index % 3) * 70}>
      <Link to={`/blog/${post.slug}`} className="post-card__link">
        <div className="post-card__media">
          {post.coverImage?.url ? (
            <img src={cdn(post.coverImage.url, { w: featured ? 1100 : 700, h: featured ? 620 : 420 })} alt={post.coverImage.alt || ''} loading="lazy" />
          ) : (
            <div className="post-card__placeholder" aria-hidden="true">
              <span>{post.category || 'Notes'}</span>
            </div>
          )}
        </div>
        <div className="post-card__body">
          <p className="post-card__meta mono">
            {post.category && <span>{post.category}</span>}
            <span>{formatDate(post.publishedAt)}</span>
            <span>{post.readingTime || 1} min read</span>
          </p>
          <h3>{post.title}</h3>
          {post.excerpt && <p className="post-card__excerpt">{post.excerpt}</p>}
        </div>
      </Link>
    </Reveal>
  );
}
