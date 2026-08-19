const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
const DIR_VEC = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const TANK_KINDS = {
  teacher: {
    label: "老师",
    color: "#f6f3ea",
    shade: "#c9c3b3",
    track: "#5b5852",
    speed: 1.72,
    hp: 3,
    cooldown: 260,
    score: 0,
    badge: "师",
  },
  rascal: {
    label: "捣蛋生",
    color: "#f0c419",
    shade: "#c49a10",
    track: "#5a4a12",
    speed: 1.05,
    hp: 1,
    cooldown: 900,
    score: 100,
    badge: "皮",
  },
  late: {
    label: "迟到王",
    color: "#5dcf7a",
    shade: "#2f9a4c",
    track: "#1f4d2c",
    speed: 1.85,
    hp: 1,
    cooldown: 760,
    score: 200,
    badge: "迟",
  },
  exam: {
    label: "试卷铁甲",
    color: "#d94b3d",
    shade: "#9a2c23",
    track: "#4a1c18",
    speed: 0.85,
    hp: 3,
    cooldown: 820,
    score: 300,
    badge: "卷",
  },
  phone: {
    label: "手机党",
    color: "#b56ad4",
    shade: "#7b3d9a",
    track: "#3d2150",
    speed: 1.2,
    hp: 1,
    cooldown: 420,
    score: 250,
    badge: "机",
  },
  boss: {
    label: "期末大考",
    color: "#6b2433",
    shade: "#3d1018",
    track: "#241016",
    speed: 1.15,
    hp: 8,
    cooldown: 380,
    score: 1000,
    badge: "考",
    scale: 1.15,
  },
  monitor: {
    label: "课代表",
    color: "#4a90d9",
    shade: "#245a96",
    track: "#1a3554",
    speed: 1.12,
    hp: 2,
    cooldown: 720,
    score: 220,
    badge: "代",
  },
  duty: {
    label: "值日生",
    color: "#e67e22",
    shade: "#a35412",
    track: "#5a3010",
    speed: 1.35,
    hp: 2,
    cooldown: 540,
    score: 280,
    badge: "值",
  },
  director: {
    label: "年级主任",
    color: "#1e6b4a",
    shade: "#0f3d2b",
    track: "#0a2419",
    speed: 1.05,
    hp: 5,
    cooldown: 460,
    score: 600,
    badge: "主",
    scale: 1.08,
  },
};

const ENEMY_UNLOCKS = [
  { from: 0, kind: "rascal" },
  { from: 1, kind: "late" },
  { from: 2, kind: "monitor" },
  { from: 3, kind: "exam" },
  { from: 4, kind: "phone" },
  { from: 5, kind: "duty" },
  { from: 6, kind: "director" },
  { from: 7, kind: "boss" },
];

const PICKUP_UNLOCKS = [
  { from: 0, kind: "flower" },
  { from: 1, kind: "prize" },
  { from: 2, kind: "ruler" },
  { from: 3, kind: "bell" },
  { from: 4, kind: "ink" },
  { from: 5, kind: "tea" },
  { from: 6, kind: "chalk" },
  { from: 7, kind: "mega" },
];

const WEAPON_LABELS = {
  chalk: "粉笔炮",
  rapid: "红花连射",
  spread: "直尺散射",
  pierce: "墨水穿甲",
  boom: "扩音炮",
};

function unlockedKinds(stage, table) {
  return table.filter((row) => stage >= row.from).map((row) => row.kind);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class Tank {
  constructor(x, y, kind, team) {
    const spec = TANK_KINDS[kind];
    const size = Math.round(44 * (spec.scale || 1));
    this.x = x;
    this.y = y;
    this.w = size;
    this.h = size;
    this.kind = kind;
    this.team = team;
    this.dir = team === "player" ? DIR.UP : DIR.DOWN;
    this.speed = spec.speed;
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.cooldown = 0;
    this.fireGap = spec.cooldown;
    this.power = team === "player" ? 1 : kind === "boss" || kind === "director" ? 2 : 1;
    this.weapon = team === "player" ? "chalk" : "chalk";
    this.pierce = 0;
    this.shield = team === "player" ? 2200 : 0;
    this.alive = true;
    this.aiTimer = 300 + Math.random() * 800;
    this.flash = 0;
  }

  center() {
    return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
  }

  bbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class Bullet {
  constructor(x, y, dir, team, power) {
    const v = DIR_VEC[dir];
    this.x = x - 3;
    this.y = y - 3;
    this.w = 6;
    this.h = 6;
    this.dir = dir;
    this.vx = v.x * (3.4 + power * 0.45);
    this.vy = v.y * (3.4 + power * 0.45);
    this.team = team;
    this.power = power;
    this.pierce = 0;
    this.alive = true;
  }
}

class Pickup {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.w = 22;
    this.h = 22;
    this.kind = kind;
    this.life = 10000;
    this.alive = true;
  }
}

class Particle {
  constructor(x, y, color) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.6 + Math.random() * 2.4;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.life = 280 + Math.random() * 280;
    this.color = color;
    this.size = 2 + Math.random() * 3;
  }
}

function drawRounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTank(ctx, tank, time) {
  const spec = TANK_KINDS[tank.kind];
  ctx.save();
  ctx.translate(tank.x + tank.w / 2, tank.y + tank.h / 2);
  ctx.rotate((tank.dir * Math.PI) / 2);

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(2, 3, tank.w * 0.42, tank.h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  const tw = tank.w;
  const th = tank.h;
  ctx.fillStyle = spec.track;
  drawRounded(ctx, -tw * 0.46, -th * 0.4, tw * 0.18, th * 0.8, 3);
  ctx.fill();
  drawRounded(ctx, tw * 0.28, -th * 0.4, tw * 0.18, th * 0.8, 3);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = -3; i <= 3; i++) {
    ctx.fillRect(-tw * 0.43, i * 5 - 1, tw * 0.12, 2);
    ctx.fillRect(tw * 0.31, i * 5 - 1, tw * 0.12, 2);
  }

  const grd = ctx.createLinearGradient(0, -th * 0.3, 0, th * 0.32);
  grd.addColorStop(0, spec.color);
  grd.addColorStop(1, spec.shade);
  ctx.fillStyle = grd;
  drawRounded(ctx, -tw * 0.3, -th * 0.32, tw * 0.6, th * 0.64, 6);
  ctx.fill();
  ctx.strokeStyle = tank.kind === "teacher" ? "#c5a24a" : "#222";
  ctx.lineWidth = tank.kind === "teacher" ? 2.4 : 2;
  ctx.stroke();

  ctx.fillStyle = spec.color;
  drawRounded(ctx, -5, -th * 0.52, 10, th * 0.28, 3);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 2, tw * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = tank.kind === "teacher" ? "#fffdf7" : spec.color;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = tank.kind === "teacher" ? "#c75b3a" : "#1b1b1b";
  ctx.font = `bold ${Math.round(tw * 0.22)}px "Songti SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.badge, 0, 3);

  if (tank.shield > 0) {
    ctx.strokeStyle = `rgba(255,230,120,${0.45 + Math.sin(time / 80) * 0.25})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, tw * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (tank.flash > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    drawRounded(ctx, -tw * 0.3, -th * 0.32, tw * 0.6, th * 0.64, 6);
    ctx.fill();
  }

  ctx.restore();
}

function drawBullet(ctx, bullet) {
  ctx.save();
  ctx.fillStyle = bullet.team === "player" ? (bullet.pierce ? "#9ad7ff" : "#fff6d2") : "#ffb4a2";
  ctx.shadowColor = bullet.team === "player" ? "#ffe08a" : "#ff6b4a";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(bullet.x + 3, bullet.y + 3, bullet.power > 1 ? 4 : 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPickup(ctx, item, time) {
  const bounce = Math.sin(time / 180) * 2;
  ctx.save();
  ctx.translate(item.x + 11, item.y + 11 + bounce);
  ctx.fillStyle = "#f4e7bf";
  drawRounded(ctx, -11, -11, 22, 22, 5);
  ctx.fill();
  ctx.strokeStyle = "#7a5b20";
  ctx.stroke();
  ctx.fillStyle = "#8a2c1a";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const mark = { flower: "花", prize: "状", bell: "铃", chalk: "粉", tea: "杯", ruler: "尺", ink: "墨", mega: "音" }[item.kind];
  ctx.fillText(mark, 0, 1);
  ctx.restore();
}
