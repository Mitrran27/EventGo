import { create } from 'zustand';
export const useCompareStore = create((set, get) => ({
  items: [],
  toggle: (vendor) => { const { items } = get(); if (items.find(v => v.id === vendor.id)) { set({ items: items.filter(v => v.id !== vendor.id) }); } else if (items.length < 4) { set({ items: [...items, vendor] }); } },
  clear: () => set({ items: [] }),
  has: (id) => get().items.some(v => v.id === id),
}));
