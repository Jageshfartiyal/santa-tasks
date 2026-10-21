import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { errorMessage, fieldErrors } from '../api/client';
import type { Task, TaskInput } from '../api/types';
import { Field } from './Field';
import { Modal } from './Modal';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().max(5000, 'Description is too long'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use a valid date'),
});
type Values = z.infer<typeof schema>;

interface Props {
  task?: Task;
  onSubmit: (input: TaskInput) => Promise<void>;
  onClose: () => void;
}

export function TaskFormModal({ task, onSubmit, onClose }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'TODO',
      priority: task?.priority ?? 'MEDIUM',
      dueDate: task?.dueDate ?? '',
    },
  });

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await onSubmit({ ...v, dueDate: v.dueDate || null });
    } catch (e) {
      const details = fieldErrors(e);
      for (const d of details) {
        if (d.field in schema.shape) setError(d.field as keyof Values, { message: d.message });
      }
      setServerError(details.length ? null : errorMessage(e));
    }
  });

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={submit} noValidate aria-label="Task form">
        {serverError && (
          <div className="banner banner-error" role="alert">
            {serverError}
          </div>
        )}
        <Field label="Title" htmlFor="task-title" error={errors.title?.message}>
          <input id="task-title" {...register('title')} aria-invalid={!!errors.title} autoFocus />
        </Field>
        <Field label="Description" htmlFor="task-description" error={errors.description?.message}>
          <textarea id="task-description" {...register('description')} />
        </Field>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 140px' }}>
            <Field label="Status" htmlFor="task-status">
              <select id="task-status" {...register('status')}>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </Field>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <Field label="Priority" htmlFor="task-priority">
              <select id="task-priority" {...register('priority')}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
          </div>
        </div>
        <Field label="Due date" htmlFor="task-due" error={errors.dueDate?.message}>
          <input id="task-due" type="date" {...register('dueDate')} />
        </Field>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
