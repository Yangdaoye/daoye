/**
 * Jezero Crater site catalog — curated from public Perseverance / MRO mission data.
 * Coordinates are approximate map-frame positions for the interactive scene (±0.01°).
 * Composition values are representative published findings, not live telemetry.
 */

export type LandformType =
  | 'crater_floor'
  | 'delta'
  | 'outcrop'
  | 'sand_dune'
  | 'crater_rim'
  | 'lakebed'

export type MaterialProfile = {
  name: string
  abundancePct: number
  note: string
}

export type MarsSite = {
  id: string
  name: string
  nameZh: string
  lat: number
  lon: number
  /** Scene-local XZ in meters-ish units (-50..50) */
  position: [number, number, number]
  elevationM: number
  landform: LandformType
  landformZh: string
  mission: string
  imageCredit: string
  /** Local teaching preview bundled with the app */
  localImage: string
  /** Public NASA/JPL reference URL (may be blocked by hotlink policy) */
  imageUrl: string
  photoCaption: string
  composition: MaterialProfile[]
  scienceValue: string
  scienceValueZh: string
  scanHint: string
}

export const MISSION_META = {
  region: 'Jezero Crater',
  regionZh: '杰泽罗陨石坑',
  centerLat: 18.4447,
  centerLon: 77.4508,
  diameterKm: 49,
  elevationM: -2500,
  missions: ['Mars 2020 Perseverance', 'Ingenuity', 'MRO HiRISE/CTX'],
  disclaimerZh:
    '本平台基于公开火星探测资料进行地球端可视化与任务模拟，不宣称实时连接火星或控制火星设备。',
  disclaimerEn:
    'Earth-side visualization and mission simulation using public Mars data. Not a live link to Mars hardware.',
} as const

export const LANDFORM_LABELS: Record<LandformType, string> = {
  crater_floor: '陨石坑底 / Crater Floor',
  delta: '三角洲沉积 / Delta Deposit',
  outcrop: '岩层露头 / Rock Outcrop',
  sand_dune: '沙丘 / Sand Dune',
  crater_rim: '坑缘高地 / Crater Rim',
  lakebed: '古湖床 / Ancient Lakebed',
}

