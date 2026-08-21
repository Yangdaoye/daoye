import './style.css'
import {
  SOL_SECONDS,
  TIME_SCALES,
  MARS_GRAVITY,
  MARS_PRESSURE_PA,
  MARS_SOLAR_CONSTANT,
  earthGFraction,
  pressurePercentOfEarth,
} from './mars/constants'
import { LANDING_SITES, getSite, type SiteId } from './mars/sites'
import { Terrain } from './mars/terrain'
import { WeatherSystem } from './mars/weather'
import { Rover, type RoverInput } from './mars/rover'
import { createMission, tryCollectNear, type MissionState } from './mars/mission'
import { MarsRenderer } from './render/canvas'

type Phase = 'title' | 'sim'

const app = document.querySelector<HTMLDivElement>('#app')!
let phase: Phase = 'title'
let selectedSite: SiteId = 'jezero'

const keys = new Set<string>()
let inputBoost = { throttle: 0, steer: 0, brake: false, sample: false }

function fmt(n: number, d = 1): string {
  return n.toFixed(d)
}

function buildTitle() {
  app.innerHTML = `
    <section class="screen title-screen">
      <div class="title-inner">
        <h1 class="brand">AREALIS<span>火星表面作业模拟器</span></h1>
        <p class="tagline">
          基于公开行星科学参数的载人/无人混合勘探沙盘：重力 0.38 g、平均气压约 610 Pa、
          日照约 586 W/m²、以及真实着陆区地形与尘暴对能源与能见度的耦合影响。
        </p>
        <ul class="facts">
          <li><strong>g</strong> ${fmt(MARS_GRAVITY, 2)} m/s²（${fmt(earthGFraction() * 100, 0)}% 地球）</li>
          <li><strong>气压</strong> ${MARS_PRESSURE_PA} Pa（${fmt(pressurePercentOfEarth(), 2)}% 地球海平面）</li>
          <li><strong>太阳常数</strong> ${MARS_SOLAR_CONSTANT} W/m²</li>
          <li><strong>1 Sol</strong> ${fmt(SOL_SECONDS / 3600, 3)} h</li>
        </ul>
        <div class="site-grid" id="site-grid"></div>
        <div class="start-row">
          <button class="primary" id="btn-start" type="button">开始表面作业</button>
          <span class="hint">WASD / 方向键驾驶 · F 采样 · 空格刹车 · 1–4 时间倍率</span>
        </div>
      </div>
    </section>
  `

  const grid = app.querySelector('#site-grid')!
  grid.innerHTML = LANDING_SITES.map(
    (s) => `
    <button type="button" class="site-card${s.id === selectedSite ? ' selected' : ''}" data-site="${s.id}">
      <h3>${s.name}</h3>
      <div class="en">${s.nameEn} · ${s.lat.toFixed(1)}°, ${s.lon.toFixed(1)}°</div>
      <p>${s.blurb}</p>
      <div class="site-meta">
        <span>海拔 ${s.elevationM} m</span>
        <span>${s.tempLowC}~${s.tempHighC}°C</span>
        <span>粗糙度 ${(s.roughness * 100) | 0}%</span>
      </div>
    </button>`,
  ).join('')

  grid.querySelectorAll<HTMLButtonElement>('.site-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedSite = btn.dataset.site as SiteId
      grid.querySelectorAll('.site-card').forEach((c) => c.classList.remove('selected'))
      btn.classList.add('selected')
    })
  })

  app.querySelector('#btn-start')!.addEventListener('click', () => startSim(selectedSite))
}

