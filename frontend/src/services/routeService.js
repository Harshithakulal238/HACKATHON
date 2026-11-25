import { apiRequest } from "./api";

export const routeService = {
  generate: (payload) => apiRequest("/routes/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  get: (sessionId) => apiRequest(`/routes/${sessionId}`),
  recalculate: (sessionId, payload) => apiRequest(`/routes/${sessionId}/recalculate`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};