import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStation } from '../src/models/station.ts';
import { createState, advance, telemetry } from '../src/simulation/state.ts';
test('time controls and solar angle affect simulated telemetry', () => {
  const state=createState(); advance(state,.05); assert.equal(state.elapsed,.05);
  state.paused=true; advance(state,.05); assert.equal(state.elapsed,.05);
  state.paused=false;state.speed=60;advance(state,.05);assert.equal(state.elapsed,3.05);
  state.solarAngle=90;assert.ok(telemetry(state).power<1e-10);
  state.elapsed=2700;state.solarAngle=0;assert.equal(telemetry(state).daylight,false);assert.equal(telemetry(state).power,0);
});
test('three distinct selectable modules and four rotating solar pivots share one scene',()=>{
  const station=createStation(); assert.deepEqual(station.parts.map(p=>p.id),['core','wentian','mengtian']);
  station.root.updateMatrixWorld(true);
  for(const part of station.parts){assert.equal(part.group.parent,station.root);assert.equal(part.group.userData.partId,part.id);assert.ok(!new THREE.Box3().setFromObject(part.group).isEmpty());}
  station.setSolarAngle(45);assert.equal(station.root.children.filter(c=>Math.abs(c.rotation.y-Math.PI/4)<1e-10).length,4);
});
