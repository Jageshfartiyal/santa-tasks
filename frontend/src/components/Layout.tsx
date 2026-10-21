import { FolderKanban, LayoutDashboard, LogOut, Menu, Moon, Plus, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../hooks/useTheme';
import styles from './Layout.module.css';

function pageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/projects') return 'Projects';
  if (pathname === '/projects/new') return 'New project';
  if (pathname.endsWith('/edit')) return 'Edit project';
  if (pathname.startsWith('/projects/')) return 'Project';
  return 'Santa Tasks';
}

function LogoMark() {
  return (
    <span className={styles.logo} aria-hidden="true">
      S
    </span>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const title = pageTitle(pathname);
  const initial = (user?.name?.trim()[0] ?? '?').toUpperCase();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className={styles.shell}>
      {open && <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside id="app-sidebar" className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`} aria-label="Sidebar">
        <div className={styles.sidebarHead}>
          <Link to="/" className={styles.brand}>
            <LogoMark />
            <span>Santa Tasks</span>
          </Link>
          <button
            type="button"
            className={`btn btn-icon ${styles.closeDrawer}`}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <LayoutDashboard size={18} aria-hidden="true" />
            Dashboard
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `${styles.link} ${isActive && pathname !== '/projects/new' ? styles.active : ''}`
            }
          >
            <FolderKanban size={18} aria-hidden="true" />
            Projects
          </NavLink>
          <NavLink to="/projects/new" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <Plus size={18} aria-hidden="true" />
            New project
          </NavLink>
        </nav>
        <div className={styles.userCard}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div className={styles.userInfo}>
            <span className={styles.name}>{user?.name}</span>
            <span className={styles.email}>{user?.email}</span>
          </div>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Log out"
            title="Log out"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={`btn btn-icon ${styles.menuBtn}`}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="app-sidebar"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <nav className={styles.crumbs} aria-label="Breadcrumb">
            {pathname !== '/' && (
              <>
                <Link to="/">Dashboard</Link>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span className={styles.crumbCurrent} aria-current="page">
              {title}
            </span>
          </nav>
          <button
            type="button"
            className="btn btn-icon"
            aria-label={`Switch to ${nextTheme} theme`}
            title={`Switch to ${nextTheme} theme`}
            onClick={toggle}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
