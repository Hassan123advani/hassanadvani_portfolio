import { useState } from 'react';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import Lightbox from '../components/ui/Lightbox.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/ui/States.jsx';
import CertificateCard from '../components/content/CertificateCard.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders, localCertificates } from '../content/data.js';
import { cdn } from '../lib/format.js';

export default function Certificates() {
  const { data, loading, error, reload } = useApi(loaders.certificates, [], { fallback: localCertificates });
  const [open, setOpen] = useState(-1);
  const all = data || [];
  const professional = all.filter((c) => c.kind === 'professional');
  const rest = all.filter((c) => c.kind !== 'professional');
  const viewable = all.filter((c) => c.image?.url).map((c) => ({ ...c.image, title: c.title, meta: [c.issuer, c.issuedOn].filter(Boolean).join(' · ') }));
  const openCert = (c) => setOpen(viewable.findIndex((v) => v.url === c.image?.url));

  return (
    <>
      <Seo title="Certificates" description="Certificates and coursework completed by Muhammad Hassan Advani." />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Continuous learning</p>
          <h1 className="page-title">
            Certificates & <em>coursework.</em>
          </h1>
          <p className="page-lead">Learning milestones completed alongside my degree. Select any certificate to view it full size.</p>
        </div>
      </section>

      <section className="section section--flush">
        <div className="container">
          {loading && <CardSkeletons count={4} className="cert-grid" />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {!loading && !error && all.length === 0 && <EmptyState icon="award" title="No certificates published yet" />}

          {professional.map((c) => (
            <Reveal as="article" key={c.id || c.title} className="cert-feature">
              <button type="button" className="cert-feature__image" onClick={() => openCert(c)} aria-label={`View ${c.title}`}>
                {c.image?.url && <img src={cdn(c.image.url, { w: 1100 })} alt={c.image.alt || c.title} />}
              </button>
              <div className="cert-feature__body">
                <p className="mono kicker">{[c.issuer, 'Professional certificate', c.platform && `via ${c.platform}`].filter(Boolean).join(' · ')}</p>
                <h2>{c.title}</h2>
                {c.issuedOn && (
                  <p className="muted">
                    <Icon name="calendar" size={14} /> Completed {c.issuedOn}
                  </p>
                )}
                <p>{c.description}</p>
                {c.courses?.length > 0 && (
                  <>
                    <h3 className="h4">{c.courses.length} courses completed</h3>
                    <ul className="checklist">
                      {c.courses.map((course) => (
                        <li key={course}>
                          <Icon name="check" size={16} /> {course}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {c.credentialUrl && (
                  <a href={c.credentialUrl} className="btn btn--ghost btn--sm" target="_blank" rel="noopener noreferrer">
                    Verify credential <Icon name="arrow" size={15} />
                  </a>
                )}
              </div>
            </Reveal>
          ))}

          {rest.length > 0 && (
            <>
              {professional.length > 0 && <h2 className="h3 cert-subhead">Course certificates</h2>}
              <div className="cert-grid">
                {rest.map((c, i) => (
                  <CertificateCard key={c.id || c.title} cert={c} index={i} onOpen={() => openCert(c)} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      {open >= 0 && <Lightbox items={viewable} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} />}
    </>
  );
}
