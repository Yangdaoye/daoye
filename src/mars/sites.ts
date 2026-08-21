export type SiteId =
  | 'jezero'
  | 'gale'
  | 'utopia'
  | 'valles'
  | 'olympus'

export interface LandingSite {
  id: SiteId
  name: string
  nameEn: string
  lat: number
  lon: number
  elevationM: number
  /** Mean daytime high / nighttime low (°C) for local season proxy. */
  tempHighC: number
  tempLowC: number
  /** Baseline dust optical depth. */
  dustTau: number
  /** Mean surface pressure factor relative to 610 Pa. */
  pressureFactor: number
  /** Terrain roughness 0–1. */
  roughness: number
  /** Crater density 0–1. */
  craterDensity: number
  /** Science value / mineral diversity 0–1. */
  scienceRichness: number
  blurb: string
  hazards: string[]
  objectives: string[]
}

export const LANDING_SITES: LandingSite[] = [
  {
    id: 'jezero',
    name: '杰泽罗撞击坑',
    nameEn: 'Jezero Crater',
    lat: 18.44,
    lon: 77.45,
    elevationM: -2650,
    tempHighC: 0,
    tempLowC: -80,
    dustTau: 0.35,
    pressureFactor: 1.05,
    roughness: 0.55,
    craterDensity: 0.35,
    scienceRichness: 0.95,
    blurb:
      '古代河流三角洲与湖床沉积。毅力号着陆区，碳酸盐与黏土矿物丰富，是寻找古代宜居环境证据的首选。',
    hazards: ['松散砂丘', '陡峭三角洲崖壁', '局部高坡度'],
    objectives: ['采集三角洲沉积样本', '勘测古河岸露头', '部署气象站'],
  },
  {
    id: 'gale',
    name: '盖尔撞击坑',
    nameEn: 'Gale Crater',
    lat: -4.59,
    lon: 137.44,
    elevationM: -4500,
    tempHighC: 5,
    tempLowC: -75,
    dustTau: 0.4,
    pressureFactor: 1.12,
    roughness: 0.7,
    craterDensity: 0.25,
    scienceRichness: 0.9,
    blurb:
      '好奇号作业区。中央峰夏普山保存了数十亿年层状沉积，记录了从湿润到干燥的气候变迁。',
    hazards: ['层状崖壁', '风成砂纹', '狭窄通道'],
    objectives: ['攀登层状沉积剖面', '钻取含水矿物', '测量本地辐射剂量'],
  },
  {
    id: 'utopia',
    name: '乌托邦平原',
    nameEn: 'Utopia Planitia',
    lat: 47.0,
    lon: 117.0,
    elevationM: -5000,
    tempHighC: -15,
    tempLowC: -100,
    dustTau: 0.45,
    pressureFactor: 1.15,
    roughness: 0.25,
    craterDensity: 0.2,
    scienceRichness: 0.55,
    blurb:
      '北半球广阔低地平原，维京2号着陆区。地势平缓，适合长距离行驶与载人任务候选场研究。',
    hazards: ['季节性冰霜', '低太阳高度角', '地面冻融裂隙'],
    objectives: ['长距离越野测试', '地下冰雷达测深', '低温热控验证'],
  },
  {
    id: 'valles',
    name: '水手谷边缘',
    nameEn: 'Valles Marineris Rim',
    lat: -13.9,
    lon: -59.2,
    elevationM: 2000,
    tempHighC: -10,
    tempLowC: -90,
    dustTau: 0.5,
    pressureFactor: 0.85,
    roughness: 0.9,
    craterDensity: 0.3,
    scienceRichness: 0.8,
    blurb:
      '太阳系最大峡谷系统边缘。巨大高差与崩塌堆积揭示构造与侵蚀史，驾驶风险极高。',
    hazards: ['极端坡度', '崩积碎石', '峡谷风道阵风'],
    objectives: ['测绘峡谷壁剖面', '采集崩积岩样本', '评估高坡行驶极限'],
  },
  {
    id: 'olympus',
    name: '奥林帕斯山侧翼',
    nameEn: 'Olympus Mons Flank',
    lat: 18.65,
    lon: -133.8,
    elevationM: 12000,
    tempHighC: -30,
    tempLowC: -110,
    dustTau: 0.2,
    pressureFactor: 0.35,
    roughness: 0.45,
    craterDensity: 0.15,
    scienceRichness: 0.7,
    blurb:
      '太阳系最高火山侧翼。气压极低、日照强烈、温度极寒。适合测试高海拔太阳能与热控系统。',
    hazards: ['极低气压', '极端低温', '稀薄大气散热差'],
    objectives: ['高海拔太阳能标定', '火山岩岩性采样', '热控极限测试'],
  },
]

export function getSite(id: SiteId): LandingSite {
  const site = LANDING_SITES.find((s) => s.id === id)
  if (!site) throw new Error(`Unknown site: ${id}`)
  return site
}
