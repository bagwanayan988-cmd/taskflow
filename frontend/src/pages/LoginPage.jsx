import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/apiError';
import { loginUser } from '../api/authApi';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { validateLogin } from '../utils/validation';
import '../styles/auth.css';

export default function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { registeredEmail, from } = location.state ?? {};

  const [form, setForm] = useState({ email: registeredEmail ?? '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setFormError('');
    try {
      const { token, user } = await loginUser({ email: form.email.trim(), password: form.password });
      login(token, user);
      navigate(from ?? '/dashboard', { replace: true });
    } catch (error) {
      setFormError(
        error.response?.status === 401
          ? 'Invalid email or password. Please try again.'
          : getErrorMessage(error, 'Could not sign you in. Please try again.'),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off.">
      {registeredEmail && !formError && (
        <div className="alert alert-success" role="status">
          Account created. Sign in to get started.
        </div>
      )}
      {sessionExpired && !formError && (
        <div className="alert alert-info" role="status">
          Your session has expired. Please sign in again.
        </div>
      )}
      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          autoFocus={!registeredEmail}
        />
        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          autoFocus={Boolean(registeredEmail)}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting && <span className="spinner" aria-hidden="true" />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New to TaskFlow? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
