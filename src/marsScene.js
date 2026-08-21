import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Procedural Mars globe, thin atmosphere, Phobos & Deimos, starfield.
 */
export class MarsScene {
  constructor(canvas) {
    this.canvas = canvas
    this.mode = 'orbit'
    this.showMoons = true
    this.showAtmosphere = true
    this.targetDust = 0.12

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x1a100c, 0.012)

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400)
    this.camera.position.set(0, 1.4, 6.2)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.minDistance = 2.4
    this.controls.maxDistance = 14
    this.controls.enablePan = false
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.35

    this.root = new THREE.Group()
    this.scene.add(this.root)

    this._buildLights()
    this._buildStars()
    this._buildMars()
    this._buildMoons()

    this._camOrbit = new THREE.Vector3(0, 1.4, 6.2)
    this._camLand = new THREE.Vector3(0.35, 0.55, 2.85)
    this._camTarget = this._camOrbit.clone()

    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
  }

  _buildLights() {
    this.sunLight = new THREE.DirectionalLight(0xffe2c4, 2.4)
    this.sunLight.position.set(8, 2, 4)
    this.scene.add(this.sunLight)

    const ambient = new THREE.AmbientLight(0x3a2418, 0.35)
    this.scene.add(ambient)

    const rim = new THREE.DirectionalLight(0x6a90ff, 0.25)
    rim.position.set(-6, -1, -4)
    this.scene.add(rim)

    this.dustGlow = new THREE.PointLight(0xc45a2c, 0.0, 12)
    this.dustGlow.position.set(0, 0, 0)
    this.scene.add(this.dustGlow)
  }

  _buildStars() {
    const count = 1800
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 60 + Math.random() * 80
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xfff0e0,
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
    this.stars = new THREE.Points(geo, mat)
    this.scene.add(this.stars)
  }

  _buildMars() {
    const map = createMarsTexture(1024)
    const bump = createBumpTexture(512)

    const geo = new THREE.SphereGeometry(1.6, 96, 96)
    const mat = new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.045,
      roughness: 0.92,
      metalness: 0.04,
      color: 0xffffff,
    })
    this.mars = new THREE.Mesh(geo, mat)
    this.root.add(this.mars)

    // Thin scattering shell
    const atmGeo = new THREE.SphereGeometry(1.68, 64, 64)
    this.atmMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uColor: { value: new THREE.Color(0xd4784a) },
        uOpacity: { value: 0.28 },
        uDust: { value: 0.12 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uDust;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.4);
          float alpha = fresnel * (uOpacity + uDust * 0.45);
          vec3 col = mix(uColor, vec3(0.55, 0.28, 0.14), uDust);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    })
    this.atmosphere = new THREE.Mesh(atmGeo, this.atmMat)
    this.root.add(this.atmosphere)

    // Polar ice hint
    const iceGeo = new THREE.SphereGeometry(1.602, 48, 48, 0, Math.PI * 2, 0, 0.22)
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xe8dcc8,
      roughness: 0.55,
      metalness: 0.05,
      transparent: true,
      opacity: 0.55,
    })
    this.northIce = new THREE.Mesh(iceGeo, iceMat)
    this.root.add(this.northIce)

    const southIce = iceGeo.clone()
    this.southIce = new THREE.Mesh(southIce, iceMat.clone())
    this.southIce.rotation.x = Math.PI
    this.root.add(this.southIce)
  }

  _buildMoons() {
    this.moonGroup = new THREE.Group()
    this.root.add(this.moonGroup)

    const phobosMat = new THREE.MeshStandardMaterial({ color: 0x8a7364, roughness: 0.95 })
    this.phobos = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), phobosMat)
    this.moonGroup.add(this.phobos)

    const deimosMat = new THREE.MeshStandardMaterial({ color: 0x6e5c50, roughness: 0.95 })
    this.deimos = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), deimosMat)
    this.moonGroup.add(this.deimos)

    this._phobosAngle = 0
    this._deimosAngle = 1.2
  }

  setMode(mode) {
    this.mode = mode
    if (mode === 'land') {
      this._camTarget.copy(this._camLand)
      this.controls.autoRotate = false
      this.controls.minDistance = 2.2
      this.controls.maxDistance = 5
    } else {
      this._camTarget.copy(this._camOrbit)
      this.controls.autoRotate = true
      this.controls.minDistance = 2.4
      this.controls.maxDistance = 14
    }
  }

  setMoonsVisible(visible) {
    this.showMoons = visible
    this.moonGroup.visible = visible
  }

  setAtmosphereVisible(visible) {
    this.showAtmosphere = visible
    this.atmosphere.visible = visible
  }

  setDust(normalized) {
    this.targetDust = normalized
  }

  /** Sync visual state from simulation telemetry. */
  applySim(sim, telemetry) {
    const dayFrac = sim.hour / 24.66
    // Spin Mars so local longitude faces camera roughly with time of day.
    this.mars.rotation.y = dayFrac * Math.PI * 2
    this.northIce.rotation.y = this.mars.rotation.y
    this.southIce.rotation.y = this.mars.rotation.y

    // Axial tilt ~25°
    this.root.rotation.z = THREE.MathUtils.degToRad(25.19) * 0.35

    const elev = telemetry.sunElevation
    const sunStrength = THREE.MathUtils.clamp((elev + 8) / 55, 0.08, 1)
    this.sunLight.intensity = 0.55 + sunStrength * 2.1
    this.sunLight.color.setHSL(0.08, 0.35 + sunStrength * 0.2, 0.72)

    const angle = ((sim.hour / 24.66) * Math.PI * 2) - Math.PI / 2
    this.sunLight.position.set(Math.cos(angle) * 10, Math.sin(elev * 0.02) * 4 + 1.5, Math.sin(angle) * 10)

    const dust = this.targetDust
    this.atmMat.uniforms.uDust.value = THREE.MathUtils.lerp(
      this.atmMat.uniforms.uDust.value,
      dust,
      0.05,
    )
    this.dustGlow.intensity = dust * 1.8
    this.scene.fog.density = 0.01 + dust * 0.035

    this.renderer.toneMappingExposure = 0.85 + sunStrength * 0.35 - dust * 0.15
  }

  update(dt, simSpeed) {
    this.controls.update()

    // Ease camera toward mode target when switching.
    this.camera.position.lerp(this._camTarget, 1 - Math.pow(0.001, dt))

    const orbitFactor = Math.max(0.15, simSpeed)
    this._phobosAngle += dt * 0.55 * Math.min(orbitFactor, 8)
    this._deimosAngle += dt * 0.18 * Math.min(orbitFactor, 8)

    this.phobos.position.set(
      Math.cos(this._phobosAngle) * 2.35,
      Math.sin(this._phobosAngle * 0.4) * 0.25,
      Math.sin(this._phobosAngle) * 2.35,
    )
    this.deimos.position.set(
      Math.cos(this._deimosAngle) * 3.4,
      Math.sin(this._deimosAngle * 0.3) * 0.4,
      Math.sin(this._deimosAngle) * 3.4,
    )

    this.stars.rotation.y += dt * 0.003
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    window.removeEventListener('resize', this._onResize)
    this.controls.dispose()
    this.renderer.dispose()
  }
}

