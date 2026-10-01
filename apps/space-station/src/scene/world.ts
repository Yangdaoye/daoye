import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export function createWorld(container: HTMLElement) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060b16);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 1500); camera.position.set(20, -23, 24); camera.up.set(0, 0, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(container.clientWidth, container.clientHeight); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.5; container.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 5; controls.maxDistance = 80; controls.autoRotateSpeed = .5;
  scene.add(new THREE.HemisphereLight(0xa6d6ff, 0x182333, 2));
  const sun = new THREE.DirectionalLight(0xffe5bd, 4); sun.position.set(-20, -15, 30); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x459dff, 2); fill.position.set(20, 15, -10); scene.add(fill);
  const vertices: number[] = []; let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1800; i++) { const z = random() * 2 - 1, a = random() * Math.PI * 2, r = Math.sqrt(1-z*z); vertices.push(450*r*Math.cos(a), 450*r*Math.sin(a), 450*z); }
  const starsGeometry = new THREE.BufferGeometry(); starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xc6d7ed, size: .45, sizeAttenuation: true })));
  const earth = new THREE.Mesh(new THREE.SphereGeometry(110, 64, 48), new THREE.MeshStandardMaterial({ color: 0x174c79, roughness: 1, metalness: .05 })); earth.position.set(0, 35, -135); scene.add(earth);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(111.2, 64, 48), new THREE.MeshBasicMaterial({ color: 0x4fafff, transparent: true, opacity: .12, side: THREE.BackSide })); atmosphere.position.copy(earth.position); scene.add(atmosphere);
  const resize = () => { const w = container.clientWidth, h = container.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  return { scene, camera, renderer, controls, dispose() { observer.disconnect(); controls.dispose(); scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); } }); renderer.dispose(); renderer.domElement.remove(); } };
}
