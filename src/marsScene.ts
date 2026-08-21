import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createMarsTextures } from './marsTextures'
import type { SimState } from './simulation'

const ATMOSPHERE_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const ATMOSPHERE_FRAG = /* glsl */ `
uniform vec3 glowColor;
uniform float intensity;
uniform float dust;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.4);
  float haze = mix(0.55, 1.15, dust);
  vec3 col = glowColor * fresnel * intensity * haze;
  gl_FragColor = vec4(col, fresnel * 0.85);
}
`

export type MarsScene = {
  renderer: THREE.WebGLRenderer
  update: (state: SimState, dt: number) => void
  setViewMode: (mode: 'orbit' | 'surface') => void
  dispose: () => void
}

export function createMarsScene(canvas: HTMLCanvasElement): MarsScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x1a0c08, 0.018)

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0.8, 1.2, 4.2)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 1.55
  controls.maxDistance = 12
  controls.enablePan = false
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.35

  // Starfield
  scene.add(createStarfield())

  // Lights
  const sun = new THREE.DirectionalLight(0xffe2c4, 2.4)
  sun.position.set(8, 2, 4)
  scene.add(sun)

  const ambient = new THREE.AmbientLight(0x3a2218, 0.35)
  scene.add(ambient)

  const rim = new THREE.DirectionalLight(0x6a8aaa, 0.45)
  rim.position.set(-6, -1, -4)
  scene.add(rim)

  // Mars
  const { map, bumpMap } = createMarsTextures(1024)
  const marsGeo = new THREE.SphereGeometry(1, 96, 96)
  const marsMat = new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: 0.045,
    roughness: 0.92,
    metalness: 0.05,
  })
  const mars = new THREE.Mesh(marsGeo, marsMat)
  scene.add(mars)

  // Thin CO2 atmosphere shell
  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: ATMOSPHERE_VERT,
    fragmentShader: ATMOSPHERE_FRAG,
    uniforms: {
      glowColor: { value: new THREE.Color(0xe07848) },
      intensity: { value: 1.15 },
      dust: { value: 0.18 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  })
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 64), atmoMat)
  scene.add(atmosphere)

  // Dust cloud shell
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0xc45a2c,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const dustShell = new THREE.Mesh(new THREE.SphereGeometry(1.04, 48, 48), dustMat)
  scene.add(dustShell)

  // Dust particles
  const dustSystem = createDustParticles()
  scene.add(dustSystem.points)

  // Moons
  const phobos = createMoon(0.04, 0xb08968)
  const deimos = createMoon(0.025, 0x9a7b62)
  scene.add(phobos)
  scene.add(deimos)

  // Soft ground plane hint for surface mode (hidden by default)
  const surfacePlate = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 48),
    new THREE.MeshStandardMaterial({
      color: 0x8a4a2e,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0,
    }),
  )
  surfacePlate.rotation.x = -Math.PI / 2
  surfacePlate.position.y = -1.02
  scene.add(surfacePlate)

  let viewMode: 'orbit' | 'surface' = 'orbit'
  let solAngle = 0

  const onResize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  window.addEventListener('resize', onResize)

  const update = (state: SimState, dt: number) => {
    solAngle = (state.solHour / 24) * Math.PI * 2

    // Day/night: sun orbits relative to Mars
    sun.position.set(Math.cos(solAngle) * 10, 1.5 + Math.sin(solAngle) * 0.8, Math.sin(solAngle) * 10)
    sun.intensity = 1.4 + Math.max(0, Math.cos(solAngle - Math.PI * 0.15)) * 1.4

    mars.rotation.y += dt * 0.04 * state.timeScale
    atmosphere.rotation.y = mars.rotation.y * 0.98

    atmoMat.uniforms.dust.value = state.dust
    atmoMat.uniforms.intensity.value = 0.85 + state.dust * 0.9
    dustMat.opacity = 0.04 + state.dust * 0.32
    dustShell.scale.setScalar(1 + state.dust * 0.04)

    dustSystem.update(dt, state.dust)

    // Phobos ~7.6h orbit (sped up), Deimos ~30h
    const t = performance.now() * 0.001
    phobos.position.set(Math.cos(t * 0.55) * 1.85, Math.sin(t * 0.2) * 0.15, Math.sin(t * 0.55) * 1.85)
    deimos.position.set(Math.cos(t * 0.18 + 1.2) * 2.6, Math.sin(t * 0.1) * 0.25, Math.sin(t * 0.18 + 1.2) * 2.6)

    controls.autoRotate = state.autoRotate && viewMode === 'orbit'
    controls.minDistance = viewMode === 'surface' ? 1.12 : 1.55
    controls.maxDistance = viewMode === 'surface' ? 2.2 : 12

    if (viewMode === 'surface') {
      surfacePlate.material.opacity = 0.35 + state.dust * 0.2
      scene.fog = new THREE.FogExp2(
        new THREE.Color().setHSL(0.05, 0.55, 0.08 + state.dust * 0.06).getHex(),
        0.12 + state.dust * 0.25,
      )
    } else {
      surfacePlate.material.opacity = 0
      scene.fog = new THREE.FogExp2(0x1a0c08, 0.012 + state.dust * 0.02)
    }

    // Soft camera distance target from slider
    const targetDist = state.cameraDistance
    const current = camera.position.length()
    if (Math.abs(current - targetDist) > 0.02 && viewMode === 'orbit') {
      camera.position.multiplyScalar(1 + (targetDist / current - 1) * Math.min(1, dt * 1.5))
    }

    controls.update()
    renderer.render(scene, camera)
  }

  const setViewMode = (mode: 'orbit' | 'surface') => {
    viewMode = mode
    if (mode === 'surface') {
      camera.position.set(0.15, 0.35, 1.35)
      controls.target.set(0, 0.1, 0)
      controls.autoRotate = false
    } else {
      camera.position.set(0.8, 1.2, 4.2)
      controls.target.set(0, 0, 0)
    }
    controls.update()
  }

  const dispose = () => {
    window.removeEventListener('resize', onResize)
    controls.dispose()
    renderer.dispose()
    map.dispose()
    bumpMap.dispose()
    marsGeo.dispose()
    marsMat.dispose()
    atmoMat.dispose()
    dustMat.dispose()
    dustSystem.dispose()
  }

  return { renderer, update, setViewMode, dispose }
}

