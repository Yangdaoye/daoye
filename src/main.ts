import './style.css'
import { createMarsScene } from './marsScene'
import {
  BUILDINGS,
  buildFacility,
  createColonyState,
  getColonyLevel,
  getHabitatCapacity,
  launchExpedition,
  requestSupply,
  tickColony,
  type BuildingKey,
  type ColonyState,
  type ResourceKey,
} from './colony'
import {
  createInitialState,
  formatSolHour,
  tickState,
  type SimState,
} from './simulation'

const RESOURCE_META: Record<ResourceKey, { label: string; unit: string; icon: string }> = {
  oxygen: { label: '氧气', unit: '%', icon: 'O₂' },
  water: { label: '水', unit: '%', icon: 'H₂O' },
  food: { label: '食物', unit: '%', icon: 'FD' },
  power: { label: '电力', unit: '%', icon: '⚡' },
  materials: { label: '建材', unit: ' u', icon: 'MAT' },
  science: { label: '科研', unit: ' pt', icon: 'SCI' },
}

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <canvas id="mars-canvas" aria-label="火星三维拓荒模拟画布"></canvas>
  <div class="scanlines" aria-hidden="true"></div>
  <main class="command-ui">
    <header class="topbar">
      <div class="brand">
        <div class="brand__identity">
          <span class="brand__pulse" aria-hidden="true"></span>
          <div>
            <h1 class="brand__name">火星拓荒局</h1>
            <p class="brand__sub">ARES FRONTIER CONTROL</p>
          </div>
        </div>
        <div class="mission-badge">
          <span>任务</span>
          <strong>曙光基地 · UTOPIA 01</strong>
        </div>
      </div>

      <div class="mission-clock">
        <div>
          <span class="eyebrow">任务时间</span>
          <strong id="mission-sol">SOL 001</strong>
        </div>
        <div>
          <span class="eyebrow">火星当地时</span>
          <strong id="mission-time">09:30</strong>
        </div>
        <div class="link-status"><i></i> 地球链路在线</div>
      </div>
    </header>

    <aside class="rail rail--left">
      <section class="panel colony-card">
        <div class="panel__head">
          <div>
            <span class="eyebrow">COLONY STATUS</span>
            <h2>殖民地状态</h2>
          </div>
          <span class="status-chip status-chip--good" id="colony-status">运行稳定</span>
        </div>
        <div class="crew-overview">
          <div class="crew-count">
            <span id="population">06</span>
            <small>拓荒者</small>
          </div>
          <div class="crew-stat">
            <span>士气 <b id="morale">86%</b></span>
            <div class="mini-bar"><i id="morale-bar" style="width:86%"></i></div>
            <span>基地完整度 <b id="integrity">100%</b></span>
            <div class="mini-bar"><i id="integrity-bar" style="width:100%"></i></div>
          </div>
        </div>
      </section>

      <section class="panel resources-panel">
        <div class="panel__head">
          <div>
            <span class="eyebrow">LIFE SUPPORT</span>
            <h2>生存资源</h2>
          </div>
          <span class="tiny-label">每 Sol 净变化</span>
        </div>
        <div class="resource-list" id="resource-list"></div>
      </section>

      <section class="panel environment-panel">
        <div class="panel__head compact">
          <div>
            <span class="eyebrow">EXTERNAL</span>
            <h2>地表环境</h2>
          </div>
          <button class="icon-btn" id="btn-storm" aria-label="切换尘暴">尘暴</button>
        </div>
        <div class="environment-grid">
          <div><span>温度</span><strong id="env-temp">—</strong></div>
          <div><span>风速</span><strong id="env-wind">—</strong></div>
          <div><span>辐射</span><strong id="env-rad">—</strong></div>
          <div><span>尘暴</span><strong id="env-dust">18%</strong></div>
        </div>
      </section>
    </aside>

    <section class="planet-stage">
      <div class="target-reticle" aria-hidden="true">
        <span></span>
        <i></i>
      </div>
      <div class="site-card">
        <span class="site-card__index">01</span>
        <div>
          <small>UTOPIA PLANITIA · 25.2°N 110.1°E</small>
          <strong>曙光基地</strong>
          <em><i></i> 信标已锁定</em>
        </div>
      </div>
      <p class="interaction-hint">拖拽旋转星球 · 滚轮缩放</p>
    </section>

    <aside class="rail rail--right">
      <section class="panel build-panel">
        <div class="panel__head">
          <div>
            <span class="eyebrow">CONSTRUCTION</span>
            <h2>基地建设</h2>
          </div>
          <span class="material-stock"><b id="material-stock">165</b> 建材</span>
        </div>
        <div class="build-list" id="build-list"></div>
      </section>

      <section class="panel milestone-panel">
        <div class="panel__head compact">
          <div>
            <span class="eyebrow">MILESTONE</span>
            <h2>拓荒里程碑</h2>
          </div>
          <strong id="milestone-percent">28%</strong>
        </div>
        <div class="milestone-track"><i id="milestone-bar" style="width:28%"></i></div>
        <p id="milestone-copy">建造冰层提取站，使基地获得稳定水源。</p>
      </section>
    </aside>

    <footer class="command-deck">
      <section class="panel event-log">
        <div class="panel__head compact">
          <div>
            <span class="eyebrow">MISSION LOG</span>
            <h2>任务日志</h2>
          </div>
          <span class="live-dot">实时</span>
        </div>
        <div class="log-list" id="log-list"></div>
      </section>

      <section class="panel operations">
        <div class="operation-main">
          <button class="operation-btn operation-btn--primary" id="btn-expedition">
            <span class="operation-icon">◎</span>
            <span><small>ROVER MISSION</small><strong>派遣火星车勘探</strong></span>
            <em id="expedition-state">可执行</em>
          </button>
          <button class="operation-btn" id="btn-supply">
            <span class="operation-icon">↓</span>
            <span><small>ORBITAL CARGO</small><strong>申请轨道补给</strong></span>
            <em id="supply-state">窗口开放</em>
          </button>
        </div>
        <div class="sim-controls">
          <div class="view-switch">
            <button class="is-active" id="btn-orbit">轨道</button>
            <button id="btn-surface">近地</button>
          </div>
          <button class="pause-btn" id="btn-pause" aria-label="暂停模拟">Ⅱ</button>
          <label class="speed-control">
            <span>模拟速度</span>
            <select id="ctrl-speed">
              <option value="0.5">0.5×</option>
              <option value="1" selected>1×</option>
              <option value="2">2×</option>
              <option value="4">4×</option>
            </select>
          </label>
        </div>
      </section>
    </footer>
  </main>

  <div class="toast" id="toast" role="status">
    <i></i>
    <span id="toast-message"></span>
  </div>
