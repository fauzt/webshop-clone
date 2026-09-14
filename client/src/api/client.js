import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// The access token lives in plain memory, not localStorage/sessionStorage.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// AuthContext registers a callback here so this file (which has no
// knowledge of React) can still trigger "log the user out" when a refresh
// attempt fails — e.g. the refresh token expired or was revoked elsewhere.
let onAuthFailure = () => {};

export function setOnAuthFailure(callback) {
  onAuthFailure = callback;
}

export const api = axios.create({
  baseURL: BASE_URL,
  // Required so the browser sends/receives the httpOnly refresh cookie on
  // cross-origin requests.
  // Must be paired with the server's cors({ credentials: true, origin: <exact client URL> }).
  withCredentials: true,
});

// Attach the current access token to every outgoing request automatically,
// so individual components never have to remember to do this themselves.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// If a request comes back 401 (access token missing/expired), try ONE
// silent refresh using the httpOnly cookie, then retry the original
// request with the new token. If the refresh itself fails, the session is
// truly over, so clear everything and let the app react (e.g. redirect to login).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
    if (error.response?.status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Mark this request so a second 401 (e.g. the refresh call itself, or a
    // retry that still fails) doesn't loop forever trying to refresh again.
    originalRequest._retry = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      setAccessToken(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      onAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);
