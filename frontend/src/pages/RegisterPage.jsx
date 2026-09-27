import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage, getFieldErrors } from '../api/apiError';
import { registerUser } from '../api/authApi';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { PASSWORD_MIN_LENGTH, validateRegistration } from '../utils/validation';
import '../styles/auth.css';

const REDIRECT_DELAY_MS = 1800;
const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState(null);

  // After a successful sign-up, show the confirmation briefly, then continue to the login page.
  useEffect(() => {
    if (!registeredEmail) return undefined;
    const timer = setTimeout(
      () => navigate('/login', { replace: true, state: { registeredEmail } }),
      REDIRECT_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [registeredEmail, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateRegistration(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setFormError('');
    try {
      const user = await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setRegisteredEmail(user.email);
    } catch (error) {
      if (error.response?.status === 409) {
        setErrors({ email: 'An account with this email already exists.' });
      } else {
        // Field-level problems are shown under each input; the banner is only for everything else.
        const fieldErrors = getFieldErrors(error);
        setErrors(fieldErrors);
        setFormError(
          Object.keys(fieldErrors).length > 0
            ? ''
            : getErrorMessage(error, 'Could not create your account. Please try again.'),
        );
      }
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <AuthLayout title="You're all set" subtitle="Your account has been created.">
        <div className="alert alert-success" role="status">
          Account created for <strong>{registeredEmail}</strong>. Redirecting you to sign in…
        </div>
        <Link className="btn btn-primary btn-block" to="/login" state={{ registeredEmail }} replace>
          Continue to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start organising your work in under a minute.">
      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="name"
          name="name"
          label="Full name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          autoFocus
        />
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
        />
        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint={`Use ${PASSWORD_MIN_LENGTH} or more characters.`}
        />
        <FormField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting && <span className="spinner" aria-hidden="true" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
