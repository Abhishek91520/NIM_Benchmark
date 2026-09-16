import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: "dark",
      setTheme: (theme) => set({ theme }),

      // API Key status banner (transient)
      apiKeyStatus: {
        checked: false,
        valid: true,
        message: "",
      },
      setApiKeyStatus: (apiKeyStatus) => set({ apiKeyStatus }),

      // Selected models across playground / compare / benchmark
      selectedModels: [],
      setSelectedModels: (selectedModels) => set({ selectedModels }),
      toggleSelectedModel: (modelId) => {
        const current = get().selectedModels;
        if (current.includes(modelId)) {
          set({ selectedModels: current.filter((id) => id !== modelId) });
        } else {
          set({ selectedModels: [...current, modelId] });
        }
      },

      // Favorites
      favorites: [],
      toggleFavorite: (modelId) => {
        const current = get().favorites;
        if (current.includes(modelId)) {
          set({ favorites: current.filter((id) => id !== modelId) });
        } else {
          set({ favorites: [...current, modelId] });
        }
      },
      isFavorite: (modelId) => get().favorites.includes(modelId),

      // Category overrides: { [modelId]: "chat" }
      categoryOverrides: {},
      setCategoryOverride: (modelId, category) => {
        set((state) => ({
          categoryOverrides: {
            ...state.categoryOverrides,
            [modelId]: category,
          },
        }));
      },
      clearCategoryOverrides: () => set({ categoryOverrides: {} }),

      // Benchmark scoring weights (sum to 100%)
      scoringWeights: {
        quality: 55,
        speed: 25,
        reliability: 20,
      },
      setScoringWeights: (weights) => set({ scoringWeights: weights }),

      // Quick filter on dashboard
      dashboardFilter: {
        search: "",
        category: "all",
        status: "all",
        favoritesOnly: false,
      },
      setDashboardFilter: (filterUpdate) =>
        set((state) => ({
          dashboardFilter: { ...state.dashboardFilter, ...filterUpdate },
        })),

      // Reset all settings to default
      resetSettings: () =>
        set({
          scoringWeights: { quality: 55, speed: 25, reliability: 20 },
          categoryOverrides: {},
          favorites: [],
          selectedModels: [],
        }),
    }),
    {
      name: "nim-console-store",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : undefined)),
      partialize: (state) => ({
        theme: state.theme,
        favorites: state.favorites,
        categoryOverrides: state.categoryOverrides,
        scoringWeights: state.scoringWeights,
      }),
    }
  )
);
