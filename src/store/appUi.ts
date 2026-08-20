import { create } from 'zustand'

export type AppView = 'landing' | 'sim-3d' | 'sim-map'

type AppUiState = {
  view: AppView
  webglFailed: boolean
  enterSim: (mode?: 'sim-3d' | 'sim-map') => void
  setView: (view: AppView) => void
  markWebglFailed: () => void
  backToLanding: () => void
}

export const useAppUi = create<AppUiState>((set) => ({
  view: 'landing',
  webglFailed: false,
  enterSim: (mode = 'sim-3d') => set({ view: mode }),
  setView: (view) => set({ view }),
  markWebglFailed: () => set({ webglFailed: true, view: 'sim-map' }),
  backToLanding: () => set({ view: 'landing' }),
}))
