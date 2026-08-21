export type ResourceKey = 'oxygen' | 'water' | 'food' | 'power' | 'materials' | 'science'
export type BuildingKey = 'solar' | 'extractor' | 'greenhouse' | 'habitat' | 'lab'

export type Resource = {
  value: number
  capacity: number
  rate: number
}

export type ColonyState = {
  sol: number
  solProgress: number
  population: number
  morale: number
  integrity: number
  resources: Record<ResourceKey, Resource>
  buildings: Record<BuildingKey, number>
  running: boolean
  speed: number
  expeditionCooldown: number
  supplyAvailable: boolean
  logs: ColonyLog[]
}

export type ColonyLog = {
  id: number
  tone: 'info' | 'success' | 'warning'
  time: string
  message: string
}

export type BuildingDefinition = {
  key: BuildingKey
  name: string
  code: string
  description: string
  cost: number
  power: number
}

export const BUILDINGS: BuildingDefinition[] = [
  {
    key: 'solar',
    name: '太阳能阵列',
    code: 'SOLAR',
    description: '提高昼间发电能力，为基地设施供能。',
    cost: 35,
    power: 18,
  },
  {
    key: 'extractor',
    name: '冰层提取站',
    code: 'WATER',
    description: '从地下冻土中持续提取可用水。',
    cost: 55,
    power: -7,
  },
  {
    key: 'greenhouse',
    name: '生态温室',
    code: 'BIO',
    description: '生产食物与氧气，消耗少量水和电力。',
    cost: 70,
    power: -9,
  },
  {
    key: 'habitat',
    name: '加压居住舱',
    code: 'HAB',
    description: '增加 4 人生存容量并改善士气。',
    cost: 90,
    power: -5,
  },
  {
    key: 'lab',
    name: '火星科研站',
    code: 'LAB',
    description: '将现场数据转化为科研点数。',
    cost: 80,
    power: -8,
  },
]

let logId = 1

export function createColonyState(): ColonyState {
  return {
    sol: 1,
    solProgress: 0.38,
    population: 6,
    morale: 86,
    integrity: 100,
    resources: {
      oxygen: { value: 82, capacity: 100, rate: -0.7 },
      water: { value: 68, capacity: 100, rate: -0.45 },
      food: { value: 74, capacity: 100, rate: -0.35 },
      power: { value: 76, capacity: 100, rate: 1.2 },
      materials: { value: 165, capacity: 300, rate: 0 },
      science: { value: 18, capacity: 250, rate: 0 },
    },
    buildings: {
      solar: 1,
      extractor: 0,
      greenhouse: 1,
      habitat: 1,
      lab: 0,
    },
    running: true,
    speed: 1,
    expeditionCooldown: 0,
    supplyAvailable: true,
    logs: [
      makeLog('success', '着陆器「曙光号」已建立稳定通信。', '06:14'),
      makeLog('info', '首批拓荒者完成居住舱压力检测。', '06:31'),
      makeLog('warning', '氧储备低于长期安全线，建议扩建生态温室。', '06:52'),
    ],
  }
}

export function tickColony(state: ColonyState, dt: number, dust: number, daylight: number): void {
  if (!state.running) return

  // One real second advances roughly 0.0125 Sol at 1×.
  const solDelta = dt * 0.0125 * state.speed
  state.solProgress += solDelta

  while (state.solProgress >= 1) {
    state.solProgress -= 1
    state.sol += 1
    resolveDailyEvent(state, dust)
  }

  const b = state.buildings
  const solarEfficiency = Math.max(0.12, daylight) * (1 - dust * 0.72)
  const powerGeneration = b.solar * 4.4 * solarEfficiency
  const powerDemand = 1.9 + b.extractor * 0.85 + b.greenhouse * 1.05 + b.habitat * 0.55 + b.lab * 0.95
  const powerRate = powerGeneration - powerDemand
  const powered = state.resources.power.value > 2 || powerRate > 0

  const oxygenRate = (powered ? b.greenhouse * 1.3 : 0.15) - state.population * 0.19
  const waterRate = (powered ? b.extractor * 1.75 : 0) - state.population * 0.1 - b.greenhouse * 0.18
  const foodRate = (powered ? b.greenhouse * 0.7 : 0) - state.population * 0.12
  const scienceRate = powered ? b.lab * 0.42 : 0

  state.resources.power.rate = powerRate
  state.resources.oxygen.rate = oxygenRate
  state.resources.water.rate = waterRate
  state.resources.food.rate = foodRate
  state.resources.science.rate = scienceRate

  advanceResource(state.resources.power, powerRate * solDelta)
  advanceResource(state.resources.oxygen, oxygenRate * solDelta)
  advanceResource(state.resources.water, waterRate * solDelta)
  advanceResource(state.resources.food, foodRate * solDelta)
  advanceResource(state.resources.science, scienceRate * solDelta)

  if (state.expeditionCooldown > 0) {
    state.expeditionCooldown = Math.max(0, state.expeditionCooldown - solDelta)
  }

  const critical = ['oxygen', 'water', 'food'].some(
    (key) => state.resources[key as ResourceKey].value < 16,
  )
  if (critical) {
    state.morale = Math.max(20, state.morale - solDelta * 2.5)
    state.integrity = Math.max(35, state.integrity - solDelta * 0.7)
  } else {
    const habitatCapacity = b.habitat * 4 + 2
    const comfort = habitatCapacity >= state.population ? 0.35 : -0.6
    state.morale = clamp(state.morale + comfort * solDelta, 20, 100)
  }
}

