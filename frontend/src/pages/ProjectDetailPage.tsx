import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage } from '../api/client';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/Modal';
import { ErrorState, Loading } from '../components/States';
import { TaskList } from '../components/TaskList';
import { useToast } from '../components/Toast';
import { useDeleteProject, useProject } from '../hooks/queries';
import styles from './ProjectDetailPage.module.css';

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const project = useProject(id);
  const remove = useDeleteProject();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  if (project.isPending) return <Loading label="Loading project" variant="cards" />;
  if (project.isError) {
    return (
      <>
        <ErrorState message={errorMessage(project.error)} onRetry={() => void project.refetch()} />
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/">Back to dashboard</Link>
        </p>
      </>
    );
  }
  const p = project.data;

  const onDelete = async () => {
    try {
      await remove.mutateAsync(p.id);
      toast.success('Project deleted');
      navigate('/');
    } catch (e) {
      toast.error(errorMessage(e));
      setConfirming(false);
    }
  };

  return (
    <>
      <Link to="/" className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        Dashboard
      </Link>
      <div className={`card ${styles.header}`}>
        <div className={styles.headerTop}>
          <div className={styles.titleBlock}>
            <h1 className="page-title">{p.name}</h1>
            <div className="row">
              <Badge value={p.status} />
              <span className="muted small">Created {new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="row">
            <Link to={`/projects/${p.id}/edit`} className="btn">
              <Pencil size={16} aria-hidden="true" />
              Edit
            </Link>
            <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirming(true)}>
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>
        {p.description && <p className={`muted ${styles.description}`}>{p.description}</p>}
      </div>

      <TaskList projectId={p.id} />

      {confirming && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${p.name}" and all of its tasks? This cannot be undone.`}
          busy={remove.isPending}
          onConfirm={() => void onDelete()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
