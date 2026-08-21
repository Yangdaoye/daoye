import { MISSION_META } from '../../data/jezero'
import { useMissionStore } from '../../store/missionStore'

function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function StatusBar() {
  const sol = useMissionStore((s) => s.sol)
  const missionSeconds = useMissionStore((s) => s.missionSeconds)
  const energyPct = useMissionStore((s) => s.energyPct)
  const progressPct = useMissionStore((s) => s.progressPct)
  const weather = useMissionStore((s) => s.weather)
  const selectedSiteId = useMissionStore((s) => s.selectedSiteId)

  return (
    <header className="status-bar hud-panel">
      <div className="status-bar__brand">
        <span className="status-bar__mark">MARS</span>
        <div>
          <strong>真实火星数据交互展示平台</strong>
          <p>
            {MISSION_META.regionZh} · {MISSION_META.region}
          </p>
        </div>
      </div>
      <div className="status-bar__metrics">
        <Metric label="当前位置" value={selectedSiteId ? selectedSiteId : '巡视中'} />
        <Metric label="任务日 Sol" value={String(sol)} />
        <Metric label="任务时计" value={formatClock(missionSeconds)} />
        <Metric label="能源" value={`${energyPct.toFixed(0)}%`} bar={energyPct} />
        <Metric label="任务进度" value={`${progressPct.toFixed(0)}%`} bar={progressPct} accent />
        <Metric
          label="火星气象"
          value={`${weather.tempC.toFixed(0)}°C · ${weather.windMs.toFixed(1)} m/s · τ≈${weather.opacity.toFixed(2)}`}
        />
      </div>
    </header>
  )
}

function Metric({
  label,
  value,
  bar,
  accent,
}: {
  label: string
  value: string
  bar?: number
  accent?: boolean
}) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
      {typeof bar === 'number' && (
        <span className={`metric__bar ${accent ? 'is-accent' : ''}`}>
          <i style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} />
        </span>
      )}
    </div>
  )
}
