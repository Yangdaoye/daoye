import * as THREE from 'three'
import type { SimState } from './simulation'

export type DriveControl = 'forward' | 'backward' | 'left' | 'right'

export type MineralSample = {
  id: number
  name: string
  formula: string
  composition: string
  color: number
  position: THREE.Vector3
  collected: boolean
}

export type RoverTelemetry = {
  x: number
  z: number
  heading: number
  speed: number
  slope: number
  battery: number
  distance: number
  target: MineralSample | null
  targetDistance: number
  storage: MineralSample[]
  armState: 'standby' | 'tracking' | 'collecting' | 'secured'
}

export type RoverEvent = {
  tone: 'info' | 'success' | 'warning'
  message: string
}

export type RoverScene = {
  renderer: THREE.WebGLRenderer
  update: (state: SimState, dt: number) => void
  setControl: (control: DriveControl, active: boolean) => void
  scan: () => RoverEvent
  collect: () => RoverEvent
  getTelemetry: () => RoverTelemetry
  consumeEvent: () => RoverEvent | null
  toggleLights: () => boolean
  resetPosition: () => void
  dispose: () => void
}

type SampleVisual = {
  data: MineralSample
  group: THREE.Group
  core: THREE.Mesh
  marker: THREE.Mesh
}

const SAMPLE_TYPES = [
  { name: '赤铁矿', formula: 'Fe₂O₃', composition: '铁 69.9% · 氧 30.1%', color: 0xd75232 },
  { name: '含水硫酸盐', formula: 'MgSO₄·7H₂O', composition: '结晶水 51.2% · 镁 9.9%', color: 0x8dc5dd },
  { name: '橄榄石', formula: '(Mg,Fe)₂SiO₄', composition: '镁 28.4% · 硅 16.3%', color: 0xa7ad55 },
  { name: '玄武岩', formula: 'SiO₂ + FeO', composition: '硅 24.6% · 铁 18.7%', color: 0x74665f },
  { name: '高氯酸盐', formula: 'ClO₄⁻', composition: '氯 22.4% · 氧 77.6%', color: 0xd7bd83 },
] as const

