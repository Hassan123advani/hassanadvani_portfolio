import ContentList from '../components/ContentList.jsx';

export default function Posts() {
  return (
    <ContentList
      endpoint="/posts"
      route="posts"
      publicBase="blog"
      noun="article"
      title="Blog posts"
      description="Write, schedule and publish articles. Only published articles whose date has passed are visible on the site."
      emptyHint="Articles you create appear here. Save as draft until you’re ready to publish."
    />
  );
}
