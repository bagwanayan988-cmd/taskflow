const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection and make sure the backend is running.";

/** True when the request never got an HTTP response (server down, CORS failure, timeout, offline). */
function isNetworkError(error) {
  return Boolean(error?.isAxiosError) && !error.response;
}

/** Turns an axios error into a message that is safe and useful to show to the user. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (isNetworkError(error)) {
    return NETWORK_ERROR_MESSAGE;
  }
  const status = error?.response?.status;
  if (status >= 500) {
    return 'The service is temporarily unavailable. Please try again in a moment.';
  }
  // "Validation failed" alone isn't actionable; the per-field messages say what to fix.
  const fieldMessages = Object.values(getFieldErrors(error));
  if (fieldMessages.length > 0) {
    return fieldMessages.join(' ');
  }
  return error?.response?.data?.message ?? fallback;
}

/** Server-side validation errors keyed by field name, e.g. { email: "Email must be valid" }. */
export function getFieldErrors(error) {
  return error?.response?.data?.fieldErrors ?? {};
}
