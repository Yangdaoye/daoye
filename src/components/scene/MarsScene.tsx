import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { MarsTerrain } from './MarsTerrain'
import { MarsAtmosphere } from './MarsAtmosphere'
import { SiteMarkers } from './SiteMarkers'
import { RoboticArm } from './RoboticArm'
import { useMissionStore } from '../../store/missionStore'
import { JEZERO_SITES } from '../../data/jezero'
import { jezeroHeight } from '../../utils/terrain'

function MissionTicker() {
  useFrame((_, dt) => {
    useMissionStore.getState().tick(dt)
  })
  return null
}

function ScanController() {
  const scanning = useMissionStore((s) => s.isScanning)
  const started = useRef(0)

  useFrame(({ clock }) => {
    if (!scanning) {
      started.current = 0
      return
    }
    if (!started.current) started.current = clock.elapsedTime
    if (clock.elapsedTime - started.current > 1.6) {
      const id = useMissionStore.getState().selectedSiteId
      const site = JEZERO_SITES.find((s) => s.id === id)
      if (site) useMissionStore.getState().completeScan(site)
      started.current = 0
    }
  })
  return null
}

function ArmWorldReticle() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const t = useMissionStore.getState().armTarget
    if (ref.current) {
      ref.current.position.set(t[0], t[1], t[2])
      ref.current.rotation.y += 0.025
    }
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.4, 0.035, 8, 28]} />
      <meshBasicMaterial color="#ffc978" transparent opacity={0.9} />
    </mesh>
  )
}

function CameraRig() {
  const viewMode = useMissionStore((s) => s.viewMode)
  const { camera } = useThree()
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null

  useEffect(() => {
    const arm = useMissionStore.getState().armBase
    if (viewMode === 'overview') {
      camera.position.set(0, 55, 55)
      if (controls?.target) controls.target.set(0, 0, -5)
    } else if (viewMode === 'arm') {
      camera.position.set(arm[0] + 6, arm[1] + 5, arm[2] + 10)
      const t = useMissionStore.getState().armTarget
      if (controls?.target) controls.target.set(t[0], t[1], t[2])
    } else {
      camera.position.set(18, 16, 28)
      if (controls?.target) controls.target.set(0, 1, 0)
    }
    controls?.update?.()
  }, [viewMode, camera, controls])

  return null
}

function GroundAnchor() {
  // Place arm base on terrain
  useEffect(() => {
    const base = useMissionStore.getState().armBase
    const y = jezeroHeight(base[0], base[2])
    useMissionStore.setState({ armBase: [base[0], y, base[2]] })
  }, [])
  return null
}

export function MarsScene() {
  return (
    <Canvas
      className="mars-canvas"
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => {
        /* keep selection */
      }}
    >
      <PerspectiveCamera makeDefault position={[18, 16, 28]} fov={48} near={0.1} far={250} />
      <Suspense fallback={null}>
        <MarsAtmosphere />
        <MarsTerrain />
        <SiteMarkers />
        <RoboticArm />
        <ArmWorldReticle />
        <GroundAnchor />
        <MissionTicker />
        <ScanController />
        <CameraRig />
        <OrbitControls
          makeDefault
          enablePan
          maxPolarAngle={Math.PI * 0.48}
          minDistance={6}
          maxDistance={90}
          target={[0, 1, 0]}
        />
      </Suspense>
    </Canvas>
  )
}
