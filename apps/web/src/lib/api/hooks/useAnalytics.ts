import { useQuery } from "@tanstack/react-query";
import apiClient from "../api-client";

export function useAnalyticsOverview(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "overview", period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/overview?period=${period}`);
      return res.data;
    },
  });
}

export function useAnalyticsFunnel(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "funnel", period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/funnel?period=${period}`);
      return res.data;
    },
  });
}

export function useAnalyticsTimeSeries(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "time-series", period],
    queryFn: async () => {
      const res = await apiClient.get(
        `/analytics/time-series?period=${period}`,
      );
      return res.data;
    },
  });
}

export function useAnalyticsTopCompanies(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "top-companies", period],
    queryFn: async () => {
      const res = await apiClient.get(
        `/analytics/top-companies?period=${period}`,
      );
      return res.data;
    },
  });
}

export function useAnalyticsTopCities(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "top-cities", period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/top-cities?period=${period}`);
      return res.data;
    },
  });
}

export function useAnalyticsCategories(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "categories", period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/categories?period=${period}`);
      return res.data;
    },
  });
}

export function useAnalyticsSources(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "sources", period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/sources?period=${period}`);
      return res.data;
    },
  });
}

export function useAnalyticsAiUsage(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "ai-usage", period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/ai-usage?period=${period}`);
      return res.data;
    },
  });
}

export function useAnalyticsAiLatency(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "ai-latency", period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/ai-latency?period=${period}`);
      return res.data;
    },
  });
}

export function useAnalyticsPromptPerformance(period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", "prompt-performance", period],
    queryFn: async () => {
      const res = await apiClient.get(
        `/analytics/prompt-performance?period=${period}`,
      );
      return res.data;
    },
  });
}
