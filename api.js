import axios from "axios";

/**
 * Single axios instance every page imports. Reads the JWT from
 * localStorage and attaches it as a Bearer token automatically; on a
 * 401 it clears the stored session so the app can redirect to login.
 *
 * For deployment, set VITE_API_URL in Vercel to your Render backend URL
 * (for example https://your-service-name.onrender.com). Local development
 * falls back to the Express server on port 4000.
 */

const getApiBaseUrl = () => {
  const envUrl =
    (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) ||
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL);

  if (envUrl) {
    return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/+$/, "")}/api`;
  }

  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "/api";
  }

  return "http://localhost:4000/api";
};

const baseURL = getApiBaseUrl();

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
