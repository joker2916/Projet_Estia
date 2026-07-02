import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/",
});

function portalPath() {
  return window.location.pathname;
}

api.interceptors.request.use((config) => {
  if (config.headers.Authorization) {
    return config;
  }

  const path = portalPath();
  if (path.startsWith("/professor")) {
    const professorToken = localStorage.getItem("professorToken");
    if (professorToken) {
      config.headers.Authorization = `Token ${professorToken}`;
    }
    return config;
  }

  if (!path.startsWith("/student")) {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes("login")
    ) {
      const path = portalPath();
      if (path.startsWith("/professor")) {
        localStorage.removeItem("professorToken");
        localStorage.removeItem("professorName");
        window.location.href = "/professor/login";
      } else if (path.startsWith("/student")) {
        localStorage.removeItem("studentToken");
        localStorage.removeItem("studentName");
        window.location.href = "/student/login";
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;