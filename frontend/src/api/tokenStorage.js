const TOKEN_KEY = 'taskflow.token';
const USER_KEY = 'taskflow.user';

function decodePayload(token) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

function isExpired(token) {
  try {
    const { exp } = decodePayload(token);
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const tokenStorage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /** Returns the stored session, or null if there is none or its token has already expired. */
  load() {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser || isExpired(token)) {
      this.clear();
      return null;
    }
    try {
      return { token, user: JSON.parse(rawUser) };
    } catch {
      this.clear();
      return null;
    }
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
