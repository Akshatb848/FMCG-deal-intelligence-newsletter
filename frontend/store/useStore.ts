'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Article, ChatMessage, FilterState } from '@/types';

// ── Deals / pipeline state ─────────────────────────────────────────────────
interface DealsState {
  currentJobId: string | null;
  setCurrentJobId: (id: string | null) => void;
}

// ── Saved articles ─────────────────────────────────────────────────────────
interface SavedState {
  savedArticles: Article[];
  saveArticle: (article: Article) => void;
  unsaveArticle: (id: string) => void;
  isSaved: (id: string) => boolean;
  clearSaved: () => void;
}

// ── AI chat ────────────────────────────────────────────────────────────────
interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setLoading: (v: boolean) => void;
  toggleChat: () => void;
  clearMessages: () => void;
}

// ── Filters ────────────────────────────────────────────────────────────────
interface FilterStateStore {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

// ── UI state ───────────────────────────────────────────────────────────────
interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setCommandPalette: (v: boolean) => void;
}

const DEFAULT_FILTERS: FilterState = {
  dealType:  'all',
  source:    'all',
  dateRange: '30d',
  search:    '',
  minScore:  0,
};

type StoreState = DealsState & SavedState & ChatState & FilterStateStore & UIState;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Deals ──────────────────────────────────────────────────────────
      currentJobId: null,
      setCurrentJobId: (id) => set({ currentJobId: id }),

      // ── Saved ──────────────────────────────────────────────────────────
      savedArticles: [],
      saveArticle: (article) =>
        set((s) => ({
          savedArticles: s.savedArticles.some((a) => a.id === article.id)
            ? s.savedArticles
            : [...s.savedArticles, article],
        })),
      unsaveArticle: (id) =>
        set((s) => ({ savedArticles: s.savedArticles.filter((a) => a.id !== id) })),
      isSaved: (id) => get().savedArticles.some((a) => a.id === id),
      clearSaved: () => set({ savedArticles: [] }),

      // ── Chat ───────────────────────────────────────────────────────────
      messages: [],
      isOpen: false,
      isLoading: false,
      addMessage: (msg) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
          ],
        })),
      setLoading: (v) => set({ isLoading: v }),
      toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
      clearMessages: () => set({ messages: [] }),

      // ── Filters ────────────────────────────────────────────────────────
      filters: DEFAULT_FILTERS,
      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      // ── UI ─────────────────────────────────────────────────────────────
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandPalette: (v) => set({ commandPaletteOpen: v }),
    }),
    {
      name: 'fmcg-intelligence-store',
      partialize: (s) => ({
        currentJobId:     s.currentJobId,
        savedArticles:    s.savedArticles,
        sidebarCollapsed: s.sidebarCollapsed,
        filters:          s.filters,
      }),
    },
  ),
);
