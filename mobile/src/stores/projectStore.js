import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * App store – persisted to localStorage.
 *
 * Structure:
 *   projects: [
 *     {
 *       id, name, createdAt,
 *       pergolas: [{ id, name, params, result, pricing, materialCategory, savedAt }]
 *     }
 *   ]
 *   stockLengths: { aluminum: 6.0, wood: null }  (null = auto)
 */
export const useProjectStore = create(
  persist(
    (set) => ({
      projects: [],
      stockLengths: { aluminum: 6.0, wood: null },

      // ── Project actions ────────────────────────────────────────────
      createProject: (name) => {
        const id = crypto.randomUUID();
        set((s) => ({
          projects: [
            ...s.projects,
            { id, name: name.trim() || 'פרויקט חדש', createdAt: Date.now(), pergolas: [] },
          ],
        }));
        return id;
      },

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)),
        })),

      // ── Pergola actions ────────────────────────────────────────────
      addPergola: (projectId, pergola) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  pergolas: [
                    ...p.pergolas,
                    { ...pergola, id: crypto.randomUUID(), savedAt: Date.now() },
                  ],
                }
              : p
          ),
        })),

      updatePergola: (projectId, pergolaId, pergola) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  pergolas: p.pergolas.map((g) =>
                    g.id === pergolaId ? { ...g, ...pergola, id: pergolaId } : g
                  ),
                }
              : p
          ),
        })),

      deletePergola: (projectId, pergolaId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, pergolas: p.pergolas.filter((g) => g.id !== pergolaId) }
              : p
          ),
        })),

      // ── Stock length settings ──────────────────────────────────────
      setStockLength: (type, value) =>
        set((s) => ({ stockLengths: { ...s.stockLengths, [type]: value } })),
    }),
    {
      name: 'pergola-app-v1',
      partialize: (s) => ({ projects: s.projects, stockLengths: s.stockLengths }),
    }
  )
);
