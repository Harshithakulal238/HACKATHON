import { apiRequest } from "./api";

export const analyticsService = {
  dashboard: (params = "") => apiRequest(`/analytics/dashboard${params}`),
  events: (params = "") => apiRequest(`/analytics/events${params}`),
};