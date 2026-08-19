const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadMaps() {
  const code = fs.readFileSync(path.join(__dirname, "../js/maps.js"), "utf8");
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(`${code}\nthis.STAGES = STAGES; this.MAP_SIZE = MAP_SIZE; this.TILE = TILE; this.TILE_BASE = TILE_BASE;`, ctx);
  return ctx;
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const { STAGES, MAP_SIZE, TILE, TILE_BASE } = loadMaps();

assert(STAGES.length === 5, `应为 5 堂课，实际 ${STAGES.length}`);

STAGES.forEach((stage, index) => {
  assert(stage.grid.length === MAP_SIZE, `${stage.name} 行数错误`);
  assert(stage.grid.every((row) => row.length === MAP_SIZE), `${stage.name} 列数错误`);
  assert(stage.enemySpawns.length >= 3, `${stage.name} 敌军出生点不足`);
  assert(stage.playerSpawn.x >= 0 && stage.playerSpawn.y >= 0, `${stage.name} 缺少老师出生点`);
  const bases = stage.grid.flat().filter((t) => t === TILE_BASE).length;
  assert(bases >= 4, `${stage.name} 讲台格子太少：${bases}`);
  assert(stage.playerSpawn.x % TILE === 0, `${stage.name} 出生点未对齐`);
  console.log(`ok ${index + 1} ${stage.name} E=${stage.enemySpawns.length} 铃=${bases}`);
});

console.log("maps.test.js passed");