export function createRoverScene(canvas: HTMLCanvasElement): RoverScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x6d3e32)
  scene.fog = new THREE.FogExp2(0x9c6550, 0.009)

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 420)
  camera.rotation.order = 'YXZ'

  const rover = new THREE.Group()
  rover.position.set(0, terrainHeight(0, 12) + 1.62, 12)
  rover.add(camera)
  scene.add(rover)

  camera.position.set(0, 0.08, 0)

  const sun = new THREE.DirectionalLight(0xffdfc4, 3.1)
  sun.position.set(-42, 58, -28)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -55
  sun.shadow.camera.right = 55
  sun.shadow.camera.top = 55
  sun.shadow.camera.bottom = -55
  sun.shadow.bias = -0.0008
  scene.add(sun)

  scene.add(new THREE.HemisphereLight(0xd99a7b, 0x29120d, 1.05))

  const sky = createMartianSky()
  scene.add(sky)

  const terrain = createTerrain()
  scene.add(terrain)

  const ridges = createDistantRidges()
  scene.add(ridges)

  const rockField = createRockField()
  scene.add(rockField)

  const dust = createSurfaceDust()
  scene.add(dust.points)

  const samples = createSamples(scene)
  const targetReticle = createTargetReticle()
  scene.add(targetReticle)
  targetReticle.visible = false

  const headlightLeft = new THREE.SpotLight(0xffe4c4, 0, 24, Math.PI / 6, 0.55, 1.4)
  const headlightRight = headlightLeft.clone()
  headlightLeft.position.set(-0.48, -0.2, -0.25)
  headlightRight.position.set(0.48, -0.2, -0.25)
  headlightLeft.target.position.set(-0.5, -1, -12)
  headlightRight.target.position.set(0.5, -1, -12)
  camera.add(headlightLeft, headlightRight, headlightLeft.target, headlightRight.target)

  const cockpit = createCockpit()
  camera.add(cockpit.group)
  const cabinLight = new THREE.PointLight(0xffb17c, 2.2, 4)
  cabinLight.position.set(0.2, -0.1, -0.3)
  camera.add(cabinLight)

  const controlState: Record<DriveControl, boolean> = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  }

  const telemetry: RoverTelemetry = {
    x: rover.position.x,
    z: rover.position.z,
    heading: 0,
    speed: 0,
    slope: 0,
    battery: 96,
    distance: 0,
    target: null,
    targetDistance: Infinity,
    storage: [],
    armState: 'standby',
  }

  let velocity = 0
  let heading = 0
  let cameraPitch = -0.03
  let lightsOn = false
  let collectionTimer = 0
  let pendingSample: SampleVisual | null = null
  let pendingEvent: RoverEvent | null = null
  let dragging = false
  let lastPointerX = 0
  let lastPointerY = 0

  const setControl = (control: DriveControl, active: boolean) => {
    controlState[control] = active
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat && event.code === 'KeyE') return
    const control = keyToControl(event.code)
    if (control) {
      event.preventDefault()
      setControl(control, true)
    }
    if (event.code === 'Space') {
      event.preventDefault()
      pendingEvent = scan()
    }
    if (event.code === 'KeyE') {
      event.preventDefault()
      pendingEvent = collect()
    }
    if (event.code === 'KeyL') toggleLights()
  }

  const onKeyUp = (event: KeyboardEvent) => {
    const control = keyToControl(event.code)
    if (control) setControl(control, false)
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    dragging = true
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    canvas.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    const dx = event.clientX - lastPointerX
    const dy = event.clientY - lastPointerY
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    heading -= dx * 0.0024
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.0017, -0.28, 0.22)
  }

  const onPointerUp = (event: PointerEvent) => {
    dragging = false
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  }

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight, false)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', onResize)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)

  const scan = (): RoverEvent => {
    const target = findNearestSample(samples, rover.position, 34)
    if (!target) {
      telemetry.target = null
      telemetry.targetDistance = Infinity
      targetReticle.visible = false
      telemetry.armState = 'standby'
      return { tone: 'warning', message: '扫描范围内未发现可采集矿物，请继续向前探索。' }
    }

    telemetry.target = target.data
    telemetry.targetDistance = horizontalDistance(rover.position, target.data.position)
    telemetry.armState = 'tracking'
    targetReticle.visible = true
    targetReticle.position.copy(target.data.position)
    targetReticle.position.y += 0.35
    target.marker.visible = true
    return {
      tone: 'info',
      message: `光谱锁定 ${target.data.name}（${target.data.formula}），距离 ${telemetry.targetDistance.toFixed(1)} m。`,
    }
  }

  const collect = (): RoverEvent => {
    if (telemetry.armState === 'collecting') {
      return { tone: 'warning', message: '机械臂正在执行夹取序列。' }
    }
    if (!telemetry.target) {
      return { tone: 'warning', message: '请先扫描并锁定一个矿物样本。' }
    }

    const visual = samples.find((sample) => sample.data.id === telemetry.target?.id)
    const distance = visual ? horizontalDistance(rover.position, visual.data.position) : Infinity
    if (!visual || visual.data.collected || distance > 4.2) {
      return {
        tone: 'warning',
        message: distance > 4.2 ? `目标距离 ${distance.toFixed(1)} m，请将小车驶入 4 m 采集范围。` : '目标已失效，请重新扫描。',
      }
    }

    velocity = 0
    pendingSample = visual
    collectionTimer = 1.85
    telemetry.armState = 'collecting'
    return { tone: 'info', message: `机械臂展开，正在夹取 ${visual.data.name}…` }
  }

  const update = (state: SimState, dt: number) => {
    const driveInput = Number(controlState.forward) - Number(controlState.backward)
    const steerInput = Number(controlState.left) - Number(controlState.right)
    const maxSpeed = controlState.backward ? 2.1 : 4.4
    const targetVelocity = driveInput * maxSpeed
    velocity = THREE.MathUtils.damp(velocity, targetVelocity, driveInput === 0 ? 4.6 : 2.6, dt)

    if (telemetry.armState === 'collecting') velocity = 0

    const steerScale = 0.55 + Math.min(1, Math.abs(velocity) / 2.5)
    heading += steerInput * dt * 0.9 * steerScale * (velocity < -0.05 ? -1 : 1)
    rover.rotation.y = heading

    const previousGround = rover.position.y - 1.62
    rover.position.x -= Math.sin(heading) * velocity * dt
    rover.position.z -= Math.cos(heading) * velocity * dt
    rover.position.x = THREE.MathUtils.clamp(rover.position.x, -108, 108)
    rover.position.z = THREE.MathUtils.clamp(rover.position.z, -108, 108)

    const ground = terrainHeight(rover.position.x, rover.position.z)
    rover.position.y = THREE.MathUtils.damp(rover.position.y, ground + 1.62, 8, dt)

    // Follow the actual terrain normal so ridges and crater rims are felt from
    // the mast camera rather than appearing as a flat floor beneath it.
    const sampleDistance = 1.15
    const forwardX = -Math.sin(heading)
    const forwardZ = -Math.cos(heading)
    const rightX = Math.cos(heading)
    const rightZ = -Math.sin(heading)
    const forwardHeight = terrainHeight(
      rover.position.x + forwardX * sampleDistance,
      rover.position.z + forwardZ * sampleDistance,
    )
    const rearHeight = terrainHeight(
      rover.position.x - forwardX * sampleDistance,
      rover.position.z - forwardZ * sampleDistance,
    )
    const rightHeight = terrainHeight(
      rover.position.x + rightX * sampleDistance,
      rover.position.z + rightZ * sampleDistance,
    )
    const leftHeight = terrainHeight(
      rover.position.x - rightX * sampleDistance,
      rover.position.z - rightZ * sampleDistance,
    )
    const terrainPitch = Math.atan2(rearHeight - forwardHeight, sampleDistance * 2)
    const terrainRoll = Math.atan2(leftHeight - rightHeight, sampleDistance * 2)
    rover.rotation.x = THREE.MathUtils.damp(rover.rotation.x, terrainPitch, 5.5, dt)
    rover.rotation.z = THREE.MathUtils.damp(rover.rotation.z, terrainRoll, 5.5, dt)

    const roughnessJolt =
      (fractalNoise(rover.position.x * 0.7, rover.position.z * 0.7, 2) - 0.5) *
      Math.min(1, Math.abs(velocity) / 3)
    camera.rotation.x =
      cameraPitch +
      Math.sin(performance.now() * 0.012) * Math.abs(velocity) * 0.001 +
      roughnessJolt * 0.007

    telemetry.x = rover.position.x
    telemetry.z = rover.position.z
    telemetry.heading = ((THREE.MathUtils.radToDeg(-heading) % 360) + 360) % 360
    telemetry.speed = Math.abs(velocity) * 3.6
    telemetry.slope = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(terrainPitch) +
        ((ground - previousGround) / Math.max(dt, 0.001)) * 0.15,
      -28,
      28,
    )
    telemetry.distance += Math.abs(velocity) * dt
    telemetry.battery = THREE.MathUtils.clamp(
      telemetry.battery - Math.abs(velocity) * dt * 0.008 - (lightsOn ? dt * 0.006 : 0),
      0,
      100,
    )

    if (telemetry.target && !telemetry.target.collected) {
      telemetry.targetDistance = horizontalDistance(rover.position, telemetry.target.position)
      targetReticle.position.copy(telemetry.target.position)
      targetReticle.position.y += 0.35
      const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.12
      targetReticle.scale.setScalar(pulse)
    }

    if (collectionTimer > 0) {
      collectionTimer -= dt
      const phase = 1 - collectionTimer / 1.85
      cockpit.setArmPhase(phase)
      if (collectionTimer <= 0 && pendingSample) {
        pendingSample.data.collected = true
        pendingSample.group.visible = false
        telemetry.storage.push(pendingSample.data)
        telemetry.target = null
        telemetry.targetDistance = Infinity
        telemetry.armState = 'secured'
        targetReticle.visible = false
        pendingEvent = {
          tone: 'success',
          message: `${pendingSample.data.name}样本已密封，样本舱 ${telemetry.storage.length}/6。`,
        }
        pendingSample = null
      }
    } else {
      cockpit.setArmPhase(0)
      if (telemetry.armState === 'secured') telemetry.armState = 'standby'
    }

    const dustLevel = state.dust
    const daylight = Math.max(0.12, Math.cos(((state.solHour - 12) / 12) * Math.PI) * 0.5 + 0.5)
    sun.intensity = 1.3 + daylight * 3.3
    sky.material.uniforms.daylight.value = daylight
    sky.material.uniforms.dust.value = dustLevel
    scene.fog = new THREE.FogExp2(
      new THREE.Color().setRGB(
        0.47 + dustLevel * 0.18,
        0.29 + dustLevel * 0.12,
        0.23 + dustLevel * 0.07,
      ).getHex(),
      0.0065 + dustLevel * 0.027,
    )
    dust.update(dt, dustLevel, rover.position)
    cockpit.animate(dt, velocity, telemetry.armState === 'tracking')
    renderer.render(scene, camera)
  }

  const toggleLights = () => {
    lightsOn = !lightsOn
    headlightLeft.intensity = lightsOn ? 55 : 0
    headlightRight.intensity = lightsOn ? 55 : 0
    return lightsOn
  }

  const resetPosition = () => {
    rover.position.set(0, terrainHeight(0, 12) + 1.62, 12)
    velocity = 0
    heading = 0
    rover.rotation.set(0, 0, 0)
  }

  const dispose = () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('resize', onResize)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    renderer.dispose()
    terrain.geometry.dispose()
    const terrainMaterial = terrain.material as THREE.MeshStandardMaterial
    terrainMaterial.map?.dispose()
    terrainMaterial.bumpMap?.dispose()
    terrainMaterial.dispose()
    rockField.geometry.dispose()
    ;(rockField.material as THREE.Material).dispose()
    ridges.geometry.dispose()
    ;(ridges.material as THREE.Material).dispose()
    sky.geometry.dispose()
    sky.material.dispose()
    dust.dispose()
    cockpit.dispose()
    samples.forEach((sample) => {
      sample.core.geometry.dispose()
      ;(sample.core.material as THREE.Material).dispose()
      sample.marker.geometry.dispose()
      ;(sample.marker.material as THREE.Material).dispose()
    })
  }

  return {
    renderer,
    update,
    setControl,
    scan,
    collect,
    getTelemetry: () => telemetry,
    consumeEvent: () => {
      const event = pendingEvent
      pendingEvent = null
      return event
    },
    toggleLights,
    resetPosition,
    dispose,
  }
}