export function buildFacility(state: ColonyState, key: BuildingKey): { ok: boolean; message: string } {
  const def = BUILDINGS.find((item) => item.key === key)!
  const materials = state.resources.materials

  if (materials.value < def.cost) {
    const message = `${def.name}需要 ${def.cost} 单位建材，当前储备不足。`
    pushLog(state, 'warning', message)
    return { ok: false, message }
  }

  if (key !== 'solar' && state.resources.power.value < 12) {
    const message = '基地电力过低，无法启动施工机械。'
    pushLog(state, 'warning', message)
    return { ok: false, message }
  }

  materials.value -= def.cost
  state.buildings[key] += 1

  if (key === 'habitat') state.morale = clamp(state.morale + 5, 0, 100)
  if (key === 'solar') state.resources.power.value = clamp(state.resources.power.value + 8, 0, 100)

  const message = `${def.name}完成部署，已接入「曙光基地」网络。`
  pushLog(state, 'success', message)
  return { ok: true, message }
}

export function launchExpedition(state: ColonyState): { ok: boolean; message: string } {
  if (state.expeditionCooldown > 0) {
    const message = `火星车仍在整备，需等待 ${state.expeditionCooldown.toFixed(1)} Sol。`
    pushLog(state, 'warning', message)
    return { ok: false, message }
  }
  if (state.resources.power.value < 14 || state.resources.oxygen.value < 10) {
    const message = '远征需要至少 14% 电力与 10% 氧储备。'
    pushLog(state, 'warning', message)
    return { ok: false, message }
  }

  state.resources.power.value -= 10
  state.resources.oxygen.value -= 4
  state.expeditionCooldown = 0.65

  const materialGain = 22 + Math.floor(Math.random() * 20)
  const scienceGain = 8 + Math.floor(Math.random() * 12)
  state.resources.materials.value = clamp(
    state.resources.materials.value + materialGain,
    0,
    state.resources.materials.capacity,
  )
  state.resources.science.value = clamp(
    state.resources.science.value + scienceGain,
    0,
    state.resources.science.capacity,
  )

  const message = `「寻路者」发现含水矿层：建材 +${materialGain}，科研 +${scienceGain}。`
  pushLog(state, 'success', message)
  return { ok: true, message }
}

export function requestSupply(state: ColonyState): { ok: boolean; message: string } {
  if (!state.supplyAvailable) {
    const message = '下一艘地火货运飞船尚未进入发射窗口。'
    pushLog(state, 'warning', message)
    return { ok: false, message }
  }

  state.supplyAvailable = false
  state.resources.materials.value = clamp(state.resources.materials.value + 80, 0, 300)
  state.resources.food.value = clamp(state.resources.food.value + 25, 0, 100)
  state.resources.oxygen.value = clamp(state.resources.oxygen.value + 18, 0, 100)
  state.resources.water.value = clamp(state.resources.water.value + 20, 0, 100)
  const message = '轨道补给舱精准着陆：建材、食物、氧气与水已入库。'
  pushLog(state, 'success', message)
  return { ok: true, message }
}

export function pushLog(
  state: ColonyState,
  tone: ColonyLog['tone'],
  message: string,
  time?: string,
): void {
  state.logs.unshift(makeLog(tone, message, time ?? `SOL ${state.sol}.${Math.floor(state.solProgress * 10)}`))
  state.logs = state.logs.slice(0, 8)
}

export function getColonyLevel(state: ColonyState): number {
  return Object.values(state.buildings).reduce((sum, count) => sum + count, 0)
}

export function getHabitatCapacity(state: ColonyState): number {
  return state.buildings.habitat * 4 + 2
}

function resolveDailyEvent(state: ColonyState, dust: number): void {
  if (state.sol % 4 === 0) {
    state.supplyAvailable = true
    pushLog(state, 'info', '地火转移窗口已开放，可申请一次轨道补给。')
  }

  if (dust > 0.78) {
    state.integrity = clamp(state.integrity - 2.5, 0, 100)
    pushLog(state, 'warning', '强尘暴冲击外部设备，基地完整度下降。')
  } else if (state.integrity < 100) {
    state.integrity = clamp(state.integrity + 1.2, 0, 100)
  }
}

function makeLog(tone: ColonyLog['tone'], message: string, time: string): ColonyLog {
  return { id: logId++, tone, message, time }
}

function advanceResource(resource: Resource, delta: number): void {
  resource.value = clamp(resource.value + delta, 0, resource.capacity)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
