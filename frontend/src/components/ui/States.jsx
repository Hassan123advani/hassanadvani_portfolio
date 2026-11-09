import Icon from './Icon.jsx';

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="page-loader__bar" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function Skeleton({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function CardSkeletons({ count = 3, className = 'grid-3' }) {
  return (
    <div className={className} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card skeleton-card">
          <div className="skeleton-card__media" />
          <Skeleton lines={3} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'sparkle', title, children, action }) {
  return (
    <div className="state state--empty">
      <span className="state__icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon">
        <Icon name="refresh" size={22} />
      </span>
      <h3>{title}</h3>
      <p>{error?.message || 'Please try again in a moment.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
