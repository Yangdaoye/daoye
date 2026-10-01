import * as THREE from 'three';
export interface StationPart { id: string; name: string; description: string; group: THREE.Group; }
export function createStation() {
  const root = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0xd9e2e6, metalness: .65, roughness: .4 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x596878, metalness: .85, roughness: .3 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a65c, metalness: .7, roughness: .45 });
  const parts: StationPart[] = [];
  function module(id: string, name: string, description: string, length: number, radius: number, pos: THREE.Vector3, turn = 0) {
    const group = new THREE.Group(); group.position.copy(pos); group.rotation.z = turn;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 48), hull); group.add(body);
    for (const y of [-length / 2, length / 2]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * .6, radius, .65, 48), gold); cap.position.y = y; if (y < 0) cap.rotation.z = Math.PI; group.add(cap);
      const port = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .3, 32), trim); port.position.y = y + Math.sign(y) * .45; group.add(port);
    }
    for (let y = -length / 2 + .4; y < length / 2; y += .7) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + .015, .035, 8, 48), trim); ring.rotation.x = Math.PI / 2; ring.position.y = y; group.add(ring);
    }
    for (const y of [-1.2, 1.2]) {
      const window = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .1, 24), new THREE.MeshStandardMaterial({ color: 0x17394f, emissive: 0x10364b, metalness: .8 }));
      window.rotation.x = Math.PI / 2; window.position.set(0, y, radius); group.add(window);
    }
    group.userData.partId = id; root.add(group); parts.push({ id, name, description, group }); return group;
  }
  module('core', '天和 · 核心舱', '教学示意：居住、站务管理与姿态控制中心。点击舱段可聚焦观察。', 7, 1.1, new THREE.Vector3(0, -2, 0));
  module('wentian', '问天 · 实验舱', '教学示意：生命科学实验、平台设备与舱外活动支持。', 6, .9, new THREE.Vector3(-4.1, 2.5, 0), Math.PI / 2);
  module('mengtian', '梦天 · 实验舱', '教学示意：微重力实验、载荷与物资转移支持。', 6, .9, new THREE.Vector3(4.1, 2.5, 0), Math.PI / 2);
  const node = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 24), hull); node.position.y = 2.5; root.add(node);
  const pivots: THREE.Group[] = [];
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x164f8f, metalness: .55, roughness: .35, side: THREE.DoubleSide });
  for (const x of [-6.1, 6.1]) for (const sign of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 2.5, 0); root.add(pivot); pivots.push(pivot);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(.12, 6.8, .12), trim); boom.position.y = sign * 3.5; pivot.add(boom);
    for (let row = 0; row < 7; row++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, .82, .035), panelMaterial); panel.position.set(0, sign * (1.5 + row * .9), .09); pivot.add(panel);
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), new THREE.LineBasicMaterial({ color: 0x80bbdf })); panel.add(outline);
      for (let column = -4; column <= 4; column++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(.012, .8, .006), trim); stripe.position.set(column * .26, 0, .023); panel.add(stripe);
      }
    }
  }
  const antenna = new THREE.Mesh(new THREE.ConeGeometry(.65, .25, 32, 1, true), gold); antenna.rotation.x = Math.PI / 2; antenna.position.set(0, -3, 1.9); root.add(antenna);
  root.rotation.set(.15, -.2, -.15);
  return { root, parts, setSolarAngle(degrees: number) { pivots.forEach(p => { p.rotation.y = THREE.MathUtils.degToRad(degrees); }); } };
}
