import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { JEZERO_SITES, LANDFORM_LABELS, siteById } from '../../data/jezero'
import { useMissionStore } from '../../store/missionStore'
import { jezeroHeight } from '../../utils/terrain'
import './MapSim.css'

const MAP = 640

function toCanvas(x: number, z: number): [number, number] {
  // scene x,z in ~[-50,50] → canvas
  const u = ((x + 50) / 100) * MAP
  const v = ((z + 50) / 100) * MAP
  return [u, v]
}

function fromCanvas(u: number, v: number): [number, number] {
  const x = (u / MAP) * 100 - 50
  const z = (v / MAP) * 100 - 50
  return [x, z]
}

export function MapSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectedSiteId = useMissionStore((s) => s.selectedSiteId)
  const scanned = useMissionStore((s) => s.scannedSiteIds)
  const samples = useMissionStore((s) => s.samples)
  const armTarget = useMissionStore((s) => s.armTarget)
  const armBase = useMissionStore((s) => s.armBase)
  const isScanning = useMissionStore((s) => s.isScanning)
  const lastScan = useMissionStore((s) => s.lastScanResult)
  const logs = useMissionStore((s) => s.logs)
  const weather = useMissionStore((s) => s.weather)
  const energyPct = useMissionStore((s) => s.energyPct)
  const progressPct = useMissionStore((s) => s.progressPct)
  const sol = useMissionStore((s) => s.sol)

  const site = siteById(selectedSiteId ?? '') ?? lastScan ?? JEZERO_SITES[0]
  const isScanned = site ? scanned.includes(site.id) : false

  const heightPreview = useMemo(() => {
    const data = new Float32Array(96 * 96)
    for (let j = 0; j < 96; j++) {
      for (let i = 0; i < 96; i++) {
        const x = (i / 95) * 100 - 50
        const z = (j / 95) * 100 - 50
        data[j * 96 + i] = jezeroHeight(x, z)
      }
    }
    return data
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => useMissionStore.getState().tick(0.25), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isScanning) return
    const t = window.setTimeout(() => {
      const id = useMissionStore.getState().selectedSiteId
      const s = JEZERO_SITES.find((x) => x.id === id)
      if (s) useMissionStore.getState().completeScan(s)
    }, 1400)
    return () => clearTimeout(t)
  }, [isScanning])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = ctx.createImageData(MAP, MAP)
    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        const i = Math.min(95, Math.floor((x / MAP) * 96))
        const j = Math.min(95, Math.floor((y / MAP) * 96))
        const h = heightPreview[j * 96 + i]
        const t = Math.max(0, Math.min(1, (h + 2.2) / 6.5))
        const r = 90 + t * 110
        const g = 48 + t * 55
        const b = 28 + t * 25
        const p = (y * MAP + x) * 4
        img.data[p] = r
        img.data[p + 1] = g
        img.data[p + 2] = b
        img.data[p + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)

    // soft vignette / dust
    const grad = ctx.createRadialGradient(MAP / 2, MAP / 2, 80, MAP / 2, MAP / 2, MAP * 0.72)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, `rgba(40,18,10,${0.25 + weather.dust * 0.25})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, MAP, MAP)

    // arm base + reach line
    const [bx, by] = toCanvas(armBase[0], armBase[2])
    const [tx, ty] = toCanvas(armTarget[0], armTarget[2])
    ctx.strokeStyle = isScanning ? 'rgba(255,200,100,0.95)' : 'rgba(240,190,120,0.65)'
    ctx.lineWidth = isScanning ? 2.5 : 1.5
    ctx.setLineDash(isScanning ? [6, 4] : [])
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#d8c2a8'
    ctx.beginPath()
    ctx.arc(bx, by, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a100c'
    ctx.font = '10px sans-serif'
    ctx.fillText('ARM', bx - 10, by - 10)

    ctx.strokeStyle = '#ffc978'
    ctx.beginPath()
    ctx.arc(tx, ty, 10, 0, Math.PI * 2)
    ctx.stroke()

    for (const s of JEZERO_SITES) {
      const [u, v] = toCanvas(s.position[0], s.position[2])
      const selected = s.id === selectedSiteId
      const done = scanned.includes(s.id)
      const sampled = samples.some((x) => x.siteId === s.id)
      ctx.beginPath()
      ctx.fillStyle = sampled ? '#6ecf8c' : done ? '#e8b86a' : selected ? '#ffd29a' : '#c4683a'
      ctx.arc(u, v, selected ? 8 : 6, 0, Math.PI * 2)
      ctx.fill()
      if (selected) {
        ctx.strokeStyle = '#fff3d8'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(18,12,9,0.75)'
      ctx.fillRect(u + 10, v - 8, ctx.measureText(s.nameZh).width + 8, 16)
      ctx.fillStyle = '#f3e6d6'
      ctx.font = '11px sans-serif'
      ctx.fillText(s.nameZh, u + 14, v + 4)
    }
  }, [heightPreview, selectedSiteId, scanned, samples, armTarget, armBase, isScanning, weather.dust])

  const onMapClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const u = ((e.clientX - rect.left) / rect.width) * MAP
    const v = ((e.clientY - rect.top) / rect.height) * MAP
    const [x, z] = fromCanvas(u, v)

    // nearest site within threshold
    let best = null as (typeof JEZERO_SITES)[number] | null
    let bestD = 6
    for (const s of JEZERO_SITES) {
      const d = Math.hypot(s.position[0] - x, s.position[2] - z)
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    if (best) {
      useMissionStore.getState().selectSite(best.id)
    } else {
      const y = jezeroHeight(x, z) + 1.1
      useMissionStore.getState().setArmTarget([x, y, z])
      useMissionStore.getState().setArmMode('reach')
      useMissionStore.getState().addLog(`地图点击 → (${x.toFixed(1)}, ${z.toFixed(1)})`, 'info')
    }
  }

  const [gesture, setGesture] = useState(false)

  return (
    <div className="map-sim">
      <header className="map-sim__bar">
        <div>
          <strong>平面地图仿真 · 杰泽罗陨石坑</strong>
          <p>
            Sol {sol} · 能源 {energyPct.toFixed(0)}% · 进度 {progressPct.toFixed(0)}% · {weather.tempC.toFixed(0)}°C ·{' '}
            {weather.windMs.toFixed(1)} m/s
          </p>
        </div>
        <div className="map-sim__bar-actions">
          <button type="button" className="btn" onClick={() => useMissionStore.getState().beginScan()} disabled={isScanning}>
            {isScanning ? '扫描中…' : '扫描'}
          </button>
          <button type="button" className="btn" onClick={() => useMissionStore.getState().collectSample()}>
            拾取样本
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => useMissionStore.getState().stowArm()}>
            归位
          </button>
          <button
            type="button"
            className={`btn btn--ghost ${gesture ? 'is-on' : ''}`}
            onClick={() => {
              setGesture((g) => !g)
              useMissionStore.getState().setGestureEnabled(!gesture)
            }}
          >
            拖拽臂 {gesture ? '开' : '关'}
          </button>
        </div>
      </header>

      <div className="map-sim__body">
        <div className="map-sim__stage">
          <canvas
            ref={canvasRef}
            width={MAP}
            height={MAP}
            className="map-sim__canvas"
            onClick={onMapClick}
            onPointerMove={(e) => {
              if (!gesture || e.buttons !== 1) return
              const canvas = canvasRef.current
              if (!canvas) return
              const rect = canvas.getBoundingClientRect()
              const u = ((e.clientX - rect.left) / rect.width) * MAP
              const v = ((e.clientY - rect.top) / rect.height) * MAP
              const [x, z] = fromCanvas(u, v)
              const y = jezeroHeight(x, z) + 1.1
              useMissionStore.getState().setArmTarget([x, y, z])
            }}
          />
          <p className="map-sim__hint">点击探测点或地形 · 开启拖拽后按住鼠标移动机械臂末端</p>
          <div className="map-sim__chips">
            {JEZERO_SITES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`site-chip ${selectedSiteId === s.id ? 'is-active' : ''} ${scanned.includes(s.id) ? 'is-scanned' : ''}`}
                onClick={() => useMissionStore.getState().selectSite(s.id)}
              >
                {s.nameZh}
              </button>
            ))}
          </div>
        </div>

        <aside className="map-sim__panel">
          {site && (
            <>
              <h2>{site.nameZh}</h2>
              <p className="muted">{site.name}</p>
              <dl className="kv">
                <div>
                  <dt>坐标</dt>
                  <dd>
                    {site.lat.toFixed(4)}°N, {site.lon.toFixed(4)}°E
                  </dd>
                </div>
                <div>
                  <dt>地貌</dt>
                  <dd>{LANDFORM_LABELS[site.landform]}</dd>
                </div>
                <div>
                  <dt>影像</dt>
                  <dd>{site.imageCredit}</dd>
                </div>
              </dl>
              <figure className="photo-frame">
                <img src={site.localImage} alt={site.photoCaption} />
                <figcaption>
                  {site.photoCaption}
                  <br />
                  <a className="ref-link" href={site.imageUrl} target="_blank" rel="noreferrer">
                    NASA 原始影像参考
                  </a>
                </figcaption>
              </figure>

              <h3>物质检测 {isScanned ? '' : '（需扫描）'}</h3>
              {isScanned ? (
                <ul className="comp-list">
                  {site.composition.map((c) => (
                    <li key={c.name}>
                      <div className="comp-list__row">
                        <span>{c.name}</span>
                        <strong>{c.abundancePct}%</strong>
                      </div>
                      <div className="comp-list__bar">
                        <i style={{ width: `${c.abundancePct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">点击「扫描」后显示成分。</p>
              )}

              <h3>样本舱 ({samples.length})</h3>
              <ul className="sample-list">
                {samples.map((s) => (
                  <li key={s.id}>
                    <strong>{s.siteName}</strong>
                    <span>{s.material}</span>
                  </li>
                ))}
              </ul>

              <h3>任务日志</h3>
              <ul className="log-list">
                {logs.slice(0, 6).map((l) => (
                  <li key={l.id} data-level={l.level}>
                    {l.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
