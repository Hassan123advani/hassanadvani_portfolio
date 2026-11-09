import Icon from '../ui/Icon.jsx';
import Reveal from '../ui/Reveal.jsx';
import { cdn } from '../../lib/format.js';

export default function CertificateCard({ cert, index = 0, onOpen }) {
  return (
    <Reveal as="article" className="cert-card" delay={(index % 4) * 60}>
      <button type="button" className="cert-card__image" onClick={onOpen} aria-label={`View ${cert.title} certificate`}>
        {cert.image?.url ? (
          <img src={cdn(cert.image.url, { w: 640 })} alt={cert.image.alt || cert.title} loading="lazy" />
        ) : (
          <span className="cert-card__noimg">
            <Icon name="award" size={28} />
          </span>
        )}
        <span className="cert-card__zoom">
          <Icon name="eye" size={16} /> View
        </span>
      </button>
      <div className="cert-card__body">
        <p className="mono cert-card__issuer">
          {[cert.issuer, cert.platform].filter(Boolean).join(' · ')}
        </p>
        <h3>{cert.title}</h3>
        <div className="cert-card__foot">
          {cert.issuedOn && (
            <span className="muted">
              <Icon name="calendar" size={14} /> {cert.issuedOn}
            </span>
          )}
          {cert.credentialUrl && (
            <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="link-arrow">
              Verify <Icon name="arrow" size={14} />
            </a>
          )}
        </div>
      </div>
    </Reveal>
  );
}
