import './style.css';
import * as THREE from 'three';
import { createWorld } from './scene/world';
import { createStation } from './models/station';
import { advance, createState } from './simulation/state';
import { createHUD } from './ui/hud';
const app = document.querySelector<HTMLElement>('#app')!;
const hud = createHUD(app);
try {
  const world = createWorld(hud.element('viewport'));
  const station = createStation(); world.scene.add(station.root);
  const state = createState();
  const selection = new THREE.BoxHelper(station.root, 0x70dccb); selection.visible = false; world.scene.add(selection);
  function focusPart(id: string) {
    const part = station.parts.find(p=>p.id===id); if (!part) return;
    hud.element('part-name').textContent = part.name; hud.element('part-description').textContent = part.description;
    station.root.updateMatrixWorld(true); const target = part.group.getWorldPosition(new THREE.Vector3());
    world.controls.target.copy(target); world.camera.position.copy(target).add(new THREE.Vector3(9,-10,10));
    selection.setFromObject(part.group); selection.visible = true;
    app.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(b=>b.classList.toggle('active',b.dataset.part===id));
    app.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));
  }
  function view(name = 'overview') {
    world.controls.target.set(0,0,0); world.camera.position.copy(name==='top' ? new THREE.Vector3(0,-.1,34) : name==='side' ? new THREE.Vector3(30,-10,4) : new THREE.Vector3(20,-23,24)); selection.visible=false;
    hud.element('part-name').textContent='空间站外景'; hud.element('part-description').textContent='三舱构型教学示意。点击模型或下方舱段按钮，聚焦空间站结构。';
    app.querySelectorAll('[data-part]').forEach(b=>b.classList.remove('active')); app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  }
  app.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(b=>b.addEventListener('click',()=>focusPart(b.dataset.part!)));
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
  hud.element<HTMLInputElement>('solar').addEventListener('input',e=>{ state.solarAngle=Number((e.target as HTMLInputElement).value); station.setSolarAngle(state.solarAngle); hud.update(state); });
  hud.element('reset').addEventListener('click',()=>view());
  hud.element('auto').addEventListener('click',()=>{state.autoRotate=!state.autoRotate; hud.element('auto').setAttribute('aria-pressed',String(state.autoRotate));});
  hud.element('pause').addEventListener('click',()=>{state.paused=!state.paused; hud.element('pause').textContent=state.paused?'▶ 继续':'Ⅱ 暂停'; hud.element('pause').setAttribute('aria-pressed',String(state.paused));});
  hud.element<HTMLSelectElement>('speed').addEventListener('change',e=>{state.speed=Number((e.target as HTMLSelectElement).value);});
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down={x:0,y:0};
  world.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  world.renderer.domElement.addEventListener('pointerup',e=>{if(e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return; const rect=world.renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1); raycaster.setFromCamera(pointer,world.camera); const hit=raycaster.intersectObjects([station.root],true)[0]; if(!hit)return; let object: THREE.Object3D|null=hit.object; while(object&&!object.userData.partId)object=object.parent; if(object)focusPart(object.userData.partId); });
  world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault(); hud.element('error').hidden=false; hud.element('error').textContent='图形上下文丢失，请刷新页面恢复。';});
  let last=performance.now(), frame=0, lastHUD=0;
  function animate(now: number) { advance(state,(now-last)/1000); last=now; world.controls.autoRotate=state.autoRotate&&!state.paused; world.controls.update(); world.renderer.render(world.scene,world.camera); if(now-lastHUD>100){hud.update(state);lastHUD=now;} frame=requestAnimationFrame(animate); }
  frame=requestAnimationFrame(animate);
  if(import.meta.hot)import.meta.hot.dispose(()=>{cancelAnimationFrame(frame);world.dispose();});
} catch(error) { hud.element('error').hidden=false; hud.element('error').textContent='无法启动三维场景，请使用支持 WebGL 的浏览器并开启硬件加速。'; console.error(error); }