function createTerrain(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(250, 250, 190, 190)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const lowColor = new THREE.Color(0x6b3528)
  const midColor = new THREE.Color(0x9b5138)
  const highColor = new THREE.Color(0xb66b4b)
  const tempColor = new THREE.Color()

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const height = terrainHeight(x, z)
    position.setY(i, height)

    const dx = terrainHeight(x + 0.65, z) - terrainHeight(x - 0.65, z)
    const dz = terrainHeight(x, z + 0.65) - terrainHeight(x, z - 0.65)
    const slope = Math.min(1, Math.hypot(dx, dz) * 0.75)
    const heightMix = THREE.MathUtils.clamp((height + 4) / 11, 0, 1)
    tempColor.copy(midColor).lerp(highColor, heightMix * 0.55)
    tempColor.lerp(lowColor, slope * 0.52)
    const dustVariation = (fractalNoise(x * 0.16, z * 0.16, 2) - 0.5) * 0.13
    tempColor.offsetHSL(0, -0.05, dustVariation)
    colors[i * 3] = tempColor.r
    colors[i * 3 + 1] = tempColor.g
    colors[i * 3 + 2] = tempColor.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const textures = createSoilTextures()
  const material = new THREE.MeshStandardMaterial({
    color: 0xb07a64,
    map: textures.map,
    bumpMap: textures.bump,
    bumpScale: 0.13,
    roughness: 0.97,
    metalness: 0.01,
    vertexColors: true,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

function createMartianSky(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.SphereGeometry(310, 32, 18)
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      daylight: { value: 0.8 },
      dust: { value: 0.16 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float daylight;
      uniform float dust;
      varying vec3 vDirection;
      void main() {
        float elevation = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
        float horizon = pow(1.0 - abs(vDirection.y), 5.0);
        vec3 zenithNight = vec3(0.10, 0.055, 0.05);
        vec3 zenithDay = vec3(0.34, 0.19, 0.15);
        vec3 horizonDay = vec3(0.67, 0.39, 0.29);
        vec3 zenith = mix(zenithNight, zenithDay, daylight);
        vec3 color = mix(horizonDay, zenith, smoothstep(0.08, 0.82, elevation));
        color += vec3(0.16, 0.085, 0.045) * horizon * (0.35 + dust);
        color = mix(color, vec3(0.55, 0.33, 0.25), dust * 0.28);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
  const sky = new THREE.Mesh(geometry, material)
  sky.position.y = -28
  return sky
}

function createDistantRidges(): THREE.Mesh {
  const segments = 160
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const radius = 116 + fractalNoise(Math.cos(angle) * 3, Math.sin(angle) * 3, 3) * 9
    const ridgeNoise = fractalNoise(Math.cos(angle) * 7.2 + 20, Math.sin(angle) * 7.2 - 8, 4)
    const peak = -0.5 + ridgeNoise * 13 + Math.pow(ridgeNoise, 4) * 6
    positions.push(Math.cos(angle) * radius, -10, Math.sin(angle) * radius)
    positions.push(Math.cos(angle) * radius, peak, Math.sin(angle) * radius)

    if (i < segments) {
      const base = i * 2
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({
    color: 0x65392d,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    fog: true,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

function createSoilTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512
  const colorCanvas = document.createElement('canvas')
  const bumpCanvas = document.createElement('canvas')
  colorCanvas.width = colorCanvas.height = size
  bumpCanvas.width = bumpCanvas.height = size
  const colorContext = colorCanvas.getContext('2d')!
  const bumpContext = bumpCanvas.getContext('2d')!
  const colorImage = colorContext.createImageData(size, size)
  const bumpImage = bumpContext.createImageData(size, size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const broad = fractalNoise(x * 0.026, y * 0.026, 4)
      const grain = fractalNoise(x * 0.15 + 40, y * 0.15 - 20, 2)
      const speck = seeded(x * 91.7 + y * 17.3)
      const value = THREE.MathUtils.clamp(broad * 0.67 + grain * 0.22 + speck * 0.11, 0, 1)
      const darkPebble = speck > 0.992 ? -42 : 0
      const index = (y * size + x) * 4
      colorImage.data[index] = 114 + value * 52 + darkPebble
      colorImage.data[index + 1] = 59 + value * 34 + darkPebble * 0.55
      colorImage.data[index + 2] = 42 + value * 27 + darkPebble * 0.45
      colorImage.data[index + 3] = 255
      const bumpValue = THREE.MathUtils.clamp(value * 205 + (speck > 0.992 ? 48 : 0), 0, 255)
      bumpImage.data[index] = bumpValue
      bumpImage.data[index + 1] = bumpValue
      bumpImage.data[index + 2] = bumpValue
      bumpImage.data[index + 3] = 255
    }
  }

  colorContext.putImageData(colorImage, 0, 0)
  bumpContext.putImageData(bumpImage, 0, 0)
  const map = new THREE.CanvasTexture(colorCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(28, 28)
  map.anisotropy = 8
  const bump = new THREE.CanvasTexture(bumpCanvas)
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping
  bump.repeat.set(28, 28)
  return { map, bump }
}

function createRockField(): THREE.InstancedMesh {
  const count = 560
  const geometry = new THREE.IcosahedronGeometry(0.32, 1)
  const rockPosition = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < rockPosition.count; i++) {
    const x = rockPosition.getX(i)
    const y = rockPosition.getY(i)
    const z = rockPosition.getZ(i)
    const variation = 0.78 + seeded(i * 3.41) * 0.42
    rockPosition.setXYZ(i, x * variation, y * (0.72 + seeded(i * 7.2) * 0.32), z * variation)
  }
  geometry.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({
    color: 0x57342b,
    roughness: 0.95,
    metalness: 0.015,
  })
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.castShadow = true
  mesh.receiveShadow = true
  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    const x = seeded(i * 8.17) * 224 - 112
    const z = seeded(i * 21.31 + 4) * 224 - 112
    const size = 0.07 + seeded(i * 12.4) ** 4 * 2.4
    quaternion.setFromEuler(
      new THREE.Euler(seeded(i) * Math.PI, seeded(i + 9) * Math.PI, seeded(i + 3) * Math.PI),
    )
    scale.set(
      size * (0.62 + seeded(i + 18) * 0.65),
      size * (0.55 + seeded(i + 11) * 0.7),
      size * (0.68 + seeded(i + 31) * 0.62),
    )
    matrix.compose(new THREE.Vector3(x, terrainHeight(x, z) + size * 0.24, z), quaternion, scale)
    mesh.setMatrixAt(i, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

function createSamples(scene: THREE.Scene): SampleVisual[] {
  const locations = [
    [-1.4, 4.8],
    [5.5, -2.5],
    [-8.2, -8.5],
    [12, -16],
    [-16, -22],
    [22, -31],
    [-29, -37],
    [35, -48],
    [-42, -58],
    [54, -70],
    [-61, -78],
    [70, -84],
  ] as const

  return locations.map(([x, z], index) => {
    const type = SAMPLE_TYPES[index % SAMPLE_TYPES.length]
    const position = new THREE.Vector3(x, terrainHeight(x, z) + 0.22, z)
    const data: MineralSample = {
      id: index + 1,
      ...type,
      position,
      collected: false,
    }

    const group = new THREE.Group()
    group.position.copy(position)
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22 + (index % 3) * 0.04, 1),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(type.color).lerp(new THREE.Color(0x5d3a30), 0.48),
        emissive: type.color,
        emissiveIntensity: 0.035,
        roughness: 0.91,
        metalness: 0.025,
      }),
    )
    core.castShadow = true
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.39, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffbb86,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    marker.rotation.x = -Math.PI / 2
    marker.position.y = -0.18
    marker.visible = false
    group.add(core, marker)
    scene.add(group)
    return { data, group, core, marker }
  })
}

function createTargetReticle(): THREE.Group {
  const group = new THREE.Group()
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.47, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffd09c,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.05, 2.4, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff8a52,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  beam.position.y = 1.2
  group.add(ring, beam)
  return group
}

function createCockpit() {
  const group = new THREE.Group()
  const dark = new THREE.MeshStandardMaterial({ color: 0x111313, roughness: 0.54, metalness: 0.62 })
  const metal = new THREE.MeshStandardMaterial({ color: 0x4d4c49, roughness: 0.42, metalness: 0.72 })
  const orange = new THREE.MeshStandardMaterial({
    color: 0xe56f3f,
    emissive: 0x8f2e16,
    emissiveIntensity: 0.24,
    roughness: 0.4,
    metalness: 0.55,
  })

  // Lower dashboard and windshield pillars anchor the first-person rover view.
  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.16, 0.62), dark)
  dashboard.position.set(0, -0.77, -0.72)
  dashboard.rotation.x = -0.08
  group.add(dashboard)

  for (const x of [-1.34, 1.34]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.05, 0.075), metal)
    pillar.position.set(x, 0.02, -1.22)
    pillar.rotation.z = x > 0 ? -0.1 : 0.1
    group.add(pillar)
  }

  const armRoot = new THREE.Group()
  // Mounted on the right side, extending inward so the full arm is always
  // visible through the lower windshield during collection.
  armRoot.position.set(0.9, -0.38, -1.18)
  armRoot.rotation.set(-0.18, -0.08, 0.12)
  armRoot.scale.setScalar(0.7)
  group.add(armRoot)

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), orange)
  armRoot.add(shoulder)

  const upperPivot = new THREE.Group()
  armRoot.add(upperPivot)
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.72, 10), metal)
  upper.rotation.z = Math.PI / 2
  upper.position.x = -0.36
  upperPivot.add(upper)

  const elbowPivot = new THREE.Group()
  elbowPivot.position.x = -0.72
  upperPivot.add(elbowPivot)
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), orange)
  elbowPivot.add(elbow)

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.045, 0.62, 10), metal)
  forearm.rotation.z = Math.PI / 2
  forearm.position.x = -0.31
  elbowPivot.add(forearm)

  const claw = new THREE.Group()
  claw.position.x = -0.62
  elbowPivot.add(claw)
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.12), orange)
  claw.add(palm)
  const fingers: THREE.Mesh[] = []
  for (const y of [-0.075, 0.075]) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.035), metal)
    finger.position.set(-0.1, y, 0)
    claw.add(finger)
    fingers.push(finger)
  }

  let idleTime = 0

  return {
    group,
    setArmPhase(phase: number) {
      const reach = Math.sin(Math.min(1, phase) * Math.PI)
      armRoot.rotation.x = -0.18 + reach * 0.42
      armRoot.rotation.y = -0.08 + reach * 0.26
      upperPivot.rotation.z = 0.16 + reach * 0.4
      elbowPivot.rotation.z = -0.3 - reach * 0.65
      const grip = phase > 0.55 ? Math.max(0.025, 0.075 - (phase - 0.55) * 0.11) : 0.075
      fingers[0].position.y = -grip
      fingers[1].position.y = grip
    },
    animate(dt: number, velocity: number, tracking: boolean) {
      idleTime += dt
      if (!tracking) armRoot.rotation.z = 0.12 + Math.sin(idleTime * 1.3) * 0.008
      dashboard.rotation.z = Math.sin(idleTime * 12) * Math.abs(velocity) * 0.00025
    },
    dispose() {
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
      })
      dark.dispose()
      metal.dispose()
      orange.dispose()
    },
  }
}

