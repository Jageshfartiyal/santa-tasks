import { Link, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import styles from './Layout.module.css';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          Santa Tasks
        </Link>
        <div className={styles.user}>
          <span className={styles.name}>{user?.name}</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
