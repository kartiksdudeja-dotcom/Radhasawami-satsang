import axios from "axios";

// 🔍 Automatically detect API URL
const getApiUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // 🧪 Local & Network
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return `http://${hostname}:5000`;
    }

    // 🌐 Production
    if (
      hostname.includes("bharatmentors.com") ||
      hostname.includes("uatrsatsang")
    ) {
      return "https://apipunesatsang.bharatmentors.com";
    }

    return "";
  }

  return "http://localhost:5000";
};

// 🌍 Base URL
export const API_BASE_URL = getApiUrl();

// 🚀 Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 📡 API endpoints
export const API_ENDPOINTS = {
  LOGIN: "/api/auth/login",
  CHECK_ROLE: "/api/auth/check-role",
  MEMBERS: "/api/members",
  ATTENDANCE: "/api/attendance",
  SEVA: "/api/seva",
  SEVA_MASTER: "/api/seva-master",
  SUPERMAN_PHASES: "/api/superman-phases",
  HEALTH: "/api/health",
  STORE_ITEMS: "/api/store/items",
  STORE_ORDERS: "/api/store/orders",
  NOTIFICATIONS: "/api/notifications",
  SATSANG_CATEGORIES: "/api/satsang-categories",
};

// 🔐 JWT AUTH HEADER (FIXED)
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return token
    ? { Authorization: "Bearer " + token }
    : {};
};

// 🛠️ REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    const authHeaders = getAuthHeaders();
    config.headers = { ...config.headers, ...authHeaders };

    // Remove content-type for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🛠️ RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        console.error("❌ Unauthorized (401)");

        // 🔥 Auto logout
        localStorage.removeItem("token");
        window.location.href = "/login";
      }

      if (status === 403) {
        alert("🔒 Access Denied: " + (data?.message || "Permission required"));
      }

      return Promise.resolve(
        data || { success: false, error: "Server error" }
      );
    }

    console.error("❌ Network Error:", error.message);
    return Promise.reject(error);
  }
);

// 🚀 API CALL WRAPPER
export const apiFetch = async (endpoint, options = {}) => {
  const { method = "GET", body, headers, ...rest } = options;

  let url = endpoint;
  if (API_BASE_URL && url.startsWith(API_BASE_URL)) {
    url = url.replace(API_BASE_URL, "");
  }

  // Auto-parse if body was already JSON.stringify()'d — avoid double-serialization
  let data = body;
  if (typeof body === "string") {
    try {
      data = JSON.parse(body);
    } catch {
      data = body; // Keep as-is if not valid JSON string
    }
  }

  return await api({
    method: method.toUpperCase(),
    url: url,
    data: data,
    headers: headers,
    ...rest,
  });
};

export default api;

// 🧠 Debug
if (typeof window !== "undefined") {
  console.log("🚀 API Ready:", {
    baseURL: API_BASE_URL,
    token: localStorage.getItem("token"),
  });
}