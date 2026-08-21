import { useCallback, useState } from 'react'
import { MarsScene } from './components/scene/MarsScene'
import { StatusBar } from './components/ui/StatusBar'
import { InfoPanel } from './components/ui/InfoPanel'
import { ControlBar } from './components/ui/ControlBar'
import { SiteRail } from './components/ui/SiteRail'
import { LandingPage } from './components/ui/LandingPage'
import { MapSim } from './components/ui/MapSim'
import { WebglBoundary } from './components/ui/WebglBoundary'
import { useArmControls, useGestureDrag } from './hooks/useArmControls'
import { useAppUi } from './store/appUi'
import './App.css'

function Sim3D() {
  const [shell, setShell] = useState<HTMLDivElement | null>(null)
  const shellRef = useCallback((node: HTMLDivElement | null) => setShell(node), [])
  const setView = useAppUi((s) => s.setView)
  const backToLanding = useAppUi((s) => s.backToLanding)
  useArmControls(true)
  useGestureDrag(shell)

  return (
    <div className="app-shell" ref={shellRef}>
      <div className="scene-layer">
        <WebglBoundary>
          <MarsScene />
        </WebglBoundary>
      </div>
      <div className="hud-layer">
        <StatusBar />
        <SiteRail />
        <InfoPanel />
        <ControlBar />
      </div>
      <div className="mode-switch hud-panel">
        <button type="button" className="btn btn--ghost" onClick={backToLanding}>
          首页
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setView('sim-map')}>
          平面地图版
        </button>
      </div>
    </div>
  )
}

function SimMapShell() {
  const setView = useAppUi((s) => s.setView)
  const backToLanding = useAppUi((s) => s.backToLanding)
  useArmControls(true)

  return (
    <div className="map-shell">
      <div className="mode-switch mode-switch--map hud-panel">
        <button type="button" className="btn btn--ghost" onClick={backToLanding}>
          首页
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setView('sim-3d')}>
          三维仿真
        </button>
      </div>
      <MapSim />
    </div>
  )
}

export default function App() {
  const view = useAppUi((s) => s.view)

  if (view === 'landing') return <LandingPage />
  if (view === 'sim-map') return <SimMapShell />
  return <Sim3D />
}
