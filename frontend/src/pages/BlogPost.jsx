import { Link, useParams } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import { ErrorState, Skeleton } from '../components/ui/States.jsx';
import PostCard from '../components/content/PostCard.jsx';
import ShareButtons from '../components/content/ShareButtons.jsx';
import ArticleBody from '../components/content/ArticleBody.jsx';
import NotFound from './NotFound.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders } from '../content/data.js';
import { cdn, formatDate } from '../lib/format.js';
import { SITE_URL } from '../lib/config.js';
import { useSite } from '../context/SiteContext.jsx';

export function ArticleView({ post, preview = false }) {
  const { profile } = useSite();
  return (
    <article className="article">
      <header className="article__head container container--narrow">
        {!preview && (
          <Link to="/blog" className="back-link">
            <Icon name="arrowLeft" size={15} /> All articles
          </Link>
        )}
        <p className="kicker">
          {post.category ? (
            preview ? post.category : <Link to={`/blog?category=${encodeURIComponent(post.category)}`}>{post.category}</Link>
          ) : (
            'Article'
          )}
        </p>
        <h1 className="article__title">{post.title}</h1>
        {post.excerpt && <p className="article__dek">{post.excerpt}</p>}
        <p className="article__meta mono">
          <span>{post.author || profile.name}</span>
          <span>
            <Icon name="calendar" size={14} /> {formatDate(post.publishedAt || new Date())}
          </span>
          <span>
            <Icon name="clock" size={14} /> {post.readingTime || 1} min read
          </span>
        </p>
      </header>
      {post.coverImage?.url && (
        <figure className="article__cover container">
          <img src={cdn(post.coverImage.url, { w: 1600, h: 840 })} alt={post.coverImage.alt || ''} />
          {post.coverImage.caption && <figcaption>{post.coverImage.caption}</figcaption>}
        </figure>
      )}
      <div className="container container--narrow">
        <ArticleBody html={post.content} gallery={post.gallery} />
        {post.tags?.length > 0 && (
          <ul className="chips article__tags" aria-label="Tags">
            {post.tags.map((t) => (
              <li key={t}>{preview ? <span className="chip">#{t}</span> : <Link className="chip chip--btn" to={`/blog?tag=${encodeURIComponent(t)}`}>#{t}</Link>}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(() => loaders.post(slug), [slug]);

  if (loading) {
    return (
      <div className="container container--narrow page-hero">
        <Skeleton lines={6} />
      </div>
    );
  }
  if (error?.status === 404) return <NotFound what="article" />;
  if (error) {
    return (
      <div className="container page-hero">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  const post = data.item;
  const url = `${SITE_URL}/blog/${post.slug}`;
  return (
    <>
      <Seo title={post.seoTitle || post.title} description={post.seoDescription || post.excerpt} image={post.ogImage?.url || post.coverImage?.url} type="article">
        <meta property="article:published_time" content={post.publishedAt} />
        {post.tags?.map((t) => <meta key={t} property="article:tag" content={t} />)}
      </Seo>
      <ArticleView post={post} />
      <div className="container container--narrow">
        <ShareButtons url={url} title={post.title} />
      </div>
      {data.related?.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="h3">Keep reading</h2>
            <div className="posts-grid">
              {data.related.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
