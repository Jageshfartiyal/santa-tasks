interface Props {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onChange }: Props) {
  if (total === 0) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        Page {page} of {Math.max(totalPages, 1)} · {total} task{total === 1 ? '' : 's'}
      </span>
      <div className="row">
        <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
