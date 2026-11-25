import { apiRequest } from "./api";

export const exhibitService = {
  list: (params = "") => apiRequest(`/exhibits${params}`),
  get: (id) => apiRequest(`/exhibits/${id}`),
  create: (payload) => apiRequest("/exhibits", {
    method: "POST",
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/exhibits/${id}`, {
    method: "PUT",
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  }),
  remove: (id) => apiRequest(`/exhibits/${id}`, { method: "DELETE" }),
};