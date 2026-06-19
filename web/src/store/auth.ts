import { create } from "zustand";
import { api, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  hydrate: async () => {
    try {
      const r = await api.get("/auth/me");
      set({ user: r.data, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },
  login: async (email, password) => {
    const form = new URLSearchParams({ username: email, password });
    const r = await api.post("/auth/login", form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    setToken(r.data.access_token);
    set({ user: r.data.user });
  },
  register: async (email, password, full_name) => {
    const r = await api.post("/auth/register", { email, password, full_name });
    setToken(r.data.access_token);
    set({ user: r.data.user });
  },
  logout: () => {
    setToken(null);
    set({ user: null });
    if (typeof window !== "undefined") location.href = "/login";
  },
}));
