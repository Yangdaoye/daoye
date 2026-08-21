import './style.css'
import { MarsScene } from './marsScene.js'
import { MarsSimulation, SPEEDS } from './simulation.js'

const canvas = document.querySelector('#mars-canvas')
const scene = new MarsScene(canvas)
const sim = new MarsSimulation()

const els = {
  solClock: document.querySelector('#sol-clock'),
  temp: document.querySelector('#m-temp'),
  pressure: document.querySelector('#m-pressure'),
  wind: document.querySelector('#m-wind'),
  rad: document.querySelector('#m-rad'),
  vis: document.querySelector('#m-vis'),
  sun: document.querySelector('#m-sun'),
  speed: document.querySelector('#speed'),
  speedLabel: document.querySelector('#speed-label'),
  latitude: document.querySelector('#latitude'),
  latLabel: document.querySelector('#lat-label'),
  dust: document.querySelector('#dust'),
  dustLabel: document.querySelector('#dust-label'),
  dustLayer: document.querySelector('#dust-layer'),
  siteHint: document.querySelector('#site-hint'),
  modeLabel: document.querySelector('#mode-label'),
  fpsLabel: document.querySelector('#fps-label'),
  btnLand: document.querySelector('#btn-land'),
  btnOrbit: document.querySelector('#btn-orbit'),
  toggleMoons: document.querySelector('#toggle-moons'),
  toggleAtm: document.querySelector('#toggle-atm'),
  toggleStorm: document.querySelector('#toggle-storm'),
}

function formatLat(lat) {
  const abs = Math.abs(lat)
  return `${abs}°${lat >= 0 ? 'N' : 'S'}`
}

function bindControls() {
  els.speed.addEventListener('input', () => {
    sim.setSpeedIndex(Number(els.speed.value))
    els.speedLabel.textContent = `×${SPEEDS[sim.speedIndex]}`
  })

  els.latitude.addEventListener('input', () => {
    sim.latitude = Number(els.latitude.value)
    els.latLabel.textContent = formatLat(sim.latitude)
    const site = sim.nearestSite()
    els.siteHint.textContent = `着陆点：${site.name}`
  })

  els.dust.addEventListener('input', () => {
    if (!sim.stormActive) {
      sim.dust = Number(els.dust.value)
      els.dustLabel.textContent = `${Math.round(sim.dust)}%`
      scene.setDust(sim.dust / 100)
      syncDustLayer()
    }
  })

  els.btnLand.addEventListener('click', () => setMode('land'))
  els.btnOrbit.addEventListener('click', () => setMode('orbit'))

  els.toggleMoons.addEventListener('click', () => {
    const next = !els.toggleMoons.classList.contains('active')
    els.toggleMoons.classList.toggle('active', next)
    els.toggleMoons.setAttribute('aria-pressed', String(next))
    scene.setMoonsVisible(next)
  })

  els.toggleAtm.addEventListener('click', () => {
    const next = !els.toggleAtm.classList.contains('active')
    els.toggleAtm.classList.toggle('active', next)
    els.toggleAtm.setAttribute('aria-pressed', String(next))
    scene.setAtmosphereVisible(next)
  })

  els.toggleStorm.addEventListener('click', () => {
    sim.stormActive = !sim.stormActive
    sim.stormTimer = 0
    if (sim.stormActive) {
      sim.dust = Math.max(sim.dust, 70)
      els.toggleStorm.classList.add('active')
      els.toggleStorm.setAttribute('aria-pressed', 'true')
      els.toggleStorm.textContent = '沙尘暴进行中'
    } else {
      els.toggleStorm.classList.remove('active')
      els.toggleStorm.setAttribute('aria-pressed', 'false')
      els.toggleStorm.textContent = '触发沙尘暴'
    }
    scene.setDust(sim.dust / 100)
    syncDustLayer()
  })
}

function setMode(mode) {
  sim.mode = mode
  scene.setMode(mode)
  els.modeLabel.textContent = mode === 'land' ? '模式：降落视角' : '模式：轨道巡航'
  els.btnLand.classList.toggle('btn-primary', mode === 'land')
  els.btnLand.classList.toggle('btn-ghost', mode !== 'land')
  els.btnOrbit.classList.toggle('btn-primary', mode === 'orbit')
  els.btnOrbit.classList.toggle('btn-ghost', mode !== 'orbit')
}

function syncDustLayer() {
  const heavy = sim.dust >= 45
  els.dustLayer.classList.toggle('active', heavy)
}

function updateHud(telemetry) {
  els.solClock.textContent = sim.formatSolClock()
  els.temp.textContent = `${telemetry.temp.toFixed(1)} °C`
  els.pressure.textContent = `${telemetry.pressure.toFixed(0)} Pa`
  els.wind.textContent = `${telemetry.wind.toFixed(1)} m/s`
  els.rad.textContent = `${telemetry.radiation.toFixed(2)} mSv/d`
  els.vis.textContent = `${telemetry.visibility.toFixed(1)} km`
  els.sun.textContent = `${telemetry.sunElevation.toFixed(0)}°`

  if (!document.activeElement || document.activeElement !== els.dust) {
    els.dust.value = String(Math.round(sim.dust))
    els.dustLabel.textContent = `${Math.round(sim.dust)}%`
  }

  if (sim.stormActive) {
    els.toggleStorm.classList.add('active')
    els.toggleStorm.textContent = '沙尘暴进行中'
  } else if (els.toggleStorm.classList.contains('active') && els.toggleStorm.textContent !== '触发沙尘暴') {
    els.toggleStorm.classList.remove('active')
    els.toggleStorm.setAttribute('aria-pressed', 'false')
    els.toggleStorm.textContent = '触发沙尘暴'
  }

  scene.setDust(sim.dust / 100)
  syncDustLayer()
}

bindControls()
els.speedLabel.textContent = `×${SPEEDS[sim.speedIndex]}`
els.latLabel.textContent = formatLat(sim.latitude)
els.siteHint.textContent = `着陆点：${sim.nearestSite().name}`
scene.setDust(sim.dust / 100)
setMode('orbit')

let last = performance.now()
let frames = 0
let fpsAccum = 0

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  sim.update(dt)
  const telemetry = sim.telemetry()
  scene.applySim(sim, telemetry)
  scene.update(dt, sim.speedMultiplier)
  scene.render()
  updateHud(telemetry)

  frames += 1
  fpsAccum += dt
  if (fpsAccum >= 0.5) {
    els.fpsLabel.textContent = `${Math.round(frames / fpsAccum)} fps`
    frames = 0
    fpsAccum = 0
  }

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
