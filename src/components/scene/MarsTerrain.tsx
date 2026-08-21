import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { jezeroHeight } from '../../utils/terrain'
import { useMissionStore } from '../../store/missionStore'

const SIZE = 100
const SEGMENTS = 160

function buildTerrainGeometry() {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const color = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = jezeroHeight(x, z)
    pos.setY(i, y)

    // Mars regolith palette from elevation + slope proxy
    const t = THREE.MathUtils.clamp((y + 2.2) / 6.5, 0, 1)
    const dust = 0.55 + 0.2 * Math.sin(x * 0.15) * Math.cos(z * 0.12)
    color.setRGB(
      0.42 + t * 0.28 + dust * 0.08,
      0.22 + t * 0.12,
      0.12 + t * 0.05,
    )
    // Delta deposits slightly cooler / grayer
    if (x < -8 && z < -8 && y > 0.5) {
      color.offsetHSL(-0.02, -0.15, 0.04)
    }
    // Crater floor warmer
    if (Math.hypot(x, z) < 18 && y < 0.2) {
      color.offsetHSL(0.01, 0.05, -0.02)
    }
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

export function MarsTerrain() {
  const geo = useMemo(() => buildTerrainGeometry(), [])
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const dust = useMissionStore((s) => s.weather.dust)

  useFrame(() => {
    if (matRef.current) {
      matRef.current.roughness = 0.92 + dust * 0.05
      matRef.current.emissiveIntensity = dust * 0.04
    }
  })

  return (
    <mesh
      geometry={geo}
      receiveShadow
      castShadow
      userData={{ terrain: true }}
      onClick={(e) => {
        e.stopPropagation()
        // Click empty terrain moves arm target
        const { setArmTarget, setArmMode, addLog } = useMissionStore.getState()
        setArmTarget([e.point.x, e.point.y + 1.1, e.point.z])
        setArmMode('reach')
        addLog(
          `地形点击 → 目标 (${e.point.x.toFixed(1)}, ${e.point.z.toFixed(1)})`,
          'info',
        )
      }}
    >
      <meshStandardMaterial
        ref={matRef}
        vertexColors
        roughness={0.95}
        metalness={0.04}
        flatShading={false}
        emissive="#3a1810"
        emissiveIntensity={0.03}
      />
    </mesh>
  )
}
