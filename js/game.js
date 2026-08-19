(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hud = {
    stage: document.getElementById("hud-stage"),
    score: document.getElementById("hud-score"),
    lives: document.getElementById("hud-lives"),
    enemies: document.getElementById("hud-enemies"),
    power: document.getElementById("hud-power"),
  };

  const WORLD = MAP_SIZE * TILE;
  const PICKUP_KINDS = ["flower", "prize", "bell", "chalk", "tea"];

  const game = {
    mode: "menu",
    stage: 0,
    score: 0,
    lives: 3,
    grid: [],
    player: null,
    enemies: [],
    bullets: [],
    pickups: [],
    particles: [],
    floats: [],
    enemyLeft: 20,
    fieldCap: 4,
    spawnTimer: 0,
    freeze: 0,
    shake: 0,
    toast: "",
    toastTimer: 0,
    keys: {},
    last: 0,
    time: 0,
    baseAlive: true,
  };

  function cloneGrid(grid) {
    return grid.map((row) => row.slice());
  }

  function stageEnemyCount(stage) {
    return 16 + stage * 3;
  }

  function pickEnemyKind(stage, remaining) {
    if (stage === 4 && remaining === 1) return "boss";
    const roll = Math.random();
    if (stage === 0) return roll < 0.8 ? "rascal" : "late";
    if (stage === 1) return roll < 0.5 ? "rascal" : roll < 0.8 ? "late" : "exam";
    if (stage === 2) return roll < 0.3 ? "rascal" : roll < 0.55 ? "late" : roll < 0.8 ? "exam" : "phone";
    if (stage === 3) return roll < 0.2 ? "rascal" : roll < 0.45 ? "late" : roll < 0.7 ? "exam" : "phone";
    return roll < 0.15 ? "rascal" : roll < 0.4 ? "late" : roll < 0.7 ? "exam" : "phone";
  }

  function resetRun() {
    game.stage = 0;
    game.score = 0;
    game.lives = 3;
    startStage();
  }

  function startStage() {
    const def = STAGES[game.stage];
    game.grid = cloneGrid(def.grid);
    game.enemies = [];
    game.bullets = [];
    game.pickups = [];
    game.particles = [];
    game.floats = [];
    game.enemyLeft = stageEnemyCount(game.stage);
    game.fieldCap = 4 + (game.stage >= 3 ? 1 : 0);
    game.spawnTimer = 400;
    game.freeze = 0;
    game.baseAlive = true;
    spawnPlayer();
    game.mode = "playing";
    game.toast = def.name;
    game.toastTimer = 1800;
    GameAudio.start();
    syncHud();
  }

  function spawnPlayer() {
    const def = STAGES[game.stage];
    const power = game.player ? game.player.power : 1;
    const tank = new Tank(def.playerSpawn.x, def.playerSpawn.y, "teacher", "player");
    tank.x = clamp(tank.x, 0, WORLD - tank.w);
    tank.y = clamp(tank.y, 0, WORLD - tank.h);
    tank.power = power;
    tank.shield = 2400;
    game.player = tank;
  }

  function overlappingTiles(box) {
    const x0 = Math.max(0, Math.floor(box.x / TILE));
    const y0 = Math.max(0, Math.floor(box.y / TILE));
    const x1 = Math.min(MAP_SIZE - 1, Math.floor((box.x + box.w - 0.01) / TILE));
    const y1 = Math.min(MAP_SIZE - 1, Math.floor((box.y + box.h - 0.01) / TILE));
    const out = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) out.push({ x, y, t: game.grid[y][x] });
    }
    return out;
  }

  function tankBlocked(box, ignore) {
    if (box.x < 0 || box.y < 0 || box.x + box.w > WORLD || box.y + box.h > WORLD) return true;
    for (const cell of overlappingTiles(box)) {
      if (
        cell.t === TILE_BRICK ||
        cell.t === TILE_STEEL ||
        cell.t === TILE_WATER ||
        cell.t === TILE_BASE ||
        cell.t === TILE_BASE_DEAD
      ) {
        return true;
      }
    }
    const bodies = [game.player, ...game.enemies].filter((t) => t && t.alive && t !== ignore);
    return bodies.some((t) => rectsOverlap(box, t.bbox()));
  }

  function tryMove(tank, dx, dy) {
    if (dx !== 0) tank.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
    if (dy !== 0) tank.dir = dy > 0 ? DIR.DOWN : DIR.UP;
    const next = { x: tank.x + dx, y: tank.y + dy, w: tank.w, h: tank.h };
    if (!tankBlocked(next, tank)) {
      tank.x = next.x;
      tank.y = next.y;
      return true;
    }
    if (dx !== 0) {
      const slide = { x: tank.x + dx, y: tank.y, w: tank.w, h: tank.h };
      if (!tankBlocked(slide, tank)) {
        tank.x = slide.x;
        return true;
      }
    }
    if (dy !== 0) {
      const slide = { x: tank.x, y: tank.y + dy, w: tank.w, h: tank.h };
      if (!tankBlocked(slide, tank)) {
        tank.y = slide.y;
        return true;
      }
    }
    return false;
  }

  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) game.particles.push(new Particle(x, y, color));
    game.shake = Math.max(game.shake, 220);
  }

  function floatText(x, y, text) {
    game.floats.push({ x, y, text, life: 800 });
  }

  function playerBulletCount() {
    return game.bullets.filter((b) => b.team === "player" && b.alive).length;
  }

  function fire(tank) {
    if (!tank.alive || tank.cooldown > 0) return;
    const cap = tank.team === "player" ? (tank.power >= 2 ? 3 : 2) : 1;
    const current = game.bullets.filter((b) => b.team === tank.team && b.alive).length;
    if (tank.team === "player" && playerBulletCount() >= cap) return;
    if (tank.team === "enemy" && current >= game.enemies.length) return;
    const c = tank.center();
    const v = DIR_VEC[tank.dir];
    const bullet = new Bullet(c.x + v.x * (tank.h * 0.42), c.y + v.y * (tank.h * 0.42), tank.dir, tank.team, tank.power);
    game.bullets.push(bullet);
    tank.cooldown = tank.fireGap / (tank.team === "player" ? Math.max(1, 0.75 + tank.power * 0.15) : 1);
    if (tank.team === "player") GameAudio.shoot();
  }

  function destroyBase() {
    if (!game.baseAlive) return;
    game.baseAlive = false;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (game.grid[y][x] === TILE_BASE) game.grid[y][x] = TILE_BASE_DEAD;
      }
    }
    burst(WORLD / 2, WORLD - 48, "#c75b3a", 28);
    GameAudio.explode();
    game.mode = "over";
    game.toast = "讲台被毁，校园失守";
    game.toastTimer = 2400;
  }

  function damageTile(x, y, power) {
    const t = game.grid[y][x];
    if (t === TILE_BRICK) {
      game.grid[y][x] = TILE_EMPTY;
      burst(x * TILE + 12, y * TILE + 12, "#d27a48", 7);
      return true;
    }
    if (t === TILE_STEEL && power >= 3) {
      game.grid[y][x] = TILE_EMPTY;
      burst(x * TILE + 12, y * TILE + 12, "#b8c0c8", 7);
      return true;
    }
    if (t === TILE_BASE) {
      destroyBase();
      return true;
    }
    if (t === TILE_STEEL || t === TILE_BASE_DEAD) return true;
    return false;
  }

  function spawnPickup(x, y) {
    if (Math.random() > 0.26) return;
    const kind = PICKUP_KINDS[Math.floor(Math.random() * PICKUP_KINDS.length)];
    game.pickups.push(new Pickup(x - 11, y - 11, kind));
  }

  function applyPickup(kind) {
    const p = game.player;
    if (kind === "flower") {
      p.power = Math.min(3, p.power + 1);
      game.toast = p.power >= 3 ? "红花开满，钢墙也可击穿" : "红花：火力升级";
    } else if (kind === "prize") {
      p.shield = 6000;
      game.toast = "奖状护体，暂时无敌";
    } else if (kind === "bell") {
      game.freeze = 5000;
      game.toast = "下课铃响，敌军冻结";
    } else if (kind === "chalk") {
      game.enemies.forEach((e) => {
        e.alive = false;
        game.score += TANK_KINDS[e.kind].score;
        burst(e.center().x, e.center().y, TANK_KINDS[e.kind].color, 16);
      });
      game.enemies = [];
      game.toast = "粉笔盒：一黑板擦干净";
    } else if (kind === "tea") {
      game.lives += 1;
      game.toast = "保温杯：额外生命";
    }
    game.toastTimer = 1600;
    GameAudio.pickup();
    syncHud();
  }

  function killEnemy(enemy) {
    enemy.alive = false;
    game.score += TANK_KINDS[enemy.kind].score;
    const c = enemy.center();
    burst(c.x, c.y, TANK_KINDS[enemy.kind].color, 18);
    floatText(c.x, c.y, `+${TANK_KINDS[enemy.kind].score}`);
    spawnPickup(c.x, c.y);
    GameAudio.explode();
    game.enemies = game.enemies.filter((e) => e.alive);
    if (game.enemyLeft <= 0 && game.enemies.length === 0) {
      if (game.stage >= STAGES.length - 1) {
        game.mode = "win";
        game.toast = "圆满下课，校园安宁";
        GameAudio.win();
      } else {
        game.mode = "clear";
        game.toast = "本课结束，准备下一堂";
        GameAudio.win();
      }
      game.toastTimer = 2000;
    }
    syncHud();
  }

  function hurtPlayer() {
    const p = game.player;
    if (!p || !p.alive || p.shield > 0) return;
    burst(p.center().x, p.center().y, "#f6f3ea", 18);
    GameAudio.explode();
    game.lives -= 1;
    if (game.lives <= 0) {
      p.alive = false;
      game.mode = "over";
      game.toast = "老师坦克被打回办公室";
      game.toastTimer = 2400;
      GameAudio.lose();
    } else {
      spawnPlayer();
      game.toast = "再上一遍这课";
      game.toastTimer = 1200;
    }
    syncHud();
  }

  function spawnEnemy() {
    if (game.enemyLeft <= 0 || game.enemies.length >= game.fieldCap) return;
    const spots = STAGES[game.stage].enemySpawns;
    const order = spots.slice().sort(() => Math.random() - 0.5);
    for (const spot of order) {
      const kind = pickEnemyKind(game.stage, game.enemyLeft);
      const tank = new Tank(spot.x, spot.y, kind, "enemy");
      tank.x = clamp(tank.x, 0, WORLD - tank.w);
      tank.y = clamp(tank.y, 0, WORLD - tank.h);
      if (!tankBlocked(tank.bbox(), tank)) {
        game.enemies.push(tank);
        game.enemyLeft -= 1;
        game.spawnTimer = 1800 - game.stage * 120;
        syncHud();
        return;
      }
    }
    game.spawnTimer = 400;
  }

  function alignedShot(enemy) {
    if (!game.player || !game.player.alive) return false;
    const a = enemy.center();
    const b = game.player.center();
    const near = 16;
    if (Math.abs(a.x - b.x) <= near) {
      enemy.dir = b.y > a.y ? DIR.DOWN : DIR.UP;
      return clearLine(a, b, true);
    }
    if (Math.abs(a.y - b.y) <= near) {
      enemy.dir = b.x > a.x ? DIR.RIGHT : DIR.LEFT;
      return clearLine(a, b, false);
    }
    return false;
  }

  function clearLine(a, b, vertical) {
    const minX = Math.floor(Math.min(a.x, b.x) / TILE);
    const maxX = Math.floor(Math.max(a.x, b.x) / TILE);
    const minY = Math.floor(Math.min(a.y, b.y) / TILE);
    const maxY = Math.floor(Math.max(a.y, b.y) / TILE);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = game.grid[y]?.[x];
        if (t === TILE_BRICK || t === TILE_STEEL || t === TILE_BASE) return false;
      }
    }
    return true;
  }

  function updateEnemy(enemy, dt) {
    enemy.cooldown -= dt;
    enemy.flash = Math.max(0, enemy.flash - dt);
    if (game.freeze > 0) return;
    enemy.aiTimer -= dt;
    if (alignedShot(enemy) && enemy.cooldown <= 0) fire(enemy);
    if (enemy.aiTimer <= 0) {
      if (game.player && Math.random() < 0.45) {
        const p = game.player.center();
        const c = enemy.center();
        enemy.dir = Math.abs(p.x - c.x) > Math.abs(p.y - c.y)
          ? (p.x > c.x ? DIR.RIGHT : DIR.LEFT)
          : (p.y > c.y ? DIR.DOWN : DIR.UP);
      } else {
        enemy.dir = Math.floor(Math.random() * 4);
      }
      enemy.aiTimer = 380 + Math.random() * 900;
    }
    const v = DIR_VEC[enemy.dir];
    const moved = tryMove(enemy, v.x * enemy.speed, v.y * enemy.speed);
    if (!moved) enemy.aiTimer = 0;
    if (enemy.cooldown <= 0 && Math.random() < 0.012 + game.stage * 0.003) fire(enemy);
  }

  function updateBullets() {
    for (const bullet of game.bullets) {
      if (!bullet.alive) continue;
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      if (bullet.x < -8 || bullet.y < -8 || bullet.x > WORLD + 8 || bullet.y > WORLD + 8) {
        bullet.alive = false;
        continue;
      }
      let blocked = false;
      for (const cell of overlappingTiles(bullet)) {
        if (damageTile(cell.x, cell.y, bullet.power)) {
          blocked = true;
          if (cell.t === TILE_BRICK || (cell.t === TILE_STEEL && bullet.power >= 3)) GameAudio.hit();
        }
      }
      if (blocked) {
        bullet.alive = false;
        continue;
      }

      if (bullet.team === "player") {
        for (const enemy of game.enemies) {
          if (enemy.alive && rectsOverlap(bullet, enemy.bbox())) {
            bullet.alive = false;
            enemy.hp -= 1;
            enemy.flash = 120;
            GameAudio.hit();
            if (enemy.hp <= 0) killEnemy(enemy);
            break;
          }
        }
      } else if (game.player && game.player.alive && rectsOverlap(bullet, game.player.bbox())) {
        bullet.alive = false;
        hurtPlayer();
      }
    }

    for (let i = 0; i < game.bullets.length; i++) {
      for (let j = i + 1; j < game.bullets.length; j++) {
        const a = game.bullets[i];
        const b = game.bullets[j];
        if (a.alive && b.alive && a.team !== b.team && rectsOverlap(a, b)) {
          a.alive = false;
          b.alive = false;
        }
      }
    }
    game.bullets = game.bullets.filter((b) => b.alive);
  }

  function updatePlayer(dt) {
    const p = game.player;
    if (!p || !p.alive) return;
    p.cooldown -= dt;
    p.shield = Math.max(0, p.shield - dt);
    p.flash = Math.max(0, p.flash - dt);
    let dx = 0;
    let dy = 0;
    if (game.keys.ArrowUp || game.keys.w || game.keys.W) dy = -1;
    else if (game.keys.ArrowDown || game.keys.s || game.keys.S) dy = 1;
    else if (game.keys.ArrowLeft || game.keys.a || game.keys.A) dx = -1;
    else if (game.keys.ArrowRight || game.keys.d || game.keys.D) dx = 1;
    if (dx || dy) tryMove(p, dx * p.speed, dy * p.speed);
    if (game.keys[" "] || game.keys.j || game.keys.J) fire(p);

    for (const item of game.pickups) {
      if (item.alive && rectsOverlap(p.bbox(), item)) {
        item.alive = false;
        applyPickup(item.kind);
      }
    }
  }

  function update(dt) {
    game.time += dt;
    game.shake = Math.max(0, game.shake - dt);
    game.toastTimer = Math.max(0, game.toastTimer - dt);
    game.freeze = Math.max(0, game.freeze - dt);
    game.pickups.forEach((p) => {
      p.life -= dt;
      if (p.life <= 0) p.alive = false;
    });
    game.pickups = game.pickups.filter((p) => p.alive);
    game.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
    });
    game.particles = game.particles.filter((p) => p.life > 0);
    game.floats.forEach((f) => {
      f.y -= 0.03 * dt;
      f.life -= dt;
    });
    game.floats = game.floats.filter((f) => f.life > 0);

    if (game.mode !== "playing") return;
    updatePlayer(dt);
    game.enemies.forEach((e) => updateEnemy(e, dt));
    updateBullets();
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) spawnEnemy();
  }

  function drawGround() {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#5f8a46" : "#567e40";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  function drawBrick(x, y) {
    ctx.fillStyle = "#b85a32";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#d27a48";
    ctx.fillRect(x + 1, y + 1, TILE - 2, 10);
    ctx.fillRect(x + 1, y + 13, 10, 10);
    ctx.fillRect(x + 13, y + 13, 10, 10);
    ctx.strokeStyle = "#7a351c";
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }

  function drawSteel(x, y) {
    ctx.fillStyle = "#8d97a3";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#c5ccd3";
    ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    ctx.fillStyle = "#5d656e";
    [[5, 5], [TILE - 8, 5], [5, TILE - 8], [TILE - 8, TILE - 8]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(x + px, y + py, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawWater(x, y) {
    ctx.fillStyle = "#2f6f93";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = "rgba(190,230,255,0.45)";
    ctx.beginPath();
    ctx.moveTo(x, y + 8 + Math.sin(game.time / 180 + x) * 2);
    ctx.lineTo(x + TILE, y + 10 + Math.sin(game.time / 160 + y) * 2);
    ctx.moveTo(x, y + 16 + Math.cos(game.time / 200 + y) * 2);
    ctx.lineTo(x + TILE, y + 14 + Math.cos(game.time / 190 + x) * 2);
    ctx.stroke();
  }

  function drawGrass(x, y) {
    ctx.fillStyle = "rgba(46, 122, 52, 0.82)";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "rgba(164, 214, 96, 0.8)";
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x + 3 + (i * 3) % 18, y + 4 + ((i * 7) % 16), 2, 7);
    }
  }

  function drawBase(x, y, dead) {
    ctx.fillStyle = dead ? "#3b2a24" : "#f3efe4";
    ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 6);
    ctx.fillStyle = dead ? "#5a2a22" : "#c75b3a";
    ctx.fillRect(x + 4, y + 2, TILE - 8, 8);
    ctx.fillStyle = dead ? "#777" : "#e4c36b";
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.font = "bold 10px serif";
    ctx.textAlign = "center";
    ctx.fillText(dead ? "破" : "铃", x + TILE / 2, y + TILE - 5);
  }

  function drawTiles(layer) {
    if (!game.grid[0]) return;
    for (let y = 0; y < MAP_SIZE; y++) {
      const row = game.grid[y];
      if (!row) continue;
      for (let x = 0; x < MAP_SIZE; x++) {
        const t = row[x];
        const px = x * TILE;
        const py = y * TILE;
        if (layer === "base") {
          if (t === TILE_BRICK) drawBrick(px, py);
          else if (t === TILE_STEEL) drawSteel(px, py);
          else if (t === TILE_WATER) drawWater(px, py);
          else if (t === TILE_BASE) drawBase(px, py, false);
          else if (t === TILE_BASE_DEAD) drawBase(px, py, true);
        } else if (t === TILE_GRASS) {
          drawGrass(px, py);
        }
      }
    }
  }

  function drawOverlayScreen(title, lines) {
    ctx.fillStyle = "rgba(12, 18, 14, 0.72)";
    ctx.fillRect(0, 0, WORLD, WORLD);
    ctx.fillStyle = "#f6f3ea";
    ctx.textAlign = "center";
    ctx.font = "bold 42px 'Songti SC', serif";
    ctx.fillText(title, WORLD / 2, 250);
    ctx.font = "18px 'Songti SC', serif";
    ctx.fillStyle = "#d7e3d4";
    lines.forEach((line, i) => ctx.fillText(line, WORLD / 2, 300 + i * 28));
  }

  function draw() {
    ctx.save();
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    }
    drawGround();
    drawTiles("base");
    game.pickups.forEach((p) => drawPickup(ctx, p, game.time));
    if (game.player && game.player.alive) drawTank(ctx, game.player, game.time);
    game.enemies.forEach((e) => drawTank(ctx, e, game.time));
    game.bullets.forEach((b) => drawBullet(ctx, b));
    drawTiles("grass");
    game.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 400);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    });
    game.floats.forEach((f) => {
      ctx.globalAlpha = Math.max(0, f.life / 800);
      ctx.fillStyle = "#fff4c4";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });

    if (game.toastTimer > 0 && game.mode === "playing") {
      ctx.fillStyle = "rgba(20, 28, 22, 0.55)";
      ctx.fillRect(WORLD / 2 - 180, 16, 360, 36);
      ctx.fillStyle = "#e4c36b";
      ctx.font = "bold 18px 'Songti SC', serif";
      ctx.textAlign = "center";
      ctx.fillText(game.toast, WORLD / 2, 40);
    }

    if (game.mode === "menu") {
      drawOverlayScreen("校园坦克大战", [
        "白色坦克 = 老师本人",
        "俯视校园，保卫讲台与校铃",
        "按 Enter 或空格开始上课",
      ]);
      ctx.save();
      ctx.translate(WORLD / 2, 160);
      const demo = new Tank(-22, -22, "teacher", "player");
      demo.dir = DIR.UP;
      drawTank(ctx, demo, game.time);
      ctx.restore();
    } else if (game.mode === "paused") {
      drawOverlayScreen("课间休息", ["按 P 或 Enter 继续"]);
    } else if (game.mode === "clear") {
      drawOverlayScreen("本课完成", [`得分 ${game.score}`, "按 Enter 进入下一课"]);
    } else if (game.mode === "over") {
      drawOverlayScreen("下课了", [game.toast || "校园需要再守一轮", `得分 ${game.score}`, "按 Enter 重新开课"]);
    } else if (game.mode === "win") {
      drawOverlayScreen("圆满下课", ["白色老师坦克守住了学校", `总分 ${game.score}`, "按 Enter 再教一届"]);
    }
    ctx.restore();
  }

  function syncHud() {
    hud.stage.textContent = String(game.stage + 1);
    hud.score.textContent = String(game.score);
    hud.lives.textContent = String(Math.max(0, game.lives));
    hud.enemies.textContent = String(game.enemyLeft + game.enemies.length);
    hud.power.textContent = "I".repeat(game.player ? game.player.power : 1);
  }

  function loop(ts) {
    const dt = game.last ? Math.min(34, ts - game.last) : 16;
    game.last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function beginFromMenu() {
    GameAudio.unlock();
    if (game.mode === "menu" || game.mode === "over" || game.mode === "win") resetRun();
    else if (game.mode === "clear") {
      game.stage += 1;
      startStage();
    } else if (game.mode === "paused") game.mode = "playing";
  }

  window.addEventListener("keydown", (e) => {
    game.keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key === "Enter") beginFromMenu();
    if (e.key === " " && game.mode === "menu") beginFromMenu();
    if ((e.key === "p" || e.key === "P") && game.mode === "playing") game.mode = "paused";
    else if ((e.key === "p" || e.key === "P") && game.mode === "paused") game.mode = "playing";
  });
  window.addEventListener("keyup", (e) => {
    game.keys[e.key] = false;
  });
  canvas.addEventListener("click", () => {
    if (game.mode !== "playing") beginFromMenu();
  });

  function showMenuPreview() {
    game.grid = cloneGrid(STAGES[0].grid);
    const def = STAGES[0];
    const tank = new Tank(def.playerSpawn.x, def.playerSpawn.y, "teacher", "player");
    tank.x = clamp(tank.x, 0, WORLD - tank.w);
    tank.y = clamp(tank.y, 0, WORLD - tank.h);
    game.player = tank;
  }

  showMenuPreview();
  syncHud();
  requestAnimationFrame(loop);
})();