`

const canvas = query<HTMLCanvasElement>('#mars-canvas')
const scene = createMarsScene(canvas)
const sim: SimState = createInitialState()
const colony: ColonyState = createColonyState()

const resourceList = query('#resource-list')
const buildList = query('#build-list')
const logList = query('#log-list')
const toast = query('#toast')
const toastMessage = query('#toast-message')
let toastTimer = 0
let lastRenderedLog = 0

resourceList.innerHTML = (Object.keys(RESOURCE_META) as ResourceKey[])
  .map((key) => {
    const meta = RESOURCE_META[key]
    return `
      <div class="resource-row" data-resource="${key}">
        <span class="resource-icon">${meta.icon}</span>
        <div class="resource-data">
          <div><span>${meta.label}</span><b id="resource-${key}">—</b></div>
          <div class="resource-track"><i id="resource-bar-${key}"></i></div>
        </div>
        <em id="resource-rate-${key}">—</em>
      </div>
    `
  })
  .join('')

buildList.innerHTML = BUILDINGS.map(
  (building) => `
    <button class="build-card" data-build="${building.key}">
      <span class="build-code">${building.code}</span>
      <span class="build-copy">
        <strong>${building.name}</strong>
        <small>${building.description}</small>
      </span>
      <span class="build-cost"><b>${building.cost}</b> MAT</span>
      <span class="build-count" id="count-${building.key}">×0</span>
    </button>
  `,
).join('')

buildList.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-build]')
  if (!button) return
  const result = buildFacility(colony, button.dataset.build as BuildingKey)
  showToast(result.message, result.ok)
  renderColony(true)
})

query('#btn-expedition').addEventListener('click', () => {
  const result = launchExpedition(colony)
  showToast(result.message, result.ok)
  renderColony(true)
})

query('#btn-supply').addEventListener('click', () => {
  const result = requestSupply(colony)
  showToast(result.message, result.ok)
  renderColony(true)
})

query('#btn-storm').addEventListener('click', (event) => {
  sim.stormActive = !sim.stormActive
  sim.stormSettling = !sim.stormActive
  if (sim.stormActive) sim.dust = Math.max(0.48, sim.dust)
  ;(event.currentTarget as HTMLElement).classList.toggle('is-active', sim.stormActive)
  showToast(sim.stormActive ? '区域尘暴模拟已启动，太阳能效率正在下降。' : '尘暴模拟结束，悬浮尘埃开始沉降。', !sim.stormActive)
})

query('#btn-orbit').addEventListener('click', () => setView('orbit'))
query('#btn-surface').addEventListener('click', () => setView('surface'))

query<HTMLButtonElement>('#btn-pause').addEventListener('click', (event) => {
  colony.running = !colony.running
  const button = event.currentTarget as HTMLButtonElement
  button.textContent = colony.running ? 'Ⅱ' : '▶'
  button.classList.toggle('is-paused', !colony.running)
  showToast(colony.running ? '模拟继续运行。' : '模拟已暂停。', true)
})

query<HTMLSelectElement>('#ctrl-speed').addEventListener('change', (event) => {
  colony.speed = Number((event.target as HTMLSelectElement).value)
  sim.timeScale = colony.speed
})

function setView(mode: 'orbit' | 'surface') {
  scene.setViewMode(mode)
  query('#btn-orbit').classList.toggle('is-active', mode === 'orbit')
  query('#btn-surface').classList.toggle('is-active', mode === 'surface')
  if (mode === 'surface') sim.autoRotate = false
}

function showToast(message: string, success: boolean) {
  window.clearTimeout(toastTimer)
  toastMessage.textContent = message
  toast.classList.toggle('is-warning', !success)
  toast.classList.add('is-visible')
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3400)
}

function renderColony(forceLogs = false) {
  query('#mission-sol').textContent = `SOL ${String(colony.sol).padStart(3, '0')}`
  query('#population').textContent = String(colony.population).padStart(2, '0')
  query('#morale').textContent = `${Math.round(colony.morale)}%`
  query('#integrity').textContent = `${Math.round(colony.integrity)}%`
  query<HTMLElement>('#morale-bar').style.width = `${colony.morale}%`
  query<HTMLElement>('#integrity-bar').style.width = `${colony.integrity}%`
  query('#material-stock').textContent = Math.floor(colony.resources.materials.value).toString()

  const criticalResource = (Object.keys(RESOURCE_META) as ResourceKey[]).some(
    (key) => colony.resources[key].value / colony.resources[key].capacity < 0.16,
  )
  const colonyStatus = query('#colony-status')
  colonyStatus.textContent = criticalResource ? '资源告警' : sim.dust > 0.72 ? '尘暴模式' : '运行稳定'
  colonyStatus.classList.toggle('status-chip--warning', criticalResource || sim.dust > 0.72)
  colonyStatus.classList.toggle('status-chip--good', !criticalResource && sim.dust <= 0.72)

  ;(Object.keys(RESOURCE_META) as ResourceKey[]).forEach((key) => {
    const resource = colony.resources[key]
    const meta = RESOURCE_META[key]
    const percentage = (resource.value / resource.capacity) * 100
    query(`#resource-${key}`).textContent = `${Math.floor(resource.value)}${meta.unit}`
    const bar = query<HTMLElement>(`#resource-bar-${key}`)
    bar.style.width = `${percentage}%`
    bar.classList.toggle('is-low', percentage < 22)
    const rate = query(`#resource-rate-${key}`)
    const prefix = resource.rate > 0 ? '+' : ''
    rate.textContent = `${prefix}${resource.rate.toFixed(1)}`
    rate.classList.toggle('is-positive', resource.rate > 0.04)
    rate.classList.toggle('is-negative', resource.rate < -0.04)
  })

  BUILDINGS.forEach((building) => {
    query(`#count-${building.key}`).textContent = `×${colony.buildings[building.key]}`
  })

  const level = getColonyLevel(colony)
  const milestone = Math.min(100, level * 14)
  query('#milestone-percent').textContent = `${milestone}%`
  query<HTMLElement>('#milestone-bar').style.width = `${milestone}%`
  query('#milestone-copy').textContent = getMilestoneCopy()

  const expeditionState = query('#expedition-state')
  expeditionState.textContent =
    colony.expeditionCooldown > 0 ? `整备 ${colony.expeditionCooldown.toFixed(1)} Sol` : '可执行'
  query<HTMLButtonElement>('#btn-expedition').disabled = colony.expeditionCooldown > 0

  query('#supply-state').textContent = colony.supplyAvailable ? '窗口开放' : '等待窗口'
  query<HTMLButtonElement>('#btn-supply').disabled = !colony.supplyAvailable

  if (forceLogs || colony.logs[0]?.id !== lastRenderedLog) {
    lastRenderedLog = colony.logs[0]?.id ?? 0
    logList.innerHTML = colony.logs
      .slice(0, 4)
      .map(
        (log) => `
          <div class="log-item log-item--${log.tone}">
            <time>${log.time}</time>
            <i></i>
            <p>${log.message}</p>
          </div>
        `,
      )
      .join('')
  }
}

