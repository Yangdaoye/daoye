import './style.css'
import {
  createRoverScene,
  type DriveControl,
  type RoverEvent,
  type RoverTelemetry,
} from './roverScene'
import { createInitialState, formatSolHour, tickState, type SimState } from './simulation'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <canvas id="mars-canvas" aria-label="火星车第一视角驾驶画面"></canvas>
  <div class="screen-grain" aria-hidden="true"></div>
  <main class="rover-ui">
    <header class="topbar">
      <div class="brand">
        <span class="brand__pulse"></span>
        <div>
          <h1>寻路者 <b>07</b></h1>
          <p>ARES FRONTIER · SURFACE ROVER</p>
        </div>
      </div>
      <div class="mission-title">
        <span>当前任务</span>
        <strong>乌托邦平原 · 原位资源勘探</strong>
      </div>
      <div class="mission-clock">
        <div><span>SOL</span><strong id="sol">001</strong></div>
        <div><span>火星时</span><strong id="clock">09:30</strong></div>
        <div class="signal"><i></i> 遥测在线</div>
      </div>
    </header>

    <aside class="hud-panel hud-panel--left">
      <section class="panel telemetry-panel">
        <div class="panel-title">
          <div><span>ROVER TELEMETRY</span><h2>小车遥测</h2></div>
          <em id="drive-status">待机</em>
        </div>
        <div class="speedometer">
          <strong id="speed">0.0</strong>
          <span>km/h</span>
          <div class="speed-track"><i id="speed-bar"></i></div>
        </div>
        <div class="telemetry-grid">
          <div><span>航向</span><strong id="heading">000°</strong></div>
          <div><span>坡度</span><strong id="slope">0.0°</strong></div>
          <div><span>里程</span><strong id="distance">0.0 m</strong></div>
          <div><span>电量</span><strong id="battery">96%</strong></div>
        </div>
        <div class="coordinate">
          <span>LOCAL POSITION</span>
          <strong id="coordinate">N 00.0 · E 00.0</strong>
        </div>
      </section>

      <section class="panel environment-panel">
        <div class="panel-title compact">
          <div><span>ENVIRONMENT</span><h2>环境监测</h2></div>
          <button class="tiny-btn" id="btn-storm">尘暴模拟</button>
        </div>
        <div class="environment-grid">
          <div><span>温度</span><b id="env-temp">—</b></div>
          <div><span>气压</span><b id="env-pressure">—</b></div>
          <div><span>风速</span><b id="env-wind">—</b></div>
          <div><span>辐射</span><b id="env-rad">—</b></div>
        </div>
      </section>

      <section class="panel nav-panel">
        <div class="panel-title compact">
          <div><span>NAVIGATION</span><h2>驾驶提示</h2></div>
        </div>
        <div class="key-guide">
          <div class="keys">
            <kbd>W</kbd>
            <span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
          </div>
          <p>WASD / 方向键驾驶<br>拖拽画面转动视角</p>
        </div>
      </section>
    </aside>

    <section class="viewport-hud">
      <div class="horizon">
        <span>-10</span><i></i><strong>0</strong><i></i><span>+10</span>
      </div>
      <div class="crosshair" id="crosshair">
        <i></i><span></span><b></b>
      </div>
      <div class="target-distance" id="target-distance">NO TARGET</div>
      <div class="compass">
        <span>W</span><i></i><span>N</span><i></i><span>E</span>
        <b id="compass-heading">000°</b>
      </div>
      <div class="windshield-label windshield-label--left">CAM 01 · NAV</div>
      <div class="windshield-label windshield-label--right">拖拽查看 · WASD 驾驶</div>
    </section>

    <aside class="hud-panel hud-panel--right">
      <section class="panel scanner-panel">
        <div class="panel-title">
          <div><span>RAMAN / LIBS</span><h2>物质扫描仪</h2></div>
          <em id="scanner-status">就绪</em>
        </div>
        <div class="scanner-visual">
          <div class="scanner-ring"><i></i><span id="scan-formula">?</span></div>
          <div class="spectrum" aria-hidden="true">
            <i style="height:35%"></i><i style="height:62%"></i><i style="height:44%"></i>
            <i style="height:88%"></i><i style="height:51%"></i><i style="height:76%"></i>
            <i style="height:28%"></i><i style="height:68%"></i><i style="height:42%"></i>
          </div>
        </div>
        <div class="sample-data">
          <span>目标物质</span>
          <strong id="sample-name">未锁定</strong>
          <p id="sample-composition">按下扫描按钮，分析 34 m 范围内的矿物。</p>
          <div><span>距离</span><b id="sample-distance">—</b></div>
          <div><span>采集条件</span><b id="sample-range">≤ 4.2 m</b></div>
        </div>
        <button class="action-btn action-btn--scan" id="btn-scan">
          <span>⌁</span>
          <div><small>SPACE</small><strong>扫描附近物质</strong></div>
        </button>
      </section>

      <section class="panel storage-panel">
        <div class="panel-title compact">
          <div><span>SAMPLE BAY</span><h2>样本舱</h2></div>
          <em id="storage-count">0 / 6</em>
        </div>
        <div class="storage-slots" id="storage-slots">
          ${Array.from({ length: 6 }, (_, index) => `<div class="storage-slot"><span>0${index + 1}</span><i></i><b>空</b></div>`).join('')}
        </div>
      </section>
    </aside>

    <footer class="control-deck">
      <section class="panel event-panel">
        <div class="panel-title compact">
          <div><span>MISSION FEED</span><h2>任务反馈</h2></div>
          <em class="live"><i></i> LIVE</em>
        </div>
        <div class="event-list" id="event-list">
          <div class="event event--info"><time>09:30</time><i></i><p>寻路者 07 已离开曙光基地，开始地表资源勘探。</p></div>
          <div class="event event--success"><time>09:31</time><i></i><p>机械臂自检完成，六轴关节与夹爪状态正常。</p></div>
        </div>
      </section>

      <section class="panel arm-panel" id="arm-panel">
        <div class="arm-status">
          <span class="arm-icon">ARM</span>
          <div><small>六轴机械臂</small><strong id="arm-state">待命</strong></div>
        </div>
        <div class="arm-diagram" aria-hidden="true">
          <i></i><i></i><span></span><b></b>
        </div>
        <button class="action-btn action-btn--grab" id="btn-collect">
          <span>⌾</span>
          <div><small>E · RANGE 4.2 M</small><strong>展开机械臂夹取</strong></div>
        </button>
      </section>

      <section class="drive-controls">
        <div class="drive-pad" aria-label="小车方向控制">
          <button data-control="forward" aria-label="前进">▲</button>
          <button data-control="left" aria-label="左转">◀</button>
          <button data-control="backward" aria-label="后退">▼</button>
          <button data-control="right" aria-label="右转">▶</button>
        </div>
        <div class="system-buttons">
          <button id="btn-lights"><i></i> 前灯</button>
          <button id="btn-reset">↺ 复位</button>
          <label>模拟速度
            <select id="speed-select">
              <option value="0.5">0.5×</option>
              <option value="1" selected>1×</option>
              <option value="2">2×</option>
            </select>
          </label>
        </div>
      </section>
    </footer>
  </main>
  <div class="toast" id="toast"><i></i><span id="toast-message"></span></div>