function createSurfaceDust() {
  const count = 1400
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = seeded(i * 4.1) * 120 - 60
    positions[i * 3 + 1] = seeded(i * 7.3) * 8
    positions[i * 3 + 2] = seeded(i * 11.7) * 120 - 60
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0xf0b080,
    size: 0.05,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  })
  const points = new THREE.Points(geometry, material)

  return {
    points,
    update(dt: number, intensity: number, center: THREE.Vector3) {
      material.opacity = 0.08 + intensity * 0.48
      material.size = 0.025 + intensity * 0.045
      const attr = geometry.attributes.position as THREE.BufferAttribute
      const array = attr.array as Float32Array
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        array[i3] += dt * (0.45 + intensity * 3.8)
        array[i3 + 1] += dt * (0.03 + intensity * 0.18)
        if (array[i3] > center.x + 60) array[i3] = center.x - 60
        if (array[i3] < center.x - 60) array[i3] = center.x + 60
        if (array[i3 + 2] > center.z + 60) array[i3 + 2] = center.z - 60
        if (array[i3 + 2] < center.z - 60) array[i3 + 2] = center.z + 60
        if (array[i3 + 1] > 8) array[i3 + 1] = 0
      }
      attr.needsUpdate = true
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

function terrainHeight(x: number, z: number): number {
  const macro = (fractalNoise(x * 0.013, z * 0.013, 5) - 0.5) * 9.5
  const rolling = (fractalNoise(x * 0.037 + 18, z * 0.037 - 11, 4) - 0.5) * 3.2
  const ridgeNoise = fractalNoise(x * 0.025 - 30, z * 0.025 + 14, 3)
  const ridges = Math.pow(1 - Math.abs(ridgeNoise * 2 - 1), 3) * 2.25
  const surface = (fractalNoise(x * 0.14 + 7, z * 0.14 + 27, 3) - 0.5) * 0.58

  const craters =
    craterProfile(x, z, -27, -9, 15, 4.2) +
    craterProfile(x, z, 26, -41, 10, 2.8) +
    craterProfile(x, z, 57, 27, 19, 5.1) +
    craterProfile(x, z, -61, -64, 12, 3.4) +
    craterProfile(x, z, -48, 50, 8, 2.1)

  return macro + rolling + ridges + surface + craters
}

function craterProfile(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radius: number,
  depth: number,
): number {
  const distance = Math.hypot(x - centerX, z - centerZ)
  const normalized = distance / radius
  const bowl =
    normalized < 1 ? -depth * Math.pow(1 - normalized * normalized, 2) : 0
  const rim = depth * 0.42 * Math.exp(-Math.pow((normalized - 1.03) / 0.13, 2))
  const ejecta =
    normalized > 1 && normalized < 1.9
      ? (fractalNoise(x * 0.23 + centerX, z * 0.23 + centerZ, 2) - 0.5) *
        depth *
        0.22 *
        (1.9 - normalized)
      : 0
  return bowl + rim + ejecta
}

function fractalNoise(x: number, y: number, octaves: number): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  let normalization = 0
  for (let octave = 0; octave < octaves; octave++) {
    value += valueNoise(x * frequency, y * frequency) * amplitude
    normalization += amplitude
    amplitude *= 0.5
    frequency *= 2.03
  }
  return value / normalization
}

