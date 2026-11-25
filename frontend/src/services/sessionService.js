import { apiRequest } from "./api";

export const sessionService = {
  registerVisitor: (payload) => apiRequest("/sessions/visitors", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  get: (sessionId) => apiRequest(`/sessions/${sessionId}`),
  start: (token) => apiRequest("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ token }),
  }),
  extend: (sessionId, minutes) => apiRequest(`/sessions/${sessionId}/extend`, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  }),
  complete: (sessionId) => apiRequest(`/sessions/${sessionId}/complete`, { method: "POST" }),
};