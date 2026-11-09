import { useReveal } from '../../hooks/useReveal.js';

export default function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={delay ? { '--d': `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  );
}
