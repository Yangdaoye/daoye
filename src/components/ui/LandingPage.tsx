import { MISSION_META } from '../../data/jezero'
import { useAppUi } from '../../store/appUi'
import './LandingPage.css'

const heroImg = `${import.meta.env.BASE_URL}images/sites/seitah.jpg`

export function LandingPage() {
  const enterSim = useAppUi((s) => s.enterSim)
  const webglFailed = useAppUi((s) => s.webglFailed)

  return (
    <div className="landing">
      <div
        className="landing__bg"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(115deg, rgba(12, 8, 6, 0.55) 0%, rgba(12, 8, 6, 0.2) 42%, rgba(18, 10, 8, 0.72) 100%), url('${heroImg}'), radial-gradient(ellipse at 70% 30%, #8a4a28 0%, #1a100c 55%, #0b0705 100%)`,
        }}
      />
      <div className="landing__grain" aria-hidden />

      <main className="landing__hero">
        <p className="landing__kicker">Earth-side · Public Mars Data</p>
        <h1 className="landing__brand">
          <span>MARS</span>
          真实火星数据交互展示平台
        </h1>
        <p className="landing__lead">
          基于杰泽罗陨石坑公开探测资料的网页仿真：真实地点标注、任务影像、矿物信息，以及虚拟机械臂扫描与采样流程。
        </p>
        <p className="landing__meta">
          {MISSION_META.regionZh} · {MISSION_META.centerLat}°N, {MISSION_META.centerLon}°E · Ø
          {MISSION_META.diameterKm} km
        </p>

        <div className="landing__actions">
          <button type="button" className="landing__cta" onClick={() => enterSim('sim-3d')}>
            进入三维仿真
          </button>
          <button
            type="button"
            className="landing__cta landing__cta--ghost"
            onClick={() => enterSim('sim-map')}
          >
            进入平面地图版
          </button>
        </div>

        {webglFailed && (
          <p className="landing__warn">检测到 WebGL 不可用，已推荐使用平面地图版。</p>
        )}

        <ul className="landing__features">
          <li>公开地形与探测点资料</li>
          <li>虚拟机械臂交互模拟</li>
          <li>扫描 / 采样 / 任务日志</li>
        </ul>
      </main>

      <footer className="landing__foot">
        <p>{MISSION_META.disclaimerZh}</p>
      </footer>
    </div>
  )
}
