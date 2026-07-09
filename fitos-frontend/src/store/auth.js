import { create } from 'zustand';

const saved = (() => { try { return JSON.parse(localStorage.getItem('fitos_auth')) || {}; } catch { return {}; } })();

export const useAuth = create((set) => ({
  token: saved.token || null,
  user: saved.user || null,
  setAuth: (token, user) => {
    localStorage.setItem('fitos_auth', JSON.stringify({ token, user }));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('fitos_auth');
    set({ token: null, user: null });
  },
}));