function createMoon(radius: number, color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }),
  )
}

function createStarfield(): THREE.Points {
  const count = 2800
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 80
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xfff5ea,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  })
  return new THREE.Points(geo, mat)
}

function createDustParticles() {
  const count = 1200
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    randomShell(positions, i, 1.05, 1.55)
    velocities[i] = 0.05 + Math.random() * 0.2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xd4a574,
    size: 0.025,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)

  return {
    points,
    update(dt: number, dust: number) {
      mat.opacity = 0.12 + dust * 0.55
      mat.size = 0.018 + dust * 0.04
      const pos = geo.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        arr[i3 + 1] += velocities[i] * dt * (0.3 + dust)
        // Drift azimuthally
        const x = arr[i3]
        const z = arr[i3 + 2]
        const ang = dt * velocities[i] * (0.4 + dust * 1.2)
        arr[i3] = x * Math.cos(ang) - z * Math.sin(ang)
        arr[i3 + 2] = x * Math.sin(ang) + z * Math.cos(ang)

        const r = Math.sqrt(arr[i3] ** 2 + arr[i3 + 1] ** 2 + arr[i3 + 2] ** 2)
        if (r > 1.7 || arr[i3 + 1] > 1.2) {
          randomShell(arr, i, 1.05, 1.4)
        }
      }
      pos.needsUpdate = true
    },
    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}

function randomShell(arr: Float32Array, i: number, rMin: number, rMax: number) {
  const r = rMin + Math.random() * (rMax - rMin)
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const i3 = i * 3
  arr[i3] = r * Math.sin(phi) * Math.cos(theta)
  arr[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55
  arr[i3 + 2] = r * Math.cos(phi)
}
