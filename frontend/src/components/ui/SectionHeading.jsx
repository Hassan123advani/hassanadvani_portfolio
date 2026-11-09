import Reveal from './Reveal.jsx';

export default function SectionHeading({ index, kicker, title, lead, action, as: H = 'h2' }) {
  return (
    <Reveal className="section-head">
      <div>
        {(index || kicker) && (
          <p className="kicker">
            {index && <span className="kicker__index">{index}</span>}
            {kicker}
          </p>
        )}
        <H className="section-head__title">{title}</H>
        {lead && <p className="section-head__lead">{lead}</p>}
      </div>
      {action && <div className="section-head__action">{action}</div>}
    </Reveal>
  );
}
