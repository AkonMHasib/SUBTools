// Axios HTTP Client Configuration
import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Request Interceptor: Attach authentication tokens
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("subtools_supabase_token") || localStorage.getItem("subtools_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Uniform error handler
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle auth expiration or bad requests
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        // Handle token expiry: logout user or clear state
        console.warn("Unauthorized API call. Session expired or access denied.");
      }
      return Promise.reject(error.response.data || { message: error.message });
    }
    return Promise.reject({ message: error.message || "Network Error" });
  },
);

// Determine if we should force mock mode (default to true until endpoints are ready)
export const isMockMode = () => {
  return import.meta.env.VITE_USE_MOCK_API !== "false";
};

export default apiClient;