function getMilestoneCopy(): string {
  if (colony.buildings.extractor === 0) return '建造冰层提取站，使基地获得稳定水源。'
  if (colony.buildings.lab === 0) return '部署火星科研站，启动原位资源研究。'
  if (getHabitatCapacity(colony) < 10) return '扩建居住舱，为下一批拓荒者做好准备。'
  return '基地已具备自持能力：继续扩大科研与生产网络。'
}

function query<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

let last = performance.now()
let renderAccumulator = 0

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  const telemetry = tickState(sim, colony.running ? dt : 0)
  const daylight = Math.max(0, Math.cos(((sim.solHour - 12) / 12) * Math.PI))
  tickColony(colony, dt, sim.dust, daylight)

  query('#mission-time').textContent = formatSolHour(sim.solHour)
  query('#env-temp').textContent = `${telemetry.temperatureC.toFixed(0)}°C`
  query('#env-wind').textContent = `${telemetry.windMs.toFixed(1)} m/s`
  query('#env-rad').textContent = `${telemetry.radiationMsv.toFixed(2)} mSv`
  query('#env-dust').textContent = `${Math.round(sim.dust * 100)}%`

  renderAccumulator += dt
  if (renderAccumulator > 0.18) {
    renderColony()
    renderAccumulator = 0
  }

  scene.setColonyLevel(getColonyLevel(colony))
  scene.update(sim, dt)
  requestAnimationFrame(frame)
}

renderColony(true)
requestAnimationFrame(frame)
