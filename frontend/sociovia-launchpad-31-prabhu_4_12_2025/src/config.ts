/**
 * Centralized configuration for API endpoints
 * All backend URLs should reference this file
 * 
 * IMPORTANT: Set VITE_API_BASE in your .env file
 * Example: VITE_API_BASE=https://your-backend-url.com
 */

// Backend base URL - reads from environment variable (no hardcoded fallback for production safety)
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE ??
  import.meta.env.VITE_API_BASE_URL ??
  ""
).toString().replace(/\/$/, "");

// API endpoint (with /api suffix)
export const API_ENDPOINT = `${API_BASE_URL}/api`;

// Helper to build full API URLs
export const buildApiUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Helper to build API endpoint URLs (includes /api prefix)
export const buildApiEndpoint = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_ENDPOINT}/${cleanPath}`;
};

// Log warning if API_BASE_URL is not set
if (!API_BASE_URL && typeof window !== 'undefined') {
  console.warn('[Config] VITE_API_BASE is not set. API calls may fail. Please set it in your .env file.');
}

export default {
  API_BASE_URL,
  API_ENDPOINT,
  buildApiUrl,
  buildApiEndpoint,
};
