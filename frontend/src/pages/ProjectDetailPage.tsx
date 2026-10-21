import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage } from '../api/client';
import { ConfirmDialog } from '../components/Modal';
import { ErrorState, Loading } from '../components/States';
import { TaskList } from '../components/TaskList';
import { useToast } from '../components/Toast';
import { useDeleteProject, useProject } from '../hooks/queries';

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const project = useProject(id);
  const remove = useDeleteProject();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  if (project.isPending) return <Loading label="Loading project" />;
  if (project.isError) {
    return (
      <>
        <ErrorState message={errorMessage(project.error)} onRetry={() => void project.refetch()} />
        <p style={{ textAlign: 'center' }}>
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
      <p>
        <Link to="/">&larr; Dashboard</Link>
      </p>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="row-between" style={{ marginBottom: '0.5rem' }}>
          <h1 style={{ margin: 0, overflowWrap: 'anywhere' }}>{p.name}</h1>
          <div className="row">
            <Link to={`/projects/${p.id}/edit`} className="btn">
              Edit
            </Link>
            <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
              Delete
            </button>
          </div>
        </div>
        <div className="row">
          <span className={`badge badge-${p.status}`}>{p.status}</span>
          <span className="muted small">Created {new Date(p.createdAt).toLocaleDateString()}</span>
        </div>
        {p.description && <p>{p.description}</p>}
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
