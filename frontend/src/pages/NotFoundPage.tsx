import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';

export function NotFoundPage() {
  return (
    <AuthLayout>
      <div style={{ textAlign: 'center' }}>
        <span className="state-icon" style={{ margin: '0 auto 1rem' }}>
          <Compass size={26} aria-hidden="true" />
        </span>
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </AuthLayout>
  );
}
