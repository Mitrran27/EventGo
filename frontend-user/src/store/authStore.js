import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuthStore = create(persist((set) => ({
  user: null, token: null,
  setAuth: (user, token) => { set({ user, token }); localStorage.setItem('token', token); },
  logout: () => { set({ user: null, token: null }); localStorage.removeItem('token'); },
}), { name: 'eventgo-auth', partialize: (s) => ({ user: s.user }) }));
