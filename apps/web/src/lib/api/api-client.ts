import axios from "axios";
import { getSession } from "next-auth/react";

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

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    try {
      const session = await getSession();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (session && (session as any).accessToken) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config.headers.Authorization = `Bearer ${(session as any).accessToken}`;
      }
    } catch (e) {
      // ignore
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Auto-refresh token on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
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
