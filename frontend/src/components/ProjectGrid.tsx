import { ListChecks } from 'lucide-react';
import { Link } from 'react-router';
import type { Project } from '../api/types';
import { Badge } from './Badge';
import styles from './ProjectGrid.module.css';

export function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <ul className={styles.grid}>
      {projects.map((p) => (
        <li key={p.id} className={`card ${styles.project}`}>
          <div className={styles.projectHead}>
            <Link to={`/projects/${p.id}`} className={styles.projectName}>
              {p.name}
            </Link>
            <Badge value={p.status} />
          </div>
          <p className={`muted small ${styles.desc}`}>{p.description || 'No description'}</p>
          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <ListChecks size={14} aria-hidden="true" />
              {p.taskCount ?? 0} task{p.taskCount === 1 ? '' : 's'}
            </span>
            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
