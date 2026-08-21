# 真实火星数据交互展示平台（网页版）

基于杰泽罗陨石坑公开探测资料的 **网页仿真平台**。

> 地球端可视化与任务模拟，不宣称实时连接火星或控制火星设备。

## 打开方式

开发预览：

```bash
npm install
npm run dev
```

浏览器访问：**http://localhost:5173/**

生产静态站：

```bash
npm run build
npm run preview
```

访问：**http://localhost:4173/**

## 页面结构

1. **首页落地页** — 品牌入口，选择进入三维或平面地图
2. **三维仿真** — Three.js 地形 + 虚拟机械臂 + HUD
3. **平面地图版** — 无需 WebGL 的 Canvas 网页交互（点击探测点、扫描、采样）

## 操作

| 输入 | 作用 |
|------|------|
| 点击地形 / 标记 / 快选 | 选定目标 |
| WASD · R/F | 移动 / 升降机械臂末端 |
| Space / 扫描 | 光谱扫描 |
| Q / 拾取样本 | 封存样本 |
| E / 归位 | 机械臂归位 |
| G | 手势拖拽开关 |

## 技术栈

Vite · React · TypeScript · Three.js · Zustand · Canvas 2D 地图