function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = smoothstep(x - x0)
  const ty = smoothstep(y - y0)
  const a = hash2(x0, y0)
  const b = hash2(x0 + 1, y0)
  const c = hash2(x0, y0 + 1)
  const d = hash2(x0 + 1, y0 + 1)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, tx),
    THREE.MathUtils.lerp(c, d, tx),
    ty,
  )
}

function hash2(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return value - Math.floor(value)
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value)
}

function findNearestSample(
  samples: SampleVisual[],
  position: THREE.Vector3,
  maxDistance: number,
): SampleVisual | null {
  let nearest: SampleVisual | null = null
  let nearestDistance = maxDistance
  for (const sample of samples) {
    if (sample.data.collected) continue
    const distance = horizontalDistance(position, sample.data.position)
    if (distance < nearestDistance) {
      nearest = sample
      nearestDistance = distance
    }
  }
  return nearest
}

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function keyToControl(code: string): DriveControl | null {
  if (code === 'KeyW' || code === 'ArrowUp') return 'forward'
  if (code === 'KeyS' || code === 'ArrowDown') return 'backward'
  if (code === 'KeyA' || code === 'ArrowLeft') return 'left'
  if (code === 'KeyD' || code === 'ArrowRight') return 'right'
  return null
}

function seeded(value: number): number {
  const x = Math.sin(value * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
