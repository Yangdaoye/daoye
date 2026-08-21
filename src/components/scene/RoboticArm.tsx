import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMissionStore } from '../../store/missionStore'

/**
 * 6-DOF style virtual manipulator for mission simulation on real terrain.
 * Controlled via store target (keyboard / mouse / gesture).
 */
export function RoboticArm() {
  const base = useMissionStore((s) => s.armBase)
  const target = useMissionStore((s) => s.armTarget)
  const mode = useMissionStore((s) => s.armMode)
  const isScanning = useMissionStore((s) => s.isScanning)

  const shoulderRef = useRef<THREE.Group>(null)
  const elbowRef = useRef<THREE.Group>(null)
  const wristRef = useRef<THREE.Group>(null)
  const effectorRef = useRef<THREE.Mesh>(null)
  const beamRef = useRef<THREE.Mesh>(null)
  const current = useRef(new THREE.Vector3(...target))

  const baseY = useMemo(() => {
    return base[1]
  }, [base])

  useFrame((_, dt) => {
    const desired = new THREE.Vector3(...useMissionStore.getState().armTarget)
    current.current.lerp(desired, Math.min(1, dt * 2.4))

    const local = current.current.clone().sub(new THREE.Vector3(base[0], baseY, base[2]))
    const yaw = Math.atan2(local.x, local.z)
    const horizontal = Math.hypot(local.x, local.z)
    const reach = Math.min(14, Math.max(2.5, horizontal))
    const elev = Math.atan2(local.y - 1.2, reach)

    if (shoulderRef.current) {
      shoulderRef.current.rotation.y = THREE.MathUtils.damp(
        shoulderRef.current.rotation.y,
        yaw,
        6,
        dt,
      )
      shoulderRef.current.rotation.x = THREE.MathUtils.damp(
        shoulderRef.current.rotation.x,
        -elev * 0.65 - 0.25,
        6,
        dt,
      )
    }
    if (elbowRef.current) {
      const fold = mode === 'stow' ? 1.4 : 0.55 - elev * 0.4
      elbowRef.current.rotation.x = THREE.MathUtils.damp(elbowRef.current.rotation.x, fold, 6, dt)
    }
    if (wristRef.current) {
      const grasp = mode === 'grasp' ? 0.8 : mode === 'scan' ? -0.3 : 0.1
      wristRef.current.rotation.x = THREE.MathUtils.damp(wristRef.current.rotation.x, grasp, 8, dt)
    }
    if (effectorRef.current) {
      const mat = effectorRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = isScanning ? 0.9 + Math.sin(performance.now() * 0.02) * 0.4 : 0.25
    }
    if (beamRef.current) {
      beamRef.current.visible = isScanning
      if (isScanning) {
        const len = current.current.distanceTo(new THREE.Vector3(base[0], baseY + 1.4, base[2]))
        beamRef.current.scale.set(1, 1, Math.max(0.5, len * 0.55))
        beamRef.current.lookAt(current.current)
      }
    }
  })

  return (
    <group position={[base[0], baseY, base[2]]}>
      {/* Rover-ish deck */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.55, 4.2]} />
        <meshStandardMaterial color="#6a5a4e" metalness={0.45} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.7, -0.3]} castShadow>
        <boxGeometry args={[1.4, 0.35, 1.4]} />
        <meshStandardMaterial color="#8a7a6a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Wheels */}
      {[
        [-1.5, 0.35, 1.4],
        [1.5, 0.35, 1.4],
        [-1.5, 0.35, -1.4],
        [1.5, 0.35, -1.4],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.35, 12]} />
          <meshStandardMaterial color="#2a2420" roughness={0.9} />
        </mesh>
      ))}

      <group ref={shoulderRef} position={[0.6, 0.95, 0.9]}>
        <mesh castShadow>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color="#b8a090" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Upper arm */}
        <mesh position={[0, 0, 1.4]} castShadow>
          <boxGeometry args={[0.22, 0.22, 2.8]} />
          <meshStandardMaterial color="#c4b4a4" metalness={0.55} roughness={0.4} />
        </mesh>
        <group ref={elbowRef} position={[0, 0, 2.8]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 14, 14]} />
            <meshStandardMaterial color="#a89888" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 1.2]} castShadow>
            <boxGeometry args={[0.18, 0.18, 2.4]} />
            <meshStandardMaterial color="#d2c2b2" metalness={0.5} roughness={0.4} />
          </mesh>
          <group ref={wristRef} position={[0, 0, 2.4]}>
            <mesh castShadow>
              <boxGeometry args={[0.35, 0.25, 0.4]} />
              <meshStandardMaterial color="#9a8a7a" metalness={0.65} roughness={0.3} />
            </mesh>
            <mesh ref={effectorRef} position={[0, -0.25, 0.15]} castShadow>
              <coneGeometry args={[0.18, 0.45, 6]} />
              <meshStandardMaterial
                color="#e8c070"
                emissive="#e8a040"
                emissiveIntensity={0.25}
                metalness={0.4}
                roughness={0.35}
              />
            </mesh>
            {/* Gripper fingers */}
            <mesh position={[-0.16, -0.45, 0.15]} castShadow>
              <boxGeometry args={[0.06, 0.35, 0.08]} />
              <meshStandardMaterial color="#ddd0c0" metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh position={[0.16, -0.45, 0.15]} castShadow>
              <boxGeometry args={[0.06, 0.35, 0.08]} />
              <meshStandardMaterial color="#ddd0c0" metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh ref={beamRef} position={[0, -0.2, 0]} visible={false}>
              <cylinderGeometry args={[0.03, 0.08, 1, 8]} />
              <meshBasicMaterial color="#ffcc66" transparent opacity={0.55} />
            </mesh>
          </group>
        </group>
      </group>

      </group>
  )
}
