const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const js = ["audio.js", "maps.js", "entities.js", "game.js"]
  .map((name) => fs.readFileSync(path.join(root, "js", name), "utf8"))
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="zh-CN" class="embed">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>校园坦克大战</title>
    <style>
${css}
    </style>
  </head>
  <body>
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">师</span>
          <div>
            <h1>校园坦克大战</h1>
          </div>
        </div>
        <div class="hud" id="hud">
          <div class="stat"><span>关卡</span><strong id="hud-stage">1</strong></div>
          <div class="stat wide"><span>课题</span><strong id="hud-lesson">操场集合</strong></div>
          <div class="stat"><span>分数</span><strong id="hud-score">0</strong></div>
          <div class="stat"><span>最高</span><strong id="hud-best">0</strong></div>
          <div class="stat"><span>生命</span><strong id="hud-lives">3</strong></div>
          <div class="stat"><span>校铃</span><strong id="hud-bell">3</strong></div>
          <div class="stat"><span>敌军</span><strong id="hud-enemies">20</strong></div>
          <div class="stat"><span>火力</span><strong id="hud-power">I</strong></div>
        </div>
      </header>
      <main class="stage">
        <div class="play">
          <canvas id="game" width="624" height="624" aria-label="校园坦克大战画布"></canvas>
          <div class="actions">
            <button type="button" id="btn-start">开始上课</button>
            <button type="button" id="btn-pause">暂停</button>
          </div>
          <div class="touch" id="touch">
            <div class="dpad" aria-label="方向">
              <button type="button" class="pad" data-key="ArrowUp">上</button>
              <div class="dpad-mid">
                <button type="button" class="pad" data-key="ArrowLeft">左</button>
                <button type="button" class="pad" data-key="ArrowDown">下</button>
                <button type="button" class="pad" data-key="ArrowRight">右</button>
              </div>
            </div>
            <button type="button" class="fire" data-key=" ">开炮</button>
          </div>
        </div>
      </main>
    </div>
    <script>
${js}
    </script>
  </body>
</html>
`;

const out = path.join(root, "school-tank.html");
fs.writeFileSync(out, html);
console.log("wrote", out, html.length, "bytes");
