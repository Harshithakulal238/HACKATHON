import { apiRequest } from "./api";

export const qrService = {
  list: (params = "") => apiRequest(`/qr${params}`),
  generateExhibit: (exhibitId) => apiRequest(`/qr/exhibit/${exhibitId}`, { method: "POST" }),
  generateRoute: (sessionId) => apiRequest(`/qr/route/${sessionId}`, { method: "POST" }),
  validateExhibit: (code) => apiRequest("/qr/exhibit/validate", {
    method: "POST",
    body: JSON.stringify({ code }),
  }),
};