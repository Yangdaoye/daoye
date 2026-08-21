import type { LandingSite } from './sites'
import { fbm } from './noise'

export interface ScienceTarget {
  id: string
  x: number
  y: number
  label: string
  kind: 'outcrop' | 'delta' | 'ice' | 'vent' | 'meteor'
  collected: boolean
  value: number
}

export function generateTargets(site: LandingSite, count = 6): ScienceTarget[] {
  const targets: ScienceTarget[] = []
  const kinds: ScienceTarget['kind'][] =
    site.id === 'jezero'
      ? ['delta', 'outcrop', 'outcrop', 'meteor', 'delta', 'outcrop']
      : site.id === 'utopia'
        ? ['ice', 'outcrop', 'meteor', 'ice', 'outcrop', 'ice']
        : site.id === 'olympus'
          ? ['vent', 'outcrop', 'outcrop', 'meteor', 'vent', 'outcrop']
          : ['outcrop', 'outcrop', 'meteor', 'outcrop', 'delta', 'outcrop']

  const labels: Record<ScienceTarget['kind'], string[]> = {
    outcrop: ['层状露头', '玄武岩碎块', '角砾岩脉'],
    delta: ['三角洲前积层', '黏土富集带', '河道滞留砾石'],
    ice: ['地表霜斑', '多边形裂隙', '浅层冰雷达异常'],
    vent: ['熔岩流边缘', '火山弹沉积', '冷却节理'],
    meteor: ['铁质陨石', '冲击玻璃', '溅射毯碎屑'],
  }

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + fbm(i, site.lat, 9) * 1.2
    const r = 35 + fbm(i * 2, site.lon, 11) * 90 + (i % 3) * 20
    const kind = kinds[i % kinds.length]
    const namePool = labels[kind]
    targets.push({
      id: `t${i}`,
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      label: namePool[i % namePool.length],
      kind,
      collected: false,
      value: 10 + Math.floor(site.scienceRichness * 20) + (kind === 'delta' || kind === 'ice' ? 8 : 0),
    })
  }
  return targets
}

export interface MissionState {
  site: LandingSite
  targets: ScienceTarget[]
  score: number
  objectivesDone: number
  messageLog: { t: number; text: string }[]
  complete: boolean
  failed: boolean
}

export function createMission(site: LandingSite): MissionState {
  return {
    site,
    targets: generateTargets(site),
    score: 0,
    objectivesDone: 0,
    messageLog: [{ t: 0, text: `着陆确认：${site.name}（${site.nameEn}）` }],
    complete: false,
    failed: false,
  }
}

export function tryCollectNear(
  mission: MissionState,
  x: number,
  y: number,
  radius = 6,
): ScienceTarget | null {
  for (const t of mission.targets) {
    if (t.collected) continue
    if (Math.hypot(t.x - x, t.y - y) <= radius) {
      t.collected = true
      mission.score += t.value
      mission.objectivesDone += 1
      mission.messageLog.unshift({
        t: performance.now(),
        text: `已采集：${t.label}（+${t.value} 科研分）`,
      })
      if (mission.objectivesDone >= 4) {
        mission.complete = true
        mission.messageLog.unshift({
          t: performance.now(),
          text: '主要科学目标已完成。可继续勘探或返回总结。',
        })
      }
      return t
    }
  }
  return null
}
