import { useMissionStore } from '../../store/missionStore'
import type { ViewMode } from '../../store/missionStore'

export function ControlBar() {
  const beginScan = useMissionStore((s) => s.beginScan)
  const collectSample = useMissionStore((s) => s.collectSample)
  const stowArm = useMissionStore((s) => s.stowArm)
  const setViewMode = useMissionStore((s) => s.setViewMode)
  const viewMode = useMissionStore((s) => s.viewMode)
  const gestureEnabled = useMissionStore((s) => s.gestureEnabled)
  const setGestureEnabled = useMissionStore((s) => s.setGestureEnabled)
  const isScanning = useMissionStore((s) => s.isScanning)
  const armMode = useMissionStore((s) => s.armMode)

  return (
    <footer className="control-bar hud-panel">
      <div className="control-bar__group">
        <span className="control-bar__label">机械臂</span>
        <button type="button" className="btn" onClick={beginScan} disabled={isScanning}>
          {isScanning ? '扫描中…' : '扫描'}
        </button>
        <button type="button" className="btn" onClick={collectSample}>
          拾取样本
        </button>
        <button type="button" className="btn btn--ghost" onClick={stowArm}>
          归位
        </button>
        <button
          type="button"
          className={`btn btn--ghost ${gestureEnabled ? 'is-on' : ''}`}
          onClick={() => setGestureEnabled(!gestureEnabled)}
        >
          手势 {gestureEnabled ? '开' : '关'}
        </button>
      </div>

      <div className="control-bar__group">
        <span className="control-bar__label">视角</span>
        {(
          [
            ['orbit', '环绕'],
            ['arm', '机械臂'],
            ['overview', '俯瞰'],
          ] as [ViewMode, string][]
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={`btn btn--ghost ${viewMode === mode ? 'is-on' : ''}`}
            onClick={() => setViewMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="control-bar__hint">
        <span>模式：{armMode}</span>
        <span>WASD 移动 · R/F 升降 · Space 扫描 · Q 拾取 · E 归位 · G 手势</span>
      </div>
    </footer>
  )
}
