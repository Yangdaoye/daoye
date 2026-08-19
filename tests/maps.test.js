const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadMaps() {
  const code = fs.readFileSync(path.join(__dirname, "../js/maps.js"), "utf8");
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    `${code}
    this.STAGES = STAGES;
    this.MAP_SIZE = MAP_SIZE;
    this.TILE = TILE;
    this.TILE_BASE = TILE_BASE;
    this.TILE_BRICK = TILE_BRICK;
    this.TILE_STEEL = TILE_STEEL;
    this.TILE_WATER = TILE_WATER;`,
    ctx
  );
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
  const tank = { x: stage.playerSpawn.x, y: stage.playerSpawn.y, w: 44, h: 44 };
  const x0 = Math.floor(tank.x / TILE);
  const y0 = Math.floor(tank.y / TILE);
  const x1 = Math.floor((tank.x + tank.w - 0.01) / TILE);
  const y1 = Math.floor((tank.y + tank.h - 0.01) / TILE);
  const blocked = [TILE_BRICK, TILE_STEEL, TILE_WATER, TILE_BASE];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      assert(!blocked.includes(stage.grid[y][x]), `${stage.name} 老师坦克出生点卡进障碍 (${x},${y})`);
    }
  }
  console.log(`ok ${index + 1} ${stage.name} E=${stage.enemySpawns.length} 铃=${bases}`);
});

console.log("maps.test.js passed");
