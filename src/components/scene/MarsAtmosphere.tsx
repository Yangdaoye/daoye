import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { useMissionStore } from '../../store/missionStore'

export function MarsAtmosphere() {
  const dust = useMissionStore((s) => s.weather.dust)
  const opacity = useMissionStore((s) => s.weather.opacity)
  const group = useRef<THREE.Points>(null)

  const { positions, count } = useMemo(() => {
    const count = 900
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120
      positions[i * 3 + 1] = Math.random() * 28 + 1
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120
    }
    return { positions, count }
  }, [])

  useFrame((_, dt) => {
    if (!group.current) return
    group.current.rotation.y += dt * 0.01 * (0.5 + dust)
    const wind = useMissionStore.getState().weather.windMs
    group.current.position.x = (group.current.position.x + wind * dt * 0.15) % 40
  })

  return (
    <>
      <color attach="background" args={['#24160f']} />
      <fog attach="fog" args={['#7a4a32', 45, 130]} />
      <Sky
        distance={450000}
        sunPosition={[40, 12 + (1 - dust) * 10, -30]}
        inclination={0.48}
        azimuth={0.25}
        mieCoefficient={0.015 + dust * 0.03}
        mieDirectionalG={0.7}
        rayleigh={0.2}
        turbidity={10 + dust * 6}
      />
      <Stars radius={180} depth={40} count={1200} factor={2} saturation={0} fade speed={0.4} />
      <hemisphereLight args={['#e0a878', '#4a2a1c', 0.75 + opacity * 0.2]} />
      <directionalLight
        castShadow
        intensity={1.45 - dust * 0.3}
        position={[35, 48, -20]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        color="#ffe0b8"
      />
      <ambientLight intensity={0.38 + dust * 0.12} color="#c88858" />

      <points ref={group}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        </bufferGeometry>
        <pointsMaterial
          size={0.12 + dust * 0.1}
          color="#c89060"
          transparent
          opacity={0.25 + dust * 0.35}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  )
}
