import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const V1 = `${API}/api/v1`;
const TOKEN = "atlas_token";

export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN));
export const setToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN);
};

export const api = axios.create({ baseURL: V1 });

api.interceptors.request.use((c) => {
  const t = getToken();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e?.response?.status === 401 && getToken()) {
      setToken(null);
      if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) location.href = "/login";
    }
    return Promise.reject(e);
  }
);

export const apiErr = (e: unknown, fb = "Something went wrong") => {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
    return e.message || fb;
  }
  return fb;
};
