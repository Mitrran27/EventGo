import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      setAuth: (user, token) => { set({ user }); localStorage.setItem('admin_token', token); },
      logout: () => { set({ user: null }); localStorage.removeItem('admin_token'); },
    }),
    { name: 'eventgo-admin-auth', partialize: (s) => ({ user: s.user }) }
  )
);
