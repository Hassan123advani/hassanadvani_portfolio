import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSite } from '../../context/SiteContext.jsx';
import { SITE_URL } from '../../lib/config.js';

const abs = (url) => (!url ? '' : /^https?:/.test(url) ? url : `${SITE_URL}${url}`);

export default function Seo({ title, description, image, type = 'website', noindex = false, children }) {
  const { seo } = useSite();
  const { pathname } = useLocation();
  const fullTitle = title ? (seo.titleTemplate || '%s').replace('%s', title) : seo.defaultTitle;
  const desc = description || seo.description;
  const img = abs(image || seo.ogImage?.url);
  const url = `${SITE_URL}${pathname}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {seo.keywords?.length > 0 && <meta name="keywords" content={seo.keywords.join(', ')} />}
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <link rel="canonical" href={url} />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      {img && <meta property="og:image" content={img} />}
      <meta name="twitter:card" content={img ? 'summary_large_image' : 'summary'} />
      {seo.twitterHandle && <meta name="twitter:site" content={seo.twitterHandle} />}
      {children}
    </Helmet>
  );
}
