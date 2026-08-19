const fs = require("fs");
const path = require("path");
const vm = require("vm");

function load(file) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), ctx);
  return ctx;
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const maps = load("../js/maps.js");
vm.runInContext(
  `${fs.readFileSync(path.join(__dirname, "../js/entities.js"), "utf8")}
  this.rectsOverlap = rectsOverlap;
  this.clamp = clamp;
  this.Tank = Tank;
  this.Bullet = Bullet;
  this.DIR = DIR;
  this.TANK_KINDS = TANK_KINDS;
  this.unlockedKinds = unlockedKinds;
  this.ENEMY_UNLOCKS = ENEMY_UNLOCKS;
  this.PICKUP_UNLOCKS = PICKUP_UNLOCKS;
  this.WEAPON_LABELS = WEAPON_LABELS;`,
  maps
);

assert(maps.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 8, y: 8, w: 10, h: 10 }), "重叠矩形应判定碰撞");
assert(!maps.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 10, h: 10 }), "分离矩形不应碰撞");
assert(maps.clamp(12, 0, 10) === 10, "clamp 上限");
assert(maps.clamp(-2, 0, 10) === 0, "clamp 下限");

const teacher = new maps.Tank(0, 0, "teacher", "player");
assert(teacher.kind === "teacher", "老师坦克种类");
assert(teacher.w >= 40 && teacher.h >= 40, "老师坦克尺寸");
assert(maps.TANK_KINDS.teacher.badge === "师", "白色坦克代表老师");
assert(maps.TANK_KINDS.teacher.hp === 3, "老师坦克开局应更耐打");
assert(maps.unlockedKinds(0, maps.ENEMY_UNLOCKS).join() === "rascal", "第一关只有捣蛋生");
assert(maps.unlockedKinds(2, maps.ENEMY_UNLOCKS).includes("monitor"), "第三关出现课代表");
assert(maps.unlockedKinds(7, maps.ENEMY_UNLOCKS).includes("boss"), "后关出现期末大考");
assert(maps.unlockedKinds(0, maps.PICKUP_UNLOCKS).join() === "flower", "第一关只有红花");
assert(maps.unlockedKinds(2, maps.PICKUP_UNLOCKS).includes("ruler"), "第三关解锁直尺散射");
assert(maps.WEAPON_LABELS.spread === "直尺散射", "武器名称");
assert(maps.TANK_KINDS.rascal.score === 100, "捣蛋生分数");
assert(maps.TANK_KINDS.boss.hp === 8, "期末大考血量");

const bullet = new maps.Bullet(20, 20, maps.DIR.UP, "player", 1);
assert(bullet.vy < 0, "向上炮弹应有负 y 速度");

console.log("entities.test.js passed");
