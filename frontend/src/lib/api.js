function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost = host === "localhost" || host === "127.0.0.1";

  if (configuredUrl && !configuredUrl.includes("localhost") && !configuredUrl.includes("127.0.0.1")) {
    return configuredUrl;
  }

  if (isLocalHost) {
    return configuredUrl || "http://localhost:8000";
  }

  return "https://api.karbonbeyan.com";
}

const API_BASE_URL = resolveApiBaseUrl();
const APP_NAME = import.meta.env.VITE_APP_NAME || "KarbonBeyan";
const TOKEN_KEY = "kb_token";

// ── Token helpers ──────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Error parsing ──────────────────────────────────────────────────────────

async function parseError(response) {
  try {
    const body = await response.json();
    if (typeof body === "string" && body.trim()) return body;
    if (body?.detail) return typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    return JSON.stringify(body);
  } catch {
    try {
      const text = await response.text();
      return text?.trim() || "İstek başarısız oldu.";
    } catch {
      return "İstek başarısız oldu.";
    }
  }
}

function getNetworkErrorMessage(error) {
  if (error instanceof TypeError) {
    return "API bağlantısı kurulamadı. Lütfen birkaç saniye sonra tekrar deneyin.";
  }

  return error?.message || "İstek başarısız oldu.";
}

async function apiFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(getNetworkErrorMessage(error));
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function registerUser({ email, password, full_name = "", company_name = "" }) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name, company_name }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function loginUser({ email, password }) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function getMe() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

// ── Shipments ─────────────────────────────────────────────────────────────

export async function createShipment(payload) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/shipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function listShipments() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/shipments`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function listDefaultValues() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/reference/default-values`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function listPlans() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/reference/plans`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function validateCnCode(cnCode) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/reference/cn-codes/${cnCode}`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function downloadShipmentPdf(shipmentId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/shipments/${shipmentId}/pdf`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error(await parseError(response));
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${APP_NAME.toLowerCase()}_cbam_${shipmentId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export { API_BASE_URL, APP_NAME };
