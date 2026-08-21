import './style.css'
import { createMarsScene } from './marsScene'
import {
  createInitialState,
  formatPressure,
  formatRad,
  formatSolHour,
  formatTemp,
  formatWind,
  tickState,
  type SimState,
} from './simulation'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <canvas id="mars-canvas" aria-label="火星三维模拟画布"></canvas>
  <div class="hud">
    <header class="brand">
      <div class="brand__mark">
        <span class="brand__pulse" aria-hidden="true"></span>
        <h1 class="brand__name">火星模拟器</h1>
        <span class="brand__sub">Ares Sim</span>
      </div>
      <p class="brand__tagline">
        拖拽环绕红色星球，调节火时与尘暴强度，观测表面温度、气压与辐射的实时变化。
      </p>
    </header>

    <div class="stage">
      <p class="hint">拖拽旋转 · 滚轮缩放</p>
    </div>

    <div class="dock">
      <section class="panel" aria-label="表面遥测">
        <h2 class="panel__title">表面遥测</h2>
        <div class="telemetry">
          <div class="metric">
            <span class="metric__label">温度</span>
            <div class="metric__value" id="t-temp">—<span>°C</span></div>
          </div>
          <div class="metric">
            <span class="metric__label">气压</span>
            <div class="metric__value" id="t-pressure">—<span>Pa</span></div>
          </div>
          <div class="metric">
            <span class="metric__label">风速</span>
            <div class="metric__value" id="t-wind">—<span>m/s</span></div>
          </div>
          <div class="metric">
            <span class="metric__label">辐射</span>
            <div class="metric__value" id="t-rad">—<span>mSv/d</span></div>
          </div>
          <div class="metric">
            <span class="metric__label">火时</span>
            <div class="metric__value" id="t-solhour">—</div>
          </div>
          <div class="metric">
            <span class="metric__label">季节</span>
            <div class="metric__value" id="t-season">—</div>
          </div>
        </div>
      </section>

      <section class="panel" aria-label="模拟控制">
        <h2 class="panel__title">模拟控制</h2>
        <div class="controls">
          <div class="control">
            <label for="ctrl-hour">火时</label>
            <input id="ctrl-hour" type="range" min="0" max="24" step="0.05" value="9.5" />
            <output id="out-hour" for="ctrl-hour">09:30</output>
          </div>
          <div class="control">
            <label for="ctrl-dust">尘暴</label>
            <input id="ctrl-dust" type="range" min="0" max="1" step="0.01" value="0.18" />
            <output id="out-dust" for="ctrl-dust">18%</output>
          </div>
          <div class="control">
            <label for="ctrl-speed">时流速</label>
            <input id="ctrl-speed" type="range" min="0" max="8" step="0.1" value="1" />
            <output id="out-speed" for="ctrl-speed">1.0×</output>
          </div>
          <div class="control">
            <label for="ctrl-zoom">轨道距</label>
            <input id="ctrl-zoom" type="range" min="1.8" max="9" step="0.05" value="4.2" />
            <output id="out-zoom" for="ctrl-zoom">4.2</output>
          </div>
          <div class="actions">
            <button type="button" class="btn is-active" id="btn-orbit">轨道视角</button>
            <button type="button" class="btn" id="btn-surface">近地视角</button>
            <button type="button" class="btn" id="btn-rotate">自动旋转</button>
            <button type="button" class="btn" id="btn-storm">触发尘暴</button>
          </div>
        </div>
      </section>
    </div>
  </div>
`

const canvas = document.querySelector<HTMLCanvasElement>('#mars-canvas')!
const scene = createMarsScene(canvas)
const state: SimState = createInitialState()

const elTemp = document.querySelector('#t-temp')!
const elPressure = document.querySelector('#t-pressure')!
const elWind = document.querySelector('#t-wind')!
const elRad = document.querySelector('#t-rad')!
const elSolHour = document.querySelector('#t-solhour')!
const elSeason = document.querySelector('#t-season')!

const ctrlHour = document.querySelector<HTMLInputElement>('#ctrl-hour')!
const ctrlDust = document.querySelector<HTMLInputElement>('#ctrl-dust')!
const ctrlSpeed = document.querySelector<HTMLInputElement>('#ctrl-speed')!
const ctrlZoom = document.querySelector<HTMLInputElement>('#ctrl-zoom')!
const outHour = document.querySelector('#out-hour')!
const outDust = document.querySelector('#out-dust')!
const outSpeed = document.querySelector('#out-speed')!
const outZoom = document.querySelector('#out-zoom')!

const btnOrbit = document.querySelector('#btn-orbit')!
const btnSurface = document.querySelector('#btn-surface')!
const btnRotate = document.querySelector('#btn-rotate')!
const btnStorm = document.querySelector('#btn-storm')!

btnRotate.classList.toggle('is-active', state.autoRotate)

ctrlHour.addEventListener('input', () => {
  state.solHour = Number(ctrlHour.value)
  outHour.textContent = formatSolHour(state.solHour)
})

ctrlDust.addEventListener('input', () => {
  state.dust = Number(ctrlDust.value)
  state.stormActive = false
  btnStorm.classList.remove('is-active')
  outDust.textContent = `${Math.round(state.dust * 100)}%`
})

ctrlSpeed.addEventListener('input', () => {
  state.timeScale = Number(ctrlSpeed.value)
  outSpeed.textContent = `${state.timeScale.toFixed(1)}×`
})

ctrlZoom.addEventListener('input', () => {
  state.cameraDistance = Number(ctrlZoom.value)
  outZoom.textContent = state.cameraDistance.toFixed(1)
})

btnOrbit.addEventListener('click', () => {
  scene.setViewMode('orbit')
  btnOrbit.classList.add('is-active')
  btnSurface.classList.remove('is-active')
})

btnSurface.addEventListener('click', () => {
  scene.setViewMode('surface')
  btnSurface.classList.add('is-active')
  btnOrbit.classList.remove('is-active')
})

btnRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate
  btnRotate.classList.toggle('is-active', state.autoRotate)
})

btnStorm.addEventListener('click', () => {
  state.stormActive = !state.stormActive
  btnStorm.classList.toggle('is-active', state.stormActive)
  if (state.stormActive && state.dust < 0.35) {
    state.dust = 0.35
    ctrlDust.value = String(state.dust)
  }
})

let last = performance.now()

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  const telemetry = tickState(state, dt)

  // Sync sliders when clock / storm auto-updates
  if (document.activeElement !== ctrlHour) {
    ctrlHour.value = String(state.solHour)
    outHour.textContent = formatSolHour(state.solHour)
  }
  if (document.activeElement !== ctrlDust) {
    ctrlDust.value = String(state.dust)
    outDust.textContent = `${Math.round(state.dust * 100)}%`
  }

  elTemp.innerHTML = `${formatTemp(telemetry.temperatureC)}<span>°C</span>`
  elPressure.innerHTML = `${formatPressure(telemetry.pressurePa)}<span>Pa</span>`
  elWind.innerHTML = `${formatWind(telemetry.windMs)}<span>m/s</span>`
  elRad.innerHTML = `${formatRad(telemetry.radiationMsv)}<span>mSv/d</span>`
  elSolHour.textContent = formatSolHour(state.solHour)
  elSeason.textContent = telemetry.season

  scene.update(state, dt)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
