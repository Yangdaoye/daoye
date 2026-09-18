# Codex ChatGPT Connect

配套 Skill：让 [XiaoDuoYa/codex-with-chatgpt](https://github.com/XiaoDuoYa/codex-with-chatgpt) 的免费 Quick Tunnel **尽量一直活着**，并把「下一步该做什么」收成一份 JSON，避免 Codex 每次重问临时/固定域名或走丢重连步骤。

本仓库不 fork 上游。连接仍由已安装的 `c2c` 完成。

## 为什么有时候连不上

- 退出 Codex / 终端后，临时 `*.trycloudflare.com` 地址会失效，ChatGPT 连接器还指着旧地址。
- 新地址刚签发时 DNS 常常 `ENOTFOUND`，上游 45 秒超时就杀掉隧道。
- 默认 QUIC（UDP）在部分网络上过不去。
- 原 Skill 太长，Codex 容易重新 setup，或点了 Reconnect。

本 Skill 做三件事：默认 HTTP/2、外层多轮 `doctor`/`start --tunnel`、用户级常驻保活（健康时绝不 restart）。

Quick Tunnel 在进程死后**一定会换地址**。保活是为了少死；死了以后 ensure 会返回 `repair-connector`，按最短路径 Delete 再新建（不要点重新连接）。

## 安装

1. 先装上游（若还没有）：

```bash
git clone https://github.com/XiaoDuoYa/codex-with-chatgpt ~/codex-with-chatgpt
cd ~/codex-with-chatgpt
corepack pnpm install && corepack pnpm build
```

也可把 checkout 放到别处，然后 `export C2C_HOME=/path/to/codex-with-chatgpt`。

2. 安装本 Skill：

```bash
git clone https://github.com/Yangdaoye/daoye.git
cd daoye
node scripts/install.mjs
```

会写入 `~/.codex/skills/codex-chatgpt-connect/`，并在已安装的原 Skill 顶部加一条可重入横幅（上游日更覆盖后，再跑一次 `install.mjs` 即可）。

需要：Node.js >= 20，以及上游所需的 `cloudflared`。

## 用法

对 Codex 说：

- 「使用 Codex with ChatGPT 完成 XXX」
- 「连接 ChatGPT」
- 「再连一次」

Codex 应先跑：

```bash
node ~/.codex/skills/codex-chatgpt-connect/scripts/ensure-connected.mjs --json -w /path/to/your/project
```

`nextAction`：

| 值 | 含义 |
| --- | --- |
| `ready` | 本地已通，继续规划闭环 |
| `repair-connector` | 本地已通，要在 ChatGPT 里 Delete 后按新 `mcpUrl` 重建该连接器 |
| `failed` | 看 `error`，不要删连接器 |

首次 `ready` 后 Skill 会安装常驻（macOS launchd / Linux systemd --user / Windows 计划任务）。卸载：

```bash
node ~/.codex/skills/codex-chatgpt-connect/scripts/keepalive.mjs uninstall
```

## 本机验收

1. `ensure --json` 得到 `ready`（或按提示完成一次 `repair-connector`）。
2. **完全退出 Codex**，再跑一次 ensure：仍应是 `ready`，且 **`mcpUrl` 与上次相同**。
3. 若第二次变成 `repair-connector`，说明常驻没把隧道保住；看 `keepalive.mjs install` 的 `activated`。

## 开发

```bash
node --test scripts/test/*.test.mjs
```

## 许可

MIT。包装上游 CLI，不包含其源码。