`

const canvas = query<HTMLCanvasElement>('#mars-canvas')
const rover = createRoverScene(canvas)
const simulation: SimState = createInitialState()
simulation.autoRotate = false
simulation.dust = 0.16

const events: Array<RoverEvent & { time: string }> = [
  { tone: 'info', message: '寻路者 07 已离开曙光基地，开始地表资源勘探。', time: '09:30' },
  { tone: 'success', message: '机械臂自检完成，六轴关节与夹爪状态正常。', time: '09:31' },
]
let toastTimer = 0
let lastStorageCount = 0

query('#btn-scan').addEventListener('click', () => handleEvent(rover.scan()))
query('#btn-collect').addEventListener('click', () => handleEvent(rover.collect()))

query('#btn-storm').addEventListener('click', (event) => {
  simulation.stormActive = !simulation.stormActive
  simulation.stormSettling = !simulation.stormActive
  if (simulation.stormActive) simulation.dust = Math.max(0.5, simulation.dust)
  ;(event.currentTarget as HTMLButtonElement).classList.toggle('is-active', simulation.stormActive)
  handleEvent({
    tone: simulation.stormActive ? 'warning' : 'success',
    message: simulation.stormActive
      ? '区域尘暴增强：能见度下降，请降低车速。'
      : '尘暴开始消散，地表能见度逐步恢复。',
  })
})

query('#btn-lights').addEventListener('click', (event) => {
  const active = rover.toggleLights()
  ;(event.currentTarget as HTMLButtonElement).classList.toggle('is-active', active)
  handleEvent({ tone: 'info', message: active ? '前向照明灯已开启。' : '前向照明灯已关闭。' })
})

query('#btn-reset').addEventListener('click', () => {
  rover.resetPosition()
  handleEvent({ tone: 'info', message: '小车已返回勘探起点。' })
})

query<HTMLSelectElement>('#speed-select').addEventListener('change', (event) => {
  simulation.timeScale = Number((event.target as HTMLSelectElement).value)
})

document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
  const control = button.dataset.control as DriveControl
  const activate = (event: Event) => {
    event.preventDefault()
    rover.setControl(control, true)
    button.classList.add('is-active')
  }
  const deactivate = (event: Event) => {
    event.preventDefault()
    rover.setControl(control, false)
    button.classList.remove('is-active')
  }
  button.addEventListener('pointerdown', activate)
  button.addEventListener('pointerup', deactivate)
  button.addEventListener('pointerleave', deactivate)
  button.addEventListener('pointercancel', deactivate)
})

function handleEvent(event: RoverEvent) {
  events.unshift({ ...event, time: formatSolHour(simulation.solHour) })
  events.splice(5)
  renderEvents()
  showToast(event)
}

function renderEvents() {
  query('#event-list').innerHTML = events
    .map(
      (event) => `
        <div class="event event--${event.tone}">
          <time>${event.time}</time><i></i><p>${event.message}</p>
        </div>
      `,
    )
    .join('')
}

function showToast(event: RoverEvent) {
  window.clearTimeout(toastTimer)
  const toast = query('#toast')
  query('#toast-message').textContent = event.message
  toast.className = `toast toast--${event.tone} is-visible`
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200)
}

function renderTelemetry(data: RoverTelemetry) {
  query('#speed').textContent = data.speed.toFixed(1)
  query<HTMLElement>('#speed-bar').style.width = `${Math.min(100, (data.speed / 16) * 100)}%`
  query('#heading').textContent = `${String(Math.round(data.heading)).padStart(3, '0')}°`
  query('#compass-heading').textContent = `${String(Math.round(data.heading)).padStart(3, '0')}°`
  query('#slope').textContent = `${data.slope >= 0 ? '+' : ''}${data.slope.toFixed(1)}°`
  query('#distance').textContent = `${data.distance.toFixed(1)} m`
  query('#battery').textContent = `${Math.round(data.battery)}%`
  query('#coordinate').textContent = `${data.z >= 0 ? 'N' : 'S'} ${Math.abs(data.z).toFixed(1)} · ${data.x >= 0 ? 'E' : 'W'} ${Math.abs(data.x).toFixed(1)}`
  query('#drive-status').textContent = data.speed > 0.2 ? '行驶中' : '待机'

  const armLabels: Record<RoverTelemetry['armState'], string> = {
    standby: '待命',
    tracking: '目标锁定',
    collecting: '夹取中',
    secured: '样本已密封',
  }
  query('#arm-state').textContent = armLabels[data.armState]
  query('#arm-panel').classList.toggle('is-active', data.armState === 'collecting')

  if (data.target) {
    query('#scanner-status').textContent = '已锁定'
    query('#scan-formula').textContent = data.target.formula
    query('#sample-name').textContent = data.target.name
    query('#sample-composition').textContent = data.target.composition
    query('#sample-distance').textContent = `${data.targetDistance.toFixed(1)} m`
    query('#sample-range').textContent = data.targetDistance <= 4.2 ? '可采集' : '距离过远'
    query('#target-distance').textContent = `TARGET ${data.targetDistance.toFixed(1)} M`
    query('#crosshair').classList.add('has-target')
    query<HTMLButtonElement>('#btn-collect').disabled =
      data.targetDistance > 4.2 || data.armState === 'collecting'
  } else {
    query('#scanner-status').textContent = '就绪'
    query('#scan-formula').textContent = '?'
    query('#sample-name').textContent = '未锁定'
    query('#sample-composition').textContent = '按下扫描按钮，分析 34 m 范围内的矿物。'
    query('#sample-distance').textContent = '—'
    query('#sample-range').textContent = '≤ 4.2 m'
    query('#target-distance').textContent = 'NO TARGET'
    query('#crosshair').classList.remove('has-target')
    query<HTMLButtonElement>('#btn-collect').disabled = true
  }

  if (data.storage.length !== lastStorageCount) {
    lastStorageCount = data.storage.length
    query('#storage-count').textContent = `${data.storage.length} / 6`
    document.querySelectorAll<HTMLElement>('.storage-slot').forEach((slot, index) => {
      const sample = data.storage[index]
      slot.classList.toggle('is-filled', Boolean(sample))
      slot.querySelector('b')!.textContent = sample ? sample.formula : '空'
      if (sample) slot.style.setProperty('--sample-color', `#${sample.color.toString(16).padStart(6, '0')}`)
    })
  }
}

function query<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

let previous = performance.now()
let renderTimer = 0

function frame(now: number) {
  const dt = Math.min(0.05, (now - previous) / 1000)
  previous = now
  const telemetry = tickState(simulation, dt)

  query('#clock').textContent = formatSolHour(simulation.solHour)
  query('#env-temp').textContent = `${telemetry.temperatureC.toFixed(0)}°C`
  query('#env-pressure').textContent = `${telemetry.pressurePa.toFixed(0)} Pa`
  query('#env-wind').textContent = `${telemetry.windMs.toFixed(1)} m/s`
  query('#env-rad').textContent = `${telemetry.radiationMsv.toFixed(2)} mSv`

  rover.update(simulation, dt)
  const asyncEvent = rover.consumeEvent()
  if (asyncEvent) handleEvent(asyncEvent)

  renderTimer += dt
  if (renderTimer > 0.08) {
    renderTelemetry(rover.getTelemetry())
    renderTimer = 0
  }
  requestAnimationFrame(frame)
}

renderTelemetry(rover.getTelemetry())
requestAnimationFrame(frame)
