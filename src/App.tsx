import { useCallback, useState } from 'react'
import { MarsScene } from './components/scene/MarsScene'
import { StatusBar } from './components/ui/StatusBar'
import { InfoPanel } from './components/ui/InfoPanel'
import { ControlBar } from './components/ui/ControlBar'
import { SiteRail } from './components/ui/SiteRail'
import { useArmControls, useGestureDrag } from './hooks/useArmControls'
import './App.css'

export default function App() {
  const [shell, setShell] = useState<HTMLDivElement | null>(null)
  const shellRef = useCallback((node: HTMLDivElement | null) => setShell(node), [])
  useArmControls(true)
  useGestureDrag(shell)

  return (
    <div className="app-shell" ref={shellRef}>
      <div className="scene-layer">
        <MarsScene />
      </div>
      <div className="hud-layer">
        <StatusBar />
        <SiteRail />
        <InfoPanel />
        <ControlBar />
      </div>
    </div>
  )
}
