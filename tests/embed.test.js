const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const root = path.join(__dirname, "..");
execFileSync("node", [path.join(root, "scripts/build-standalone.js")], { cwd: root });

const standalone = fs.readFileSync(path.join(root, "school-tank.html"), "utf8");
assert(standalone.includes("校园坦克大战"), "独立页应包含标题");
assert(standalone.includes("function drawTank"), "独立页应内联游戏脚本");
assert(standalone.includes("html.embed"), "独立页应是嵌入样式");
assert(!standalone.includes('src="js/game.js"'), "独立页不应再外链 js");

const widget = fs.readFileSync(path.join(root, "js/widget.js"), "utf8");
assert(widget.includes("embed.html"), "挂件应指向 embed.html");

const example = fs.readFileSync(path.join(root, "examples/other-site.html"), "utf8");
assert(example.includes("../embed.html"), "示例站应 iframe 嵌入游戏");

console.log("embed.test.js passed");
