import { create } from 'zustand'
import { JEZERO_SITES, type MarsSite } from '../data/jezero'

export type ArmMode = 'idle' | 'reach' | 'scan' | 'grasp' | 'stow'
export type ViewMode = 'orbit' | 'arm' | 'overview'
export type SampleRecord = {
  id: string
  siteId: string
  siteName: string
  material: string
  collectedAt: number
  notes: string
}

export type LogEntry = {
  id: string
  t: number
  level: 'info' | 'success' | 'warn'
  message: string
}

type MissionState = {
  sol: number
  missionSeconds: number
  energyPct: number
  progressPct: number
  selectedSiteId: string | null
  scannedSiteIds: string[]
  samples: SampleRecord[]
  logs: LogEntry[]
  armMode: ArmMode
  armTarget: [number, number, number]
  armBase: [number, number, number]
  viewMode: ViewMode
  weather: {
    tempC: number
    windMs: number
    opacity: number
    dust: number
  }
  gestureEnabled: boolean
  isScanning: boolean
  lastScanResult: MarsSite | null

  tick: (dt: number) => void
  selectSite: (id: string | null) => void
  setArmTarget: (p: [number, number, number]) => void
  setArmMode: (m: ArmMode) => void
  setViewMode: (m: ViewMode) => void
  setGestureEnabled: (v: boolean) => void
  beginScan: () => void
  completeScan: (site: MarsSite) => void
  collectSample: () => void
  stowArm: () => void
  addLog: (message: string, level?: LogEntry['level']) => void
}

let logSeq = 0

export const useMissionStore = create<MissionState>((set, get) => ({
  sol: 892,
  missionSeconds: 14 * 3600 + 32 * 60,
  energyPct: 86,
  progressPct: 12,
  selectedSiteId: JEZERO_SITES[0]?.id ?? null,
  scannedSiteIds: [],
  samples: [],
  logs: [
    {
      id: 'boot',
      t: Date.now(),
      level: 'info',
      message: '任务模拟已加载：杰泽罗陨石坑公开数据场景。',
    },
  ],
  armMode: 'idle',
  armTarget: [0, 1.2, 4],
  armBase: [0, 0.2, 10],
  viewMode: 'orbit',
  weather: {
    tempC: -63,
    windMs: 4.2,
    opacity: 0.42,
    dust: 0.35,
  },
  gestureEnabled: false,
  isScanning: false,
  lastScanResult: null,

  tick: (dt) => {
    set((s) => {
      const missionSeconds = s.missionSeconds + dt
      const solBump = missionSeconds >= 24 * 3600 ? 1 : 0
      const energyDrain = s.armMode === 'scan' || s.armMode === 'grasp' ? 0.8 * dt : 0.05 * dt
      const dustJitter = (Math.sin(missionSeconds * 0.05) + 1) * 0.02
      return {
        missionSeconds: missionSeconds % (24 * 3600),
        sol: s.sol + solBump,
        energyPct: Math.max(12, s.energyPct - energyDrain / 60),
        weather: {
          ...s.weather,
          tempC: -63 + Math.sin(missionSeconds * 0.01) * 8,
          windMs: 3.5 + Math.sin(missionSeconds * 0.02) * 2.5,
          dust: Math.min(0.85, 0.3 + dustJitter + s.weather.opacity * 0.1),
        },
      }
    })
  },

  selectSite: (id) => {
    const site = JEZERO_SITES.find((x) => x.id === id)
    set({ selectedSiteId: id })
    if (site) {
      get().addLog(`已选定目标：${site.nameZh}`, 'info')
      get().setArmTarget([site.position[0], site.position[1] + 1.4, site.position[2]])
      set({ armMode: 'reach' })
    }
  },

  setArmTarget: (p) => set({ armTarget: p }),
  setArmMode: (m) => set({ armMode: m }),
  setViewMode: (m) => set({ viewMode: m }),
  setGestureEnabled: (v) => {
    set({ gestureEnabled: v })
    get().addLog(v ? '手势控制已启用（指针拖拽模拟）。' : '手势控制已关闭。', 'info')
  },

  beginScan: () => {
    const { selectedSiteId, energyPct, isScanning } = get()
    if (isScanning) return
    if (energyPct < 15) {
      get().addLog('能源不足，无法启动扫描。', 'warn')
      return
    }
    if (!selectedSiteId) {
      get().addLog('请先在地形上点击探测点。', 'warn')
      return
    }
    set({ isScanning: true, armMode: 'scan' })
    get().addLog('光谱扫描进行中…', 'info')
  },

  completeScan: (site) => {
    set((s) => {
      const scanned = s.scannedSiteIds.includes(site.id)
        ? s.scannedSiteIds
        : [...s.scannedSiteIds, site.id]
      const progressPct = Math.min(100, (scanned.length / JEZERO_SITES.length) * 70 + s.samples.length * 5)
      return {
        isScanning: false,
        armMode: 'idle',
        lastScanResult: site,
        scannedSiteIds: scanned,
        progressPct,
        selectedSiteId: site.id,
      }
    })
    get().addLog(`扫描完成：${site.nameZh} — ${site.composition[0]?.name ?? '未知物质'}`, 'success')
  },

  collectSample: () => {
    const { selectedSiteId, lastScanResult, scannedSiteIds, samples, energyPct } = get()
    const site =
      JEZERO_SITES.find((x) => x.id === selectedSiteId) ??
      lastScanResult ??
      null
    if (!site) {
      get().addLog('无有效目标，无法拾取样本。', 'warn')
      return
    }
    if (!scannedSiteIds.includes(site.id)) {
      get().addLog('请先扫描该区域再拾取样本。', 'warn')
      return
    }
    if (samples.some((s) => s.siteId === site.id)) {
      get().addLog('该点样本已在样本舱中。', 'warn')
      return
    }
    if (energyPct < 10) {
      get().addLog('能源过低，拾取中止。', 'warn')
      return
    }
    set({ armMode: 'grasp' })
    const primary = site.composition[0]
    const record: SampleRecord = {
      id: `smp-${site.id}-${Date.now()}`,
      siteId: site.id,
      siteName: site.nameZh,
      material: primary?.name ?? '未分类物质',
      collectedAt: Date.now(),
      notes: site.scienceValueZh,
    }
    setTimeout(() => {
      set((s) => ({
        samples: [...s.samples, record],
        armMode: 'idle',
        progressPct: Math.min(100, s.progressPct + 8),
        energyPct: Math.max(8, s.energyPct - 3),
      }))
      get().addLog(`样本已封存：${record.siteName}（${record.material}）`, 'success')
    }, 900)
  },

  stowArm: () => {
    const base = get().armBase
    set({
      armMode: 'stow',
      armTarget: [base[0], base[1] + 1.5, base[2] - 1.2],
    })
    get().addLog('机械臂归位。', 'info')
    setTimeout(() => set({ armMode: 'idle' }), 800)
  },

  addLog: (message, level = 'info') => {
    logSeq += 1
    set((s) => ({
      logs: [{ id: `log-${logSeq}`, t: Date.now(), level, message }, ...s.logs].slice(0, 40),
    }))
  },
}))
