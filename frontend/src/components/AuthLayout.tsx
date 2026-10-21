import { CheckCircle2, Filter, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

const POINTS = [
  { icon: Zap, text: 'Plan projects and track every task in one place' },
  { icon: Filter, text: 'Search, filter and sort to find work instantly' },
  { icon: CheckCircle2, text: 'Stay ahead of due dates with overdue highlights' },
];

/** Split auth screen: brand panel on the left, glass form card on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <span className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
        <div className={styles.brandInner}>
          <div className={styles.brand}>
            <span className={styles.logo} aria-hidden="true">
              S
            </span>
            Santa Tasks
          </div>
          <h2 className={styles.tagline}>Get more done, with less noise.</h2>
          <ul className={styles.points}>
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className={styles.pointIcon}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className={styles.formSide}>
        <div className={`glass ${styles.card}`}>{children}</div>
      </main>
    </div>
  );
}
