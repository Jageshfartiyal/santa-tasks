import { Check, Copy, Sparkles } from 'lucide-react';
import { useState } from 'react';
import styles from './DemoAccountCard.module.css';

export const DEMO_EMAIL: string = import.meta.env.VITE_DEMO_EMAIL ?? 'demo@santa.dev';
export const DEMO_PASSWORD: string = import.meta.env.VITE_DEMO_PASSWORD ?? 'Demo1234';

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" className="btn btn-icon" aria-label={copied ? `${label} copied` : `Copy ${label}`} onClick={copy}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
    </button>
  );
}

/** Reviewer helper: shows the demo credentials with copy buttons and a one-click fill (no auto-submit). */
export function DemoAccountCard({ onUse }: { onUse: (email: string, password: string) => void }) {
  if (!DEMO_EMAIL) return null;
  return (
    <section className={`glass ${styles.card}`} aria-label="Demo account">
      <h2 className={styles.title}>
        <Sparkles size={16} aria-hidden="true" /> Demo account
      </h2>
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Email</dt>
          <dd>{DEMO_EMAIL}</dd>
          <CopyButton label="demo email" value={DEMO_EMAIL} />
        </div>
        <div className={styles.row}>
          <dt>Password</dt>
          <dd>{DEMO_PASSWORD}</dd>
          <CopyButton label="demo password" value={DEMO_PASSWORD} />
        </div>
      </dl>
      <button type="button" className="btn btn-ghost" onClick={() => onUse(DEMO_EMAIL, DEMO_PASSWORD)}>
        Use demo account
      </button>
    </section>
  );
}
