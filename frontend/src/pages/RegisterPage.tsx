import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { registerSchema, type RegisterValues } from '../auth/schemas';
import { Field } from '../components/Field';

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signUp(values);
      navigate('/', { replace: true });
    } catch (e) {
      const details = fieldErrors(e);
      for (const d of details) {
        if (d.field === 'name' || d.field === 'email' || d.field === 'password') {
          setError(d.field, { message: d.message });
        }
      }
      setServerError(details.length ? null : errorMessage(e));
    }
  });

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate aria-label="Create account">
        <h1>Create account</h1>
        {serverError && (
          <div className="banner banner-error" role="alert">
            {serverError}
          </div>
        )}
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <input id="name" autoComplete="name" {...register('name')} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
        </Field>
        <p className="muted small">At least 8 characters, with a letter and a digit.</p>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>
        <p className="muted">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
