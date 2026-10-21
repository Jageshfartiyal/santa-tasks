import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  noun?: string;
  onChange: (page: number) => void;
}

/** Compact page list with ellipses: 1 … 4 5 6 … 12 */
function pageItems(page: number, last: number): (number | 'gap-l' | 'gap-r')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const items: (number | 'gap-l' | 'gap-r')[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(last - 1, page + 1);
  if (from > 2) items.push('gap-l');
  for (let p = from; p <= to; p++) items.push(p);
  if (to < last - 1) items.push('gap-r');
  items.push(last);
  return items;
}

export function Pagination({ page, totalPages, total, pageSize = 10, noun = 'task', onChange }: Props) {
  if (total === 0) return null;
  const last = Math.max(totalPages, 1);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <nav className={styles.nav} aria-label="Pagination">
      <span className="muted small">
        Showing {start}–{end} of {total} {noun}
        {total === 1 ? '' : 's'}
      </span>
      <div className={styles.pages}>
        <button
          type="button"
          className={`btn btn-sm ${styles.step}`}
          aria-label="Previous"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className={styles.hideSmall} aria-hidden="true">
            Prev
          </span>
        </button>
        {pageItems(page, last).map((it) =>
          typeof it === 'number' ? (
            <button
              key={it}
              type="button"
              className={`${styles.page} ${it === page ? styles.current : ''}`}
              aria-label={`Page ${it}`}
              aria-current={it === page ? 'page' : undefined}
              onClick={() => it !== page && onChange(it)}
            >
              {it}
            </button>
          ) : (
            <span key={it} className={styles.gap} aria-hidden="true">
              …
            </span>
          ),
        )}
        <button
          type="button"
          className={`btn btn-sm ${styles.step}`}
          aria-label="Next"
          disabled={page >= last}
          onClick={() => onChange(page + 1)}
        >
          <span className={styles.hideSmall} aria-hidden="true">
            Next
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
