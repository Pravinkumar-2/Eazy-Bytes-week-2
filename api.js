import axios from "axios";

/**
 * Single axios instance every page imports. Reads the JWT from
 * localStorage and attaches it as a Bearer token automatically; on a
 * 401 it clears the stored session so the app can redirect to login.
 *
 * Set REACT_APP_API_URL (Create React App) or VITE_API_URL (Vite) in
 * your .env to point this at a deployed backend; defaults to the local
 * Express server from the /backend folder.
 */

const baseURL =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:4000/api";

export const api = axios.create({ baseURL });

export const TOKEN_KEY = "stocky_token";
export const USER_KEY = "stocky_user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const setSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearSession();
      // A full reload is the simplest way to bounce back to the auth
      // screen from anywhere in the app without wiring a router.
      if (typeof window !== "undefined") window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default api;
