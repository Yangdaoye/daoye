import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { JEZERO_SITES } from '../../data/jezero'
import { useMissionStore } from '../../store/missionStore'
import { jezeroHeight } from '../../utils/terrain'

export function SiteMarkers() {
  const selected = useMissionStore((s) => s.selectedSiteId)
  const scanned = useMissionStore((s) => s.scannedSiteIds)
  const samples = useMissionStore((s) => s.samples)

  return (
    <group>
      {JEZERO_SITES.map((site) => {
        const y = jezeroHeight(site.position[0], site.position[2]) + 0.15
        const isSelected = selected === site.id
        const isScanned = scanned.includes(site.id)
        const hasSample = samples.some((s) => s.siteId === site.id)
        return (
          <group key={site.id} position={[site.position[0], y, site.position[2]]}>
            <MarkerMesh
              siteId={site.id}
              selected={isSelected}
              scanned={isScanned}
              sampled={hasSample}
            />
            <Html distanceFactor={28} position={[0, 1.6, 0]} center>
              <button
                type="button"
                className={`site-label ${isSelected ? 'is-active' : ''} ${isScanned ? 'is-scanned' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  useMissionStore.getState().selectSite(site.id)
                }}
              >
                <span className="site-label__dot" />
                {site.nameZh}
              </button>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

function MarkerMesh({
  siteId,
  selected,
  scanned,
  sampled,
}: {
  siteId: string
  selected: boolean
  scanned: boolean
  sampled: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)
  let color = '#c4683a'
  if (sampled) color = '#6ecf8c'
  else if (scanned) color = '#e8b86a'
  else if (selected) color = '#ffd29a'

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = selected ? 1 + Math.sin(clock.elapsedTime * 3) * 0.12 : 1
    ref.current.scale.setScalar(pulse)
  })

  return (
    <mesh
      ref={ref}
      position={[0, 0.35, 0]}
      castShadow
      onClick={(e) => {
        e.stopPropagation()
        useMissionStore.getState().selectSite(siteId)
      }}
    >
      <cylinderGeometry args={[0.35, 0.55, 0.7, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 0.55 : 0.2}
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  )
}
