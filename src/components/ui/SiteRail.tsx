import { JEZERO_SITES } from '../../data/jezero'
import { useMissionStore } from '../../store/missionStore'

export function SiteRail() {
  const selected = useMissionStore((s) => s.selectedSiteId)
  const scanned = useMissionStore((s) => s.scannedSiteIds)
  const selectSite = useMissionStore((s) => s.selectSite)

  return (
    <div className="site-rail hud-panel">
      <span className="site-rail__title">重点区域</span>
      <div className="site-rail__list">
        {JEZERO_SITES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`site-chip ${selected === s.id ? 'is-active' : ''} ${scanned.includes(s.id) ? 'is-scanned' : ''}`}
            onClick={() => selectSite(s.id)}
          >
            {s.nameZh}
          </button>
        ))}
      </div>
    </div>
  )
}
