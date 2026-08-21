# AREALIS 火星表面作业模拟器

已实现可交互的火星探险模拟器，并开 PR：https://github.com/Yangdaoye/daoye/pull/6

## 如何运行

```bash
npm install
npm run dev
```

## 操作

- **WASD**：驾驶 · **F**：采样 · **空格**：刹车 · **P**：暂停 · **1–4**：时间倍率

## 真实参数（摘要）

| 参数 | 值 |
|------|-----|
| 重力 | 3.72 m/s²（≈0.38 g） |
| 气压 | ~610 Pa |
| 太阳常数 | 586 W/m² |
| Sol | 24h 39m 35s |
| 表面剂量 | ~0.67 mSv/sol |

五个着陆区：杰泽罗、盖尔、乌托邦平原、水手谷边缘、奥林帕斯山侧翼。尘暴会降低能见度与太阳能；坡度过高可倒车脱离。

## 截图

<img alt="任务界面" src="/opt/cursor/artifacts/screenshots/sim-nav.png" />
<img alt="驾驶与遥测" src="/opt/cursor/artifacts/screenshots/sim-drive-ok.png" />
<img alt="结束任务" src="/opt/cursor/artifacts/screenshots/sim-end.png" />
