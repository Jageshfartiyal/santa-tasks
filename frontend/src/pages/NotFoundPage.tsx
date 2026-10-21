import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="card auth-card" style={{ textAlign: 'center' }}>
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
