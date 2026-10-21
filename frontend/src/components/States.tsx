import { AlertTriangle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'rows' | 'cards' | 'stats' | 'page';

function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <span className="skeleton skeleton-line" style={{ width: '60%', height: '1.1rem' }} />
      <span className="skeleton skeleton-line" style={{ width: '90%' }} />
      <span className="skeleton skeleton-line" style={{ width: '40%' }} />
    </div>
  );
}

/** Shimmering placeholder. The status text is for assistive tech only. */
export function Loading({ label = 'Loading', variant = 'rows' }: { label?: string; variant?: Variant }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true">
        {variant === 'stats' && (
          <div className="skeleton-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {variant === 'cards' && (
          <div className="skeleton-grid">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {variant === 'rows' && (
          <div className="skeleton-rows">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="skeleton" style={{ height: '3.25rem' }} />
            ))}
          </div>
        )}
        {variant === 'page' && (
          <div className="skeleton-rows" style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1rem' }}>
            <span className="skeleton" style={{ height: '2rem', width: '50%' }} />
            <span className="skeleton" style={{ height: '8rem' }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Illustration() {
  return (
    <svg className="state-illustration" viewBox="0 0 112 96" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="empty-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="0.6" style={{ stopColor: 'var(--accent-hover)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-2)' }} />
        </linearGradient>
      </defs>
      <ellipse cx="56" cy="88" rx="38" ry="5" style={{ fill: 'var(--skeleton-b)' }} />
      <rect x="20" y="14" width="72" height="66" rx="12" style={{ fill: 'var(--surface-raised)', stroke: 'var(--border-strong)' }} />
      <rect x="32" y="30" width="48" height="6" rx="3" style={{ fill: 'var(--skeleton-b)' }} />
      <rect x="32" y="44" width="36" height="6" rx="3" style={{ fill: 'var(--skeleton-b)' }} />
      <rect x="32" y="58" width="42" height="6" rx="3" style={{ fill: 'var(--skeleton-b)' }} />
      <circle cx="86" cy="22" r="14" fill="url(#empty-grad)" />
      <path d="M86 15v14M79 22h14" strokeWidth="3" strokeLinecap="round" style={{ stroke: 'var(--on-accent)' }} />
    </svg>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="state state-empty">
      <Illustration />
      <h3>{title}</h3>
      {children && <div className="muted state-body">{children}</div>}
      {action && <div className="state-cta">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <span className="state-icon">
        <AlertTriangle size={26} aria-hidden="true" />
      </span>
      <h3>Something went wrong</h3>
      <div className="muted state-body">{message}</div>
      {onRetry && (
        <button type="button" className="btn state-cta" onClick={onRetry}>
          <RotateCw size={16} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
