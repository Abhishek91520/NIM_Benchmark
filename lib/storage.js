/**
 * Storage interface for client-side persistence (localStorage)
 * Key patterns:
 *  - models:cache
 *  - models:favorites
 *  - models:overrides
 *  - chat:session:{id}
 *  - benchmark:run:{id}
 *  - prompts:suite:{id}
 *  - settings:weights
 *  - settings:theme
 */

export const storage = {
  get: async (key) => {
    if (typeof window === "undefined") return null;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item);
    } catch (e) {
      console.error(`[storage] Failed to get ${key}:`, e);
      return null;
    }
  },

  set: async (key, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[storage] Failed to set ${key}:`, e);
      // QuotaExceededError handling
      if (e?.name === "QuotaExceededError" || e?.code === 22) {
        throw new Error("Storage quota exceeded. Please clear old benchmark runs in Settings.");
      }
      throw e;
    }
  },

  list: async (prefix) => {
    if (typeof window === "undefined") return [];
    try {
      const results = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (!prefix || key.startsWith(prefix))) {
          try {
            const raw = window.localStorage.getItem(key);
            results.push({ key, value: JSON.parse(raw) });
          } catch {
            // ignore non-json
          }
        }
      }
      return results;
    } catch (e) {
      console.error(`[storage] Failed to list ${prefix}:`, e);
      return [];
    }
  },

  remove: async (key) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.error(`[storage] Failed to remove ${key}:`, e);
    }
  },

  clearByPrefix: async (prefix) => {
    if (typeof window === "undefined") return;
    try {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        window.localStorage.removeItem(k);
      }
    } catch (e) {
      console.error(`[storage] Failed to clear ${prefix}:`, e);
    }
  },

  clearAll: async () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.clear();
    } catch (e) {
      console.error("[storage] Failed to clear all:", e);
    }
  },
};
