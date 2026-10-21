import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { errorMessage, fieldErrors } from '../api/client';
import type { Project } from '../api/types';
import { Field } from '../components/Field';
import { ErrorState, Loading } from '../components/States';
import { useToast } from '../components/Toast';
import { useCreateProject, useProject, useUpdateProject } from '../hooks/queries';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(1000, 'Description must be at most 1000 characters'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
});
type Values = z.infer<typeof schema>;

function ProjectForm({ project }: { project?: Project }) {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? '');
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'ACTIVE',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const saved = project ? await update.mutateAsync(values) : await create.mutateAsync(values);
      toast.success(project ? 'Project updated' : 'Project created');
      navigate(`/projects/${saved.id}`);
    } catch (e) {
      const details = fieldErrors(e);
      for (const d of details) {
        if (d.field === 'name' || d.field === 'description' || d.field === 'status') {
          setError(d.field, { message: d.message });
        }
      }
      setServerError(details.length ? null : errorMessage(e));
    }
  });

  return (
    <form className="card" onSubmit={onSubmit} noValidate style={{ maxWidth: 640 }} aria-label="Project form">
      <h1>{project ? 'Edit project' : 'New project'}</h1>
      <p className="muted">
        {project ? 'Update the details of this project.' : 'Give your project a name and get started tracking tasks.'}
      </p>
      {serverError && (
        <div className="banner banner-error" role="alert">
          {serverError}
        </div>
      )}
      <Field label="Name" htmlFor="name" error={errors.name?.message}>
        <input id="name" {...register('name')} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Description" htmlFor="description" error={errors.description?.message}>
        <textarea id="description" {...register('description')} />
      </Field>
      <Field label="Status" htmlFor="status" error={errors.status?.message}>
        <select id="status" {...register('status')}>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </Field>
      <div className="actions">
        <Link to={project ? `/projects/${project.id}` : '/'} className="btn">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save project'}
        </button>
      </div>
    </form>
  );
}

function EditProject({ id }: { id: string }) {
  const q = useProject(id);
  if (q.isPending) return <Loading label="Loading project" variant="cards" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  return <ProjectForm project={q.data} />;
}

export function ProjectFormPage() {
  const { id } = useParams();
  return id ? <EditProject id={id} /> : <ProjectForm />;
}
