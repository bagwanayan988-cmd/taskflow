// Client-side checks mirror the backend's Bean Validation rules so most mistakes are caught before a request.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 6;
// BCrypt's limit is 72 *bytes*: emoji and non-Latin letters take several bytes each in UTF-8.
const PASSWORD_MAX_BYTES = 72;
const NAME_MAX_LENGTH = 100;
const utf8 = new TextEncoder();

function validateEmail(email) {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

/** Each validator returns an object of field -> message; empty when the form is valid. */
export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegistration({ name, email, password, confirmPassword }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required.';
  else if (name.trim().length > NAME_MAX_LENGTH) errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (!password) errors.password = 'Password is required.';
  else if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (utf8.encode(password).length > PASSWORD_MAX_BYTES) {
    errors.password = 'Password is too long. Use a shorter one (emoji and non-Latin letters count extra).';
  }

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}
