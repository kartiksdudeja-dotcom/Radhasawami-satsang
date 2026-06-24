// src/utils/api.js

const BASE_URL = "https://apipunesatsang.bharatmentors.com";

// 🔐 Get token safely
const getToken = () => {
  return localStorage.getItem("token");
};

// 🚀 Main API function
export const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : ""
      }
    });

    // 🔴 Handle unauthorized
    if (response.status === 401) {
      console.warn("⚠️ Unauthorized - redirecting to login");

      // clear invalid session
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // optional: redirect
      window.location.href = "/";
      return;
    }

    // 🔴 Handle forbidden
    if (response.status === 403) {
      alert("Access denied!");
      return;
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const api = {
  get: (endpoint) => apiFetch(endpoint),

  post: (endpoint, body) =>
    apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  put: (endpoint, body) =>
    apiFetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(body)
    }),

  delete: (endpoint) =>
    apiFetch(endpoint, {
      method: "DELETE"
    })
};