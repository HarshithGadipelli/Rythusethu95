import axios from "axios";

// Use VITE_API_URL for production (e.g. Vercel), fallback to current host IP for local network testing
export const backendHost = window.location.hostname;
export const BASE_URL = import.meta.env.VITE_API_URL || `http://${backendHost}:5000`;

const API = axios.create({
  baseURL: `${BASE_URL}/api`
});

export default API;