function startSim(siteId: SiteId) {
  phase = 'sim'
  const site = getSite(siteId)
  const terrain = new Terrain(site)
  const landing = terrain.findLandingPad()
  const weatherSys = new WeatherSystem(site)
  const rover = new Rover(terrain, landing.x, landing.y)
  const mission = createMission(site, landing.x, landing.y)

  let simTime = SOL_SECONDS * 0.4 // ~09:36 LST — usable morning solar
  let timeScale = 10
  let running = true
  let last = performance.now()
  let camX = landing.x
  let camY = landing.y

  app.innerHTML = `
    <div class="sim">
      <canvas id="mars-canvas"></canvas>
      <div class="hud">
        <div class="hud-top">
          <div class="panel">
            <div class="brand-mini">AREA<em>LIS</em></div>
            <div class="sol-line" id="sol-line">—</div>
          </div>
          <div class="panel meters" id="meters">
            <div class="meter" id="m-bat"><label>电池</label><div class="bar"><i></i></div><div class="val">—</div></div>
            <div class="meter" id="m-o2"><label>氧气</label><div class="bar"><i></i></div><div class="val">—</div></div>
            <div class="meter" id="m-pwr"><label>功率净额</label><div class="bar"><i></i></div><div class="val">—</div></div>
            <div class="meter" id="m-dose"><label>累积剂量</label><div class="bar"><i></i></div><div class="val">—</div></div>
          </div>
        </div>
        <div class="hud-left">
          <div class="panel">
            <h4>环境遥测</h4>
            <dl class="kv" id="env-kv"></dl>
          </div>
          <div class="panel">
            <h4>载具</h4>
            <dl class="kv" id="rov-kv"></dl>
            <div class="status-pill" id="status-pill">系统正常</div>
          </div>
        </div>
        <div class="hud-right">
          <div class="panel">
            <h4>${site.name}</h4>
            <p style="margin:0 0 0.6rem;color:var(--dust-dim);font-size:0.72rem;line-height:1.4">${site.nameEn} · 科研分 <span id="score">0</span></p>
            <ul class="target-list" id="targets"></ul>
          </div>
          <div class="panel">
            <h4>任务日志</h4>
            <ul class="log" id="log"></ul>
          </div>
        </div>
        <div class="hud-bottom">
          <div class="panel controls-help">
            <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 驾驶 · <kbd>F</kbd> 采样 · <kbd>空格</kbd> 刹车 · <kbd>P</kbd> 暂停</div>
            <div style="margin-top:0.25rem">真实漫游车约 0.04 m/s；本模拟加速行驶以便体验地形与能源约束。</div>
            <div class="mobile-pad" id="mobile-pad">
              <span></span><button type="button" data-k="throttle-up">▲</button><span></span>
              <button type="button" data-k="steer-left">◀</button><button type="button" data-k="brake">■</button><button type="button" data-k="steer-right">▶</button>
            </div>
          </div>
          <div class="toolbar panel">
            <button type="button" data-scale="1">×1</button>
            <button type="button" data-scale="10">×10</button>
            <button type="button" data-scale="60">×60</button>
            <button type="button" data-scale="600">×600</button>
            <button type="button" id="btn-sample">采样</button>
            <button type="button" class="ghost" id="btn-abort">结束任务</button>
          </div>
        </div>
      </div>
      <div class="overlay hidden" id="end-overlay"></div>
    </div>
  `

  const canvas = app.querySelector<HTMLCanvasElement>('#mars-canvas')!
  const renderer = new MarsRenderer(canvas)

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.resize(window.innerWidth, window.innerHeight, dpr)
  }
  resize()
  window.addEventListener('resize', resize)

  app.querySelectorAll<HTMLButtonElement>('[data-scale]').forEach((b) => {
    b.addEventListener('click', () => {
      timeScale = Number(b.dataset.scale)
    })
  })

  app.querySelector('#btn-sample')!.addEventListener('click', () => {
    inputBoost.sample = true
  })

  app.querySelector('#btn-abort')!.addEventListener('click', () => {
    showEnd(mission, rover, weatherSys.update(simTime, 0), '任务中止')
    running = false
  })

  // Mobile pad
  const bindPad = (el: HTMLElement, on: () => void, off: () => void) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      on()
    })
    el.addEventListener('pointerup', off)
    el.addEventListener('pointerleave', off)
  }
  const mobilePad = app.querySelector('#mobile-pad')
  if (mobilePad) {
    mobilePad.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
      const k = btn.dataset.k
      if (k === 'throttle-up') bindPad(btn, () => (inputBoost.throttle = 1), () => (inputBoost.throttle = 0))
      if (k === 'steer-left') bindPad(btn, () => (inputBoost.steer = -1), () => (inputBoost.steer = 0))
      if (k === 'steer-right') bindPad(btn, () => (inputBoost.steer = 1), () => (inputBoost.steer = 0))
      if (k === 'brake') bindPad(btn, () => (inputBoost.brake = true), () => (inputBoost.brake = false))
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code)
    if (e.code === 'KeyP') running = !running
    if (e.code === 'Digit1') timeScale = TIME_SCALES[0]
    if (e.code === 'Digit2') timeScale = TIME_SCALES[1]
    if (e.code === 'Digit3') timeScale = TIME_SCALES[2]
    if (e.code === 'Digit4') timeScale = TIME_SCALES[3]
    if (e.code === 'KeyF') inputBoost.sample = true
  }
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  function readInput(): RoverInput {
    let throttle = inputBoost.throttle
    let steer = inputBoost.steer
    let brake = inputBoost.brake || keys.has('Space')
    if (keys.has('KeyW') || keys.has('ArrowUp')) throttle = 1
    if (keys.has('KeyS') || keys.has('ArrowDown')) throttle = -0.55
    if (keys.has('KeyA') || keys.has('ArrowLeft')) steer = -1
    if (keys.has('KeyD') || keys.has('ArrowRight')) steer = 1
    const sample = inputBoost.sample
    inputBoost.sample = false
    return { throttle, steer, brake, sample }
  }

  function updateHud(
    weather: ReturnType<WeatherSystem['update']>,
    telem: ReturnType<Rover['update']>,
    missionState: MissionState,
  ) {
    const sol = Math.floor(weather.sol) + 1
    const secInSol = weather.lst * SOL_SECONDS
    const hh = Math.floor(secInSol / 3600)
    const mm = Math.floor((secInSol % 3600) / 60)
    const lstStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} LST`

    app.querySelector('#sol-line')!.textContent =
      `${site.nameEn} · Sol ${sol} · ${lstStr} · 倍率 ×${timeScale}` +
      (running ? '' : ' · 暂停')

    const setMeter = (id: string, pct: number, text: string, warnAt = 30, badAt = 15) => {
      const el = app.querySelector(`#${id}`)!
      el.classList.remove('warn', 'bad')
      if (pct <= badAt) el.classList.add('bad')
      else if (pct <= warnAt) el.classList.add('warn')
      ;(el.querySelector('i') as HTMLElement).style.width = `${Math.max(0, Math.min(100, pct))}%`
      el.querySelector('.val')!.textContent = text
    }

    setMeter('m-bat', telem.batteryPct, `${fmt(telem.batteryPct, 0)}% · ${fmt(telem.batteryWh, 0)} Wh`)
    setMeter('m-o2', telem.o2Pct, `${fmt(telem.o2Pct, 0)}% · ${fmt(telem.o2Kg, 2)} kg`)
    const net = telem.powerInW - telem.powerOutW
    const netPct = Math.max(0, Math.min(100, 50 + net / 8))
    setMeter('m-pwr', netPct, `${net >= 0 ? '+' : ''}${fmt(net, 0)} W`, 40, 25)
    const dosePct = Math.min(100, (telem.doseMsv / 0.67) * 100)
    setMeter('m-dose', dosePct, `${fmt(telem.doseMsv, 3)} mSv`, 70, 90)

    app.querySelector('#env-kv')!.innerHTML = `
      <dt>气温</dt><dd>${fmt(weather.temperatureC, 1)} °C</dd>
      <dt>气压</dt><dd>${fmt(weather.pressurePa, 0)} Pa</dd>
      <dt>风速</dt><dd>${fmt(weather.windMs, 1)} m/s</dd>
      <dt>尘埃光学厚度 τ</dt><dd>${fmt(weather.dustTau, 2)}</dd>
      <dt>水平辐照</dt><dd>${fmt(weather.irradianceWm2, 0)} W/m²</dd>
      <dt>能见度</dt><dd>${fmt(weather.visibilityM, 0)} m</dd>
      <dt>地火单向时延</dt><dd>${fmt(weather.commDelaySec / 60, 1)} min</dd>
      <dt>季节</dt><dd>${weather.seasonLabel}</dd>
    `

    let bearingText = '—'
    const open = missionState.targets.filter((t) => !t.collected)
    if (open.length) {
      let nearest = open[0]
      let bestD = Infinity
      for (const t of open) {
        const d = Math.hypot(t.x - telem.x, t.y - telem.y)
        if (d < bestD) {
          bestD = d
          nearest = t
        }
      }
      const abs = Math.atan2(nearest.y - telem.y, nearest.x - telem.x)
      let rel = ((abs - telem.heading) * 180) / Math.PI
      while (rel > 180) rel -= 360
      while (rel < -180) rel += 360
      const dir =
        Math.abs(rel) < 15 ? '正前方' : rel > 0 ? `右 ${fmt(rel, 0)}°` : `左 ${fmt(-rel, 0)}°`
      bearingText = `${dir} · ${fmt(bestD, 0)} m`
    }

    app.querySelector('#rov-kv')!.innerHTML = `
      <dt>速度</dt><dd>${fmt(telem.speedMs, 2)} m/s</dd>
      <dt>坡度</dt><dd>${fmt(telem.slopeDeg, 1)}°</dd>
      <dt>太阳能 / RTG</dt><dd>${fmt(telem.solarW, 0)} / ${fmt(telem.rtgW, 0)} W</dd>
      <dt>消耗功率</dt><dd>${fmt(telem.powerOutW, 0)} W</dd>
      <dt>轮温 / 舱温</dt><dd>${fmt(telem.wheelTempC, 0)} / ${fmt(telem.cabinTempC, 0)} °C</dd>
      <dt>行驶里程</dt><dd>${fmt(telem.distanceM, 0)} m</dd>
      <dt>样本仓</dt><dd>${telem.samplesHeld} / 8</dd>
      <dt>牵引力</dt><dd>${fmt(telem.traction * 100, 0)}%</dd>
      <dt>最近目标方位</dt><dd>${bearingText}</dd>
    `

    const pill = app.querySelector('#status-pill')!
    pill.textContent = telem.status
    pill.classList.toggle('alert', Boolean(telem.hazard) || !telem.alive)

    app.querySelector('#score')!.textContent = String(missionState.score)
    app.querySelector('#targets')!.innerHTML = missionState.targets
      .map(
        (t) =>
          `<li class="${t.collected ? 'done' : ''}"><span>${t.label}</span><span>${
            t.collected ? '已采集' : `${fmt(Math.hypot(t.x - telem.x, t.y - telem.y), 0)} m`
          }</span></li>`,
      )
      .join('')

    app.querySelector('#log')!.innerHTML = missionState.messageLog
      .slice(0, 8)
      .map((m) => `<li>${m.text}</li>`)
      .join('')
  }

  function showEnd(
    missionState: MissionState,
    r: Rover,
    weather: ReturnType<WeatherSystem['update']>,
    title: string,
  ) {
    const overlay = app.querySelector('#end-overlay')!
    overlay.classList.remove('hidden')
    overlay.innerHTML = `
      <div class="overlay-card">
        <h2>${title}</h2>
        <p>
          着陆区 ${missionState.site.name} · 科研分 ${missionState.score} ·
          采集 ${missionState.objectivesDone}/${missionState.targets.length} ·
          里程 ${fmt(r.distanceM, 0)} m · 剂量 ${fmt(r.doseMsv, 3)} mSv
        </p>
        <p style="font-size:0.75rem;color:var(--dust-dim)">
          终态环境：${fmt(weather.temperatureC, 1)}°C · τ=${fmt(weather.dustTau, 2)} ·
          时延 ${fmt(weather.commDelaySec / 60, 1)} min
        </p>
        <div class="start-row">
          <button class="primary" type="button" id="btn-again">返回选址</button>
        </div>
      </div>
    `
    overlay.querySelector('#btn-again')!.addEventListener('click', () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', resize)
      phase = 'title'
      buildTitle()
    })
  }

  const loop = (now: number) => {
    if (phase !== 'sim') return
    const rawDt = Math.min(0.05, (now - last) / 1000)
    last = now
    const dt = running ? rawDt * timeScale : 0

    if (dt > 0) {
      simTime += dt
      const weather = weatherSys.update(simTime, dt)
      const input = readInput()
      const telem = rover.update(dt, input, weather)

      if (input.sample) {
        const hit = tryCollectNear(mission, rover.x, rover.y, 7)
        if (hit) {
          rover.storeSample()
        } else {
          mission.messageLog.unshift({
            t: now,
            text: '附近无科学目标（靠近黄色标记后按 F）',
          })
        }
      }

      camX += (telem.x - camX) * Math.min(1, rawDt * 4)
      camY += (telem.y - camY) * Math.min(1, rawDt * 4)

      updateHud(weather, telem, mission)
      renderer.render({
        terrain,
        weather,
        rover: telem,
        targets: mission.targets,
        site,
        camX,
        camY,
        time: now,
      })

      if (!telem.alive) {
        mission.failed = true
        showEnd(mission, rover, weather, '任务失败')
        running = false
      } else if (mission.complete && mission.objectivesDone >= 4 && !app.querySelector('#end-overlay:not(.hidden)')) {
        // soft complete — don't auto popup; user can continue. Banner already in log.
      }
    } else {
      const weather = weatherSys.update(simTime, 0)
      const telem = rover.update(0, readInput(), weather)
      updateHud(weather, telem, mission)
      renderer.render({
        terrain,
        weather,
        rover: telem,
        targets: mission.targets,
        site,
        camX,
        camY,
        time: now,
      })
    }

    requestAnimationFrame(loop)
  }

  // Initial HUD
  {
    const weather = weatherSys.update(simTime, 0)
    const telem = rover.update(0, { throttle: 0, steer: 0, brake: false, sample: false }, weather)
    updateHud(weather, telem, mission)
  }

  requestAnimationFrame(loop)
}

buildTitle()
