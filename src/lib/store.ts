import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addCycle,
  isoDate,
  newId,
  nextOccurrence,
  seedSubscriptions,
  type AppSettings,
  type Subscription,
} from "./subscriptions";

type Draft = Omit<Subscription, "id" | "createdAt">;

type Store = {
  subscriptions: Subscription[];
  initialized: boolean;
  settings: AppSettings;
  addSubscription: (draft: Draft) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  markPaid: (id: string) => void;
  loadDemo: () => void;
  clearAll: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

export const useNidStore = create<Store>()(
  persist(
    (set, get) => ({
      subscriptions: seedSubscriptions(),
      initialized: true,
      settings: { notificationsEnabled: false, defaultReminderDays: 3 },
      addSubscription: (draft) =>
        set({
          subscriptions: [
            { ...draft, id: newId(), createdAt: new Date().toISOString() },
            ...get().subscriptions,
          ],
          initialized: true,
        }),
      updateSubscription: (id, patch) =>
        set({
          subscriptions: get().subscriptions.map((s) =>
            s.id === id ? { ...s, ...patch } : s,
          ),
        }),
      removeSubscription: (id) =>
        set({ subscriptions: get().subscriptions.filter((s) => s.id !== id) }),
      markPaid: (id) =>
        set({
          subscriptions: get().subscriptions.map((s) => {
            if (s.id !== id) return s;
            const due = nextOccurrence(s.nextPayment, s.cycle);
            return { ...s, nextPayment: isoDate(addCycle(due, s.cycle)) };
          }),
        }),
      loadDemo: () => set({ subscriptions: seedSubscriptions(), initialized: true }),
      clearAll: () => set({ subscriptions: [], initialized: true }),
      updateSettings: (patch) =>
        set({ settings: { ...get().settings, ...patch } }),
    }),
    {
      name: "nid-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        subscriptions: s.subscriptions,
        initialized: s.initialized,
        settings: s.settings,
      }),
    },
  ),
);
