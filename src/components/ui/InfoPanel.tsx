import { JEZERO_SITES, LANDFORM_LABELS, MISSION_META, siteById } from '../../data/jezero'
import { useMissionStore } from '../../store/missionStore'

export function InfoPanel() {
  const selectedSiteId = useMissionStore((s) => s.selectedSiteId)
  const lastScan = useMissionStore((s) => s.lastScanResult)
  const scanned = useMissionStore((s) => s.scannedSiteIds)
  const samples = useMissionStore((s) => s.samples)
  const logs = useMissionStore((s) => s.logs)

  const site = siteById(selectedSiteId ?? '') ?? lastScan ?? JEZERO_SITES[0]
  const isScanned = site ? scanned.includes(site.id) : false

  return (
    <aside className="info-panel hud-panel">
      <div className="info-panel__head">
        <h2>探测资料</h2>
        <p className="eyebrow">公开科学数据 · 地球端模拟</p>
      </div>

      {site && (
        <section className="info-block">
          <h3>{site.nameZh}</h3>
          <p className="muted">{site.name}</p>
          <dl className="kv">
            <div>
              <dt>坐标</dt>
              <dd>
                {site.lat.toFixed(4)}°N, {site.lon.toFixed(4)}°E
              </dd>
            </div>
            <div>
              <dt>高程</dt>
              <dd>{site.elevationM} m (MOLA)</dd>
            </div>
            <div>
              <dt>地貌</dt>
              <dd>
                {site.landformZh}
                <br />
                <span className="muted">{LANDFORM_LABELS[site.landform]}</span>
              </dd>
            </div>
            <div>
              <dt>影像来源</dt>
              <dd>
                {site.mission}
                <br />
                <span className="muted">{site.imageCredit}</span>
              </dd>
            </div>
          </dl>
        </section>
      )}

      {site && (
        <section className="info-block">
          <h3>任务影像</h3>
          <figure className="photo-frame">
            <img src={site.localImage} alt={site.photoCaption} loading="lazy" />
            <figcaption>
              {site.photoCaption}
              <br />
              <a className="ref-link" href={site.imageUrl} target="_blank" rel="noreferrer">
                查看 NASA/JPL 原始公开影像参考
              </a>
            </figcaption>
          </figure>
        </section>
      )}

      {site && (
        <section className="info-block">
          <h3>物质检测 {isScanned ? '' : '（需扫描）'}</h3>
          {isScanned ? (
            <ul className="comp-list">
              {site.composition.map((c) => (
                <li key={c.name}>
                  <div className="comp-list__row">
                    <span>{c.name}</span>
                    <strong>{c.abundancePct}%</strong>
                  </div>
                  <div className="comp-list__bar">
                    <i style={{ width: `${c.abundancePct}%` }} />
                  </div>
                  <p className="muted">{c.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">对目标执行扫描后显示已知成分与模拟分析结果。</p>
          )}
        </section>
      )}

      {site && (
        <section className="info-block">
          <h3>科学价值</h3>
          <p>{site.scienceValueZh}</p>
          <p className="muted">{site.scienceValue}</p>
          <p className="hint">{site.scanHint}</p>
        </section>
      )}

      <section className="info-block">
        <h3>样本舱 ({samples.length})</h3>
        {samples.length === 0 ? (
          <p className="muted">尚未封存样本。扫描后按「拾取」或快捷键 Q。</p>
        ) : (
          <ul className="sample-list">
            {samples.map((s) => (
              <li key={s.id}>
                <strong>{s.siteName}</strong>
                <span>{s.material}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="info-block">
        <h3>任务日志</h3>
        <ul className="log-list">
          {logs.slice(0, 8).map((l) => (
            <li key={l.id} data-level={l.level}>
              {l.message}
            </li>
          ))}
        </ul>
      </section>

      <p className="disclaimer">{MISSION_META.disclaimerZh}</p>
    </aside>
  )
}
