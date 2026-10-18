import axios from "axios";

// Basic configured axios instance.
// In Next.js App Router we can't easily intercept with next-auth on the client in the same way,
// but we'll use this for Tanstack Query or simple client-side fetches.
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Cache the session token in memory to avoid an HTTP round-trip on every request.
// getSession() hits /api/auth/session over the network — calling it per-request
// was adding latency to every API call (including during the login flow itself).
let _cachedToken: string | null = null;
let _cacheExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  // Only run on the client side — server-side auth flows (e.g. NextAuth authorize())
  // must not call getSession() as it causes circular HTTP calls.
  if (typeof window === "undefined") return null;

  const now = Date.now();
  if (_cachedToken && now < _cacheExpiry) {
    return _cachedToken;
  }

  try {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (session as any)?.accessToken ?? null;
    if (token) {
      _cachedToken = token;
      // Cache for 60 seconds — well within the 15m JWT window
      _cacheExpiry = now + 60_000;
    }
    return token;
  } catch {
    return null;
  }
}

// Call this after sign-out or when the token changes so the next request fetches fresh.
export function clearApiClientCache() {
  _cachedToken = null;
  _cacheExpiry = 0;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Auto-refresh token on 401
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        await apiClient.post("/auth/refresh");
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Redirect to login if refresh fails
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