export const JEZERO_SITES: MarsSite[] = [
  {
    id: 'butler-landing',
    name: 'Octavia E. Butler Landing',
    nameZh: '奥克塔维娅·E·巴特勒着陆点',
    lat: 18.4447,
    lon: 77.4508,
    position: [0, 0.4, 8],
    elevationM: -2633,
    landform: 'crater_floor',
    landformZh: '陨石坑底平原',
    mission: 'Mars 2020 Perseverance — Landing (18 Feb 2021)',
    imageCredit: 'NASA/JPL-Caltech',
    localImage: '/images/sites/butler-landing.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA24542',
    photoCaption: 'Perseverance 任务影像参考 — 杰泽罗着陆区周边地表（NASA/JPL 公开资料）。',
    composition: [
      { name: '玄武质碎屑 / Basaltic regolith', abundancePct: 62, note: '坑底风化层主体' },
      { name: '橄榄石 / Olivine', abundancePct: 18, note: '与 Séítah 单元相关' },
      { name: '氧化铁尘 / Fe-oxide dust', abundancePct: 12, note: '全球尘埃覆盖' },
      { name: '长石 / Feldspar', abundancePct: 8, note: '火成碎屑组分' },
    ],
    scienceValue:
      'Landing ellipse reference; calibrates rover localization against MRO basemap.',
    scienceValueZh: '着陆椭圆基准点；用于与 MRO 底图对齐的定位标定。',
    scanHint: '扫描风化层，建立任务基线光谱。',
  },
  {
    id: 'seitah',
    name: 'Séítah',
    nameZh: 'Séítah（赛塔）',
    lat: 18.437,
    lon: 77.435,
    position: [-14, 0.6, -2],
    elevationM: -2645,
    landform: 'outcrop',
    landformZh: '橄榄石富集岩层',
    mission: 'Perseverance — Crater Floor Campaign',
    imageCredit: 'NASA/JPL-Caltech/ASU',
    localImage: '/images/sites/seitah.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA24764',
    photoCaption: 'Séítah 区域层状火成岩露头，含丰富橄榄石。',
    composition: [
      { name: '橄榄石 / Olivine', abundancePct: 35, note: '粗粒火成堆积' },
      { name: '辉石 / Pyroxene', abundancePct: 28, note: '岩浆分异产物' },
      { name: '碳酸盐 / Carbonate', abundancePct: 15, note: '可能与水—岩作用相关' },
      { name: '黏土矿物 / Phyllosilicates', abundancePct: 10, note: '蚀变迹象' },
      { name: '其他硅酸盐', abundancePct: 12, note: '混合基质' },
    ],
    scienceValue:
      'Igneous floor unit; key for reconstructing Jezero’s magmatic and aqueous history.',
    scienceValueZh: '坑底火成单元；重建杰泽罗岩浆与水活动历史的关键区域。',
    scanHint: '对橄榄石露头做近红外扫描，识别蚀变碳酸盐。',
  },
  {
    id: 'maaz',
    name: 'Máaz',
    nameZh: 'Máaz（玛阿兹）',
    lat: 18.45,
    lon: 77.46,
    position: [12, 0.5, 6],
    elevationM: -2620,
    landform: 'crater_floor',
    landformZh: '破碎粗糙坑底',
    mission: 'Perseverance — Crater Floor Campaign',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    localImage: '/images/sites/maaz.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA24924',
    photoCaption: 'Máaz 单元粗糙熔岩状地表与采样钻探痕迹。',
    composition: [
      { name: '玄武岩 / Basalt', abundancePct: 48, note: '熔岩流形态单元' },
      { name: '辉石 / Pyroxene', abundancePct: 22, note: '光谱主导相' },
      { name: '斜长石 / Plagioclase', abundancePct: 18, note: '结晶组分' },
      { name: '氧化铁 / Hematite-like', abundancePct: 12, note: '表面氧化涂层' },
    ],
    scienceValue:
      'Contrasts with Séítah; anchors crater-floor stratigraphy and sample suite.',
    scienceValueZh: '与 Séítah 形成对比；锚定坑底地层与样本套件。',
    scanHint: '扫描粗糙熔岩表面，比对火成与沉积光谱。',
  },
  {
    id: 'kodiak',
    name: 'Kodiak',
    nameZh: '科迪亚克残丘',
    lat: 18.48,
    lon: 77.4,
    position: [-8, 1.8, -18],
    elevationM: -2550,
    landform: 'delta',
    landformZh: '三角洲残留丘',
    mission: 'Perseverance Mastcam-Z / RIMFAX',
    imageCredit: 'NASA/JPL-Caltech/ASU/MSSS',
    localImage: '/images/sites/kodiak.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA24837',
    photoCaption: 'Kodiak 残丘显现清晰倾斜层理，证实古代三角洲沉积。',
    composition: [
      { name: '碎屑砂岩 / Clastic sandstone', abundancePct: 40, note: '河流—三角洲搬运' },
      { name: '泥岩 / Mudstone', abundancePct: 25, note: '静水沉降层' },
      { name: '黏土矿物 / Clays', abundancePct: 20, note: '水蚀变指标' },
      { name: '硫酸盐 / Sulfates', abundancePct: 15, note: '蒸发或后期蚀变' },
    ],
    scienceValue:
      'Preserved foreset bedding; strongest morphological evidence of a paleolake delta.',
    scienceValueZh: '保留前积层理；古湖三角洲最有力的地貌证据之一。',
    scanHint: '沿层理面扫描，记录粒度与黏土信号变化。',
  },
  {
    id: 'wildcat-ridge',
    name: 'Wildcat Ridge',
    nameZh: '野猫岭',
    lat: 18.5,
    lon: 77.38,
    position: [-22, 2.2, -28],
    elevationM: -2520,
    landform: 'delta',
    landformZh: '三角洲顶部岩层',
    mission: 'Perseverance — Delta Top Campaign',
    imageCredit: 'NASA/JPL-Caltech',
    localImage: '/images/sites/wildcat-ridge.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA25324',
    photoCaption: 'Wildcat Ridge 细粒沉积岩，检测到有机分子与硫酸盐相关信号。',
    composition: [
      { name: '细粒泥岩 / Fine mudstone', abundancePct: 38, note: '低能沉积环境' },
      { name: '硫酸盐 / Sulfates', abundancePct: 24, note: '与有机物伴生' },
      { name: '有机碳信号 / Organic C', abundancePct: 8, note: 'PIXL/SHERLOC 检测' },
      { name: '黏土 / Clays', abundancePct: 18, note: '保真潜力高' },
      { name: '其他矿物', abundancePct: 12, note: '混合基质' },
    ],
    scienceValue:
      'High-priority biosignature-preservation target; organic-bearing sedimentary rock.',
    scienceValueZh: '高优先级生物特征保存目标；含有机物的沉积岩采样点。',
    scanHint: '精细扫描泥岩薄层，标记有机—硫酸盐共生带。',
  },
  {
    id: 'belva',
    name: 'Belva Crater',
    nameZh: '贝尔瓦撞击坑',
    lat: 18.49,
    lon: 77.42,
    position: [6, 1.2, -22],
    elevationM: -2580,
    landform: 'crater_floor',
    landformZh: '三角洲前缘小撞击坑',
    mission: 'Perseverance Remote Sensing',
    imageCredit: 'NASA/JPL-Caltech/University of Arizona',
    localImage: '/images/sites/belva.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA24838',
    photoCaption: '三角洲前缘地层剖面影像参考（NASA/JPL 公开资料）。',
    composition: [
      { name: '层状沉积岩', abundancePct: 45, note: '坑壁剖面可见' },
      { name: '角砾 / Breccia', abundancePct: 20, note: '撞击扰动' },
      { name: '黏土矿物', abundancePct: 20, note: '水成蚀变' },
      { name: '尘埃覆盖', abundancePct: 15, note: '表面风化层' },
    ],
    scienceValue:
      'Natural cross-section through delta strata without drilling deep cores.',
    scienceValueZh: '无需深钻即可观察三角洲内部地层的天然剖面。',
    scanHint: '扫描坑壁层序，建立垂直地层柱。',
  },
  {
    id: 'sand-shadow',
    name: 'Sand Shadow Ripples',
    nameZh: '沙影波纹区',
    lat: 18.43,
    lon: 77.47,
    position: [18, 0.35, 2],
    elevationM: -2638,
    landform: 'sand_dune',
    landformZh: '风成沙波纹',
    mission: 'Perseverance NAVCAM / MEDA',
    imageCredit: 'NASA/JPL-Caltech',
    localImage: '/images/sites/sand-shadow.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA24544',
    photoCaption: '活跃风成波纹；用于研究现代大气搬运与尘埃循环。',
    composition: [
      { name: '玄武质沙 / Basaltic sand', abundancePct: 55, note: '局地风化产物' },
      { name: '全球尘埃 / Dust', abundancePct: 25, note: '高 Fe³⁺ 氧化尘' },
      { name: '橄榄石碎屑', abundancePct: 12, note: '近源搬运' },
      { name: '盐类薄膜', abundancePct: 8, note: '可能含高氯酸盐' },
    ],
    scienceValue:
      'Active aeolian laboratory; constrains present-day wind and dust cycle.',
    scienceValueZh: '现代风成过程实验室；约束当前风场与尘埃循环。',
    scanHint: '浅表扫描沙纹，区分局地沙与全球尘。',
  },
  {
    id: 'rim-overlook',
    name: 'Western Rim Overlook',
    nameZh: '西缘观景台',
    lat: 18.52,
    lon: 77.32,
    position: [-32, 4.5, -8],
    elevationM: -2300,
    landform: 'crater_rim',
    landformZh: '陨石坑西缘高地',
    mission: 'MRO CTX / HiRISE mosaic context',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    localImage: '/images/sites/rim-overlook.jpg',
    imageUrl: 'https://images.nasa.gov/details/PIA24333',
    photoCaption: '从坑缘俯瞰杰泽罗盆地与西部河道入口（背景影像合成示意）。',
    composition: [
      { name: '撞击角砾岩', abundancePct: 40, note: '坑缘构造' },
      { name: '基底火成岩', abundancePct: 30, note: '前诺阿基亚—诺阿基亚' },
      { name: '蚀变黏土', abundancePct: 18, note: '区域水蚀变' },
      { name: '尘埃/风化层', abundancePct: 12, note: '表面覆盖' },
    ],
    scienceValue:
      'Regional context for inlet valley and lake high-stand geomorphology.',
    scienceValueZh: '理解入湖河道与古湖高水位地貌的区域背景点。',
    scanHint: '远距离成像扫描，标定盆地高程基准。',
  },
]

export function siteById(id: string): MarsSite | undefined {
  return JEZERO_SITES.find((s) => s.id === id)
}