function createMarsTexture(size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#6b2f18')
  gradient.addColorStop(0.35, '#a04828')
  gradient.addColorStop(0.55, '#c45a2c')
  gradient.addColorStop(0.75, '#8a3a1e')
  gradient.addColorStop(1, '#5a2414')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Large albedo continents / highland noise
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 4 + Math.random() * 40
    const shade = 80 + Math.floor(Math.random() * 90)
    ctx.fillStyle = `rgba(${shade + 40}, ${shade * 0.45}, ${shade * 0.22}, ${0.04 + Math.random() * 0.08})`
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * (0.4 + Math.random() * 0.8), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  // Dark maria / basins
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size
    const y = size * (0.2 + Math.random() * 0.6)
    const r = 20 + Math.random() * 70
    ctx.fillStyle = `rgba(40, 18, 10, ${0.12 + Math.random() * 0.2})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Craters
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 3 + Math.random() * 18
    ctx.strokeStyle = `rgba(255, 200, 160, ${0.08 + Math.random() * 0.12})`
    ctx.lineWidth = 1 + Math.random()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = `rgba(30, 12, 8, ${0.08 + Math.random() * 0.15})`
    ctx.beginPath()
    ctx.arc(x + r * 0.1, y + r * 0.1, r * 0.7, 0, Math.PI * 2)
    ctx.fill()
  }

  // Valles Marineris-like scar
  ctx.strokeStyle = 'rgba(55, 22, 12, 0.45)'
  ctx.lineWidth = size * 0.012
  ctx.beginPath()
  ctx.moveTo(size * 0.35, size * 0.48)
  ctx.bezierCurveTo(size * 0.48, size * 0.52, size * 0.58, size * 0.46, size * 0.72, size * 0.5)
  ctx.stroke()

  // Olympus Mons bright patch
  const ox = size * 0.22
  const oy = size * 0.38
  const og = ctx.createRadialGradient(ox, oy, 2, ox, oy, size * 0.06)
  og.addColorStop(0, 'rgba(232, 180, 140, 0.55)')
  og.addColorStop(1, 'rgba(196, 90, 44, 0)')
  ctx.fillStyle = og
  ctx.beginPath()
  ctx.arc(ox, oy, size * 0.06, 0, Math.PI * 2)
  ctx.fill()

  // Polar caps
  const north = ctx.createLinearGradient(0, 0, 0, size * 0.12)
  north.addColorStop(0, 'rgba(240, 230, 215, 0.85)')
  north.addColorStop(1, 'rgba(240, 230, 215, 0)')
  ctx.fillStyle = north
  ctx.fillRect(0, 0, size, size * 0.12)

  const south = ctx.createLinearGradient(0, size, 0, size * 0.88)
  south.addColorStop(0, 'rgba(235, 225, 210, 0.8)')
  south.addColorStop(1, 'rgba(235, 225, 210, 0)')
  ctx.fillStyle = south
  ctx.fillRect(0, size * 0.88, size, size * 0.12)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function createBumpTexture(size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 800; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 2 + Math.random() * 16
    const g = 90 + Math.floor(Math.random() * 80)
    ctx.fillStyle = `rgb(${g},${g},${g})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}
