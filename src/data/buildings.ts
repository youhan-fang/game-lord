import { BuildingId, RegionExpansion } from '../game/world/worldState';

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  category: 'agriculture' | 'commerce' | 'security' | 'civic';
  costGold: number;
  maintenanceGoldPerYear: number;
  buildMonths: number;
  anchorId: string;
  description: string;
  effectsSummary: string[];
  prerequisites: {
    minHouseholds?: number;
    minCommercialActivity?: number;
    requiredBuildings?: BuildingId[];
    minControlledLandHa?: number;
    prerequisiteText: string;
  };
}

export const BUILDING_DEFINITIONS: Record<BuildingId, BuildingDefinition> = {
  watermill: {
    id: 'watermill',
    name: '水磨坊',
    category: 'agriculture',
    costGold: 28,
    maintenanceGoldPerYear: 0.8,
    buildMonths: 6,
    anchorId: 'watermill',
    description: '依托河湾水力建造谷物磨坊，改善粮食加工效率并收取磨坊捐。',
    effectsSummary: [
      '农业技术系数 +8%，收获与加工损耗降低 2.2%',
      '每年为领主提供稳定的磨坊谷物折算收益',
      '河畔出现水轮转动的水磨坊景观',
    ],
    prerequisites: {
      minHouseholds: 12,
      prerequisiteText: '需领地达到 12 户以上且拥有河岸场地',
    },
  },
  river_bridge: {
    id: 'river_bridge',
    name: '跨河木石桥',
    category: 'commerce',
    costGold: 32,
    maintenanceGoldPerYear: 0.7,
    buildMonths: 6,
    anchorId: 'bridge',
    description: '在蜿蜒河道渡口架设坚固桥梁，连接两岸农田与外部商路。',
    effectsSummary: [
      '对外交通便利度 (Trade Access) +16',
      '提高商队到访概率与非农移民吸引力',
      '连接河东片区，改善区域通行',
    ],
    prerequisites: {
      minHouseholds: 15,
      prerequisiteText: '需领地达到 15 户以上',
    },
  },
  field_improvement: {
    id: 'field_improvement',
    name: '农田改良工程',
    category: 'agriculture',
    costGold: 35,
    maintenanceGoldPerYear: 0.6,
    buildMonths: 8,
    anchorId: 'farmland_a',
    description: '兴修排水沟渠与三圃轮作田埂，提高现有耕地的播种利用率与抗灾力。',
    effectsSummary: [
      '耕地年度有效播种比例从 66.7% 提升至 78%',
      '土地肥力系数 +10%，减轻歉收损失',
      '农田区域出现规整田垄与蓄水渠',
    ],
    prerequisites: {
      minHouseholds: 18,
      prerequisiteText: '需领地达到 18 户以上',
    },
  },
  patrol_guard: {
    id: 'patrol_guard',
    name: '领地巡逻队',
    category: 'security',
    costGold: 22,
    maintenanceGoldPerYear: 1.6,
    buildMonths: 4,
    anchorId: 'manor_house',
    description: '组建常备乡勇与林道巡逻骑手，震慑盗匪并维护商路及村庄治安。',
    effectsSummary: [
      '治安基准值 +14，大幅降低盗匪劫掠概率',
      '保障农户安心开垦荒地与商人定居',
      '增加持续年度防卫维护开支',
    ],
    prerequisites: {
      minHouseholds: 14,
      prerequisiteText: '需领地达到 14 户以上',
    },
  },
  wooden_palisade: {
    id: 'wooden_palisade',
    name: '木制防御工事',
    category: 'security',
    costGold: 42,
    maintenanceGoldPerYear: 1.2,
    buildMonths: 8,
    anchorId: 'fortification',
    description: '围绕主聚落与庄园高地修筑木栅栏、壕沟与瞭望塔。',
    effectsSummary: [
      '治安基准值 +12，显著提升居民安全感',
      '保护粮食储备与家庭财富免受盗匪重创',
      '地图主聚落外围出现木栅栏与哨塔',
    ],
    prerequisites: {
      minHouseholds: 25,
      prerequisiteText: '需领地达到 25 户以上',
    },
  },
  marketplace: {
    id: 'marketplace',
    name: '定期集市广场',
    category: 'commerce',
    costGold: 48,
    maintenanceGoldPerYear: 1.2,
    buildMonths: 8,
    anchorId: 'market',
    description: '在聚落中心开辟固定交易广场与摊位，吸引行商与手工业者聚集。',
    effectsSummary: [
      '商业便利度 +22，解锁市场摊位税与交易税',
      '大幅提升非农业家庭（工匠、商人）形成与迁入速度',
      '允许通过外部贸易进口余粮以支撑城镇人口',
    ],
    prerequisites: {
      minHouseholds: 28,
      requiredBuildings: ['river_bridge'],
      prerequisiteText: '需领地达到 28 户以上，且已建成跨河木石桥',
    },
  },
  granary_expansion: {
    id: 'granary_expansion',
    name: '领主石基大谷仓',
    category: 'agriculture',
    costGold: 55,
    maintenanceGoldPerYear: 1.0,
    buildMonths: 8,
    anchorId: 'farmland_b',
    description: '建造防潮防鼠的高架石基谷仓，降低储粮损耗并提高粮食储备上限。',
    effectsSummary: [
      '收获及储运损耗再降低 2.0%',
      '农业技术系数 +6%，饥荒抵御能力显著增强',
    ],
    prerequisites: {
      minHouseholds: 50,
      requiredBuildings: ['watermill'],
      prerequisiteText: '需领地达到 50 户以上，且已建成水磨坊',
    },
  },
  parish_church: {
    id: 'parish_church',
    name: '教区石木教堂',
    category: 'civic',
    costGold: 75,
    maintenanceGoldPerYear: 1.5,
    buildMonths: 12,
    anchorId: 'church',
    description: '修建庄严的教区教堂与钟楼，凝聚社区认同并提供基本草药救济。',
    effectsSummary: [
      '降低疫病与自然死亡率，提升社会稳定与人口自然增长',
      '领主家族威望 +18，提高移民吸引力',
      '地图高地出现标志性的中世纪教堂建筑',
    ],
    prerequisites: {
      minHouseholds: 70,
      prerequisiteText: '需领地达到 70 户以上',
    },
  },
  paved_highroad: {
    id: 'paved_highroad',
    name: '硬化王家商道',
    category: 'commerce',
    costGold: 95,
    maintenanceGoldPerYear: 2.0,
    buildMonths: 10,
    anchorId: 'outer_suburb',
    description: '用碎石与路缘石加固贯穿河谷的主干道，使重型马车四季畅通。',
    effectsSummary: [
      '对外交通便利度 +20，粮食进口运力上限大幅提升',
      '商业活动与贸易关税收益提升 25%',
      '地图主干土路升级为碎石商道，车马往来增多',
    ],
    prerequisites: {
      minHouseholds: 130,
      requiredBuildings: ['marketplace', 'river_bridge'],
      prerequisiteText: '需领地达到 130 户以上，且已建成定期集市与桥梁',
    },
  },
  artisan_quarter: {
    id: 'artisan_quarter',
    name: '工匠行会街区',
    category: 'commerce',
    costGold: 135,
    maintenanceGoldPerYear: 2.6,
    buildMonths: 12,
    anchorId: 'main_settlement',
    description: '规划铁匠、织工、木匠与皮匠聚集的专业街区与排屋。',
    effectsSummary: [
      '非农业家庭收入 +22%，商业繁荣度上限大幅提升',
      '吸引大量自由手工业者迁入，推动城镇密集化',
    ],
    prerequisites: {
      minHouseholds: 220,
      requiredBuildings: ['marketplace', 'paved_highroad'],
      prerequisiteText: '需领地达到 220 户以上，且已建成集市与硬化商道',
    },
  },
  stone_wall: {
    id: 'stone_wall',
    name: '环城石质城墙',
    category: 'security',
    costGold: 220,
    maintenanceGoldPerYear: 4.0,
    buildMonths: 18,
    anchorId: 'city_wall',
    description: '以厚重条石与城门塔楼环绕繁荣城镇，使其成为坚不可摧的区域重镇。',
    effectsSummary: [
      '治安基准值 +18，城镇免受外部袭扰',
      '领主威望 +30，极大增强富商与工匠定居信心',
      '地图城镇外围呈现宏伟的石质城墙与城门',
    ],
    prerequisites: {
      minHouseholds: 420,
      requiredBuildings: ['wooden_palisade', 'artisan_quarter'],
      prerequisiteText: '需领地达到 420 户以上，且已建成木制防御工事与工匠街区',
    },
  },
  stone_keep: {
    id: 'stone_keep',
    name: '诺曼式领主石堡',
    category: 'civic',
    costGold: 320,
    maintenanceGoldPerYear: 5.5,
    buildMonths: 20,
    anchorId: 'manor_house',
    description: '将早期木石领主宅邸扩建为巍峨的石质主堡与内廷，彰显大领主权威。',
    effectsSummary: [
      '领主自营庄园与封地特权收益 +35%',
      '治安基准值 +10，家族威望 +50',
      '地图庄园高地屹立宏伟的中世纪城堡',
    ],
    prerequisites: {
      minHouseholds: 620,
      requiredBuildings: ['stone_wall'],
      prerequisiteText: '需领地达到 620 户以上，且已建成环城石质城墙',
    },
  },
};

export const INITIAL_REGION_EXPANSIONS: RegionExpansion[] = [
  {
    id: 'east_meadows',
    name: '河东肥沃草甸与聚落',
    description: '赎买并册封河东岸的缓坡草甸与散落农庄，大幅增加可开垦耕地。',
    landHa: 200,
    arableHa: 110,
    initialFarmHouseholds: 8,
    costGold: 45,
    requiredPrestige: 15,
    requiredHouseholds: 22,
    unlocked: false,
    anchorId: 'east_village',
  },
  {
    id: 'west_hill_clearings',
    name: '西丘林间垦区与村落',
    description: '获得西侧丘陵谷地的管辖特许，接纳林间自由农并开辟西部农田。',
    landHa: 240,
    arableHa: 125,
    initialFarmHouseholds: 12,
    costGold: 85,
    requiredPrestige: 28,
    requiredHouseholds: 55,
    unlocked: false,
    anchorId: 'west_village',
  },
  {
    id: 'lower_river_wharf',
    name: '下游河湾渡口与渔农聚落',
    description: '将领地边界延伸至下游宽阔河湾，控制水路要冲与沿岸冲积沃土。',
    landHa: 260,
    arableHa: 135,
    initialFarmHouseholds: 16,
    costGold: 140,
    requiredPrestige: 45,
    requiredHouseholds: 120,
    unlocked: false,
    anchorId: 'river_hamlet',
  },
  {
    id: 'north_abbey_fief',
    name: '北境谷地封邑',
    description: '通过王室册封与赎金并入北境大片平原庄园，形成跨区域的广阔领地。',
    landHa: 320,
    arableHa: 180,
    initialFarmHouseholds: 25,
    costGold: 220,
    requiredPrestige: 70,
    requiredHouseholds: 260,
    unlocked: false,
    anchorId: 'farmland_c',
  },
  {
    id: 'royal_borough_charter',
    name: '王室自治市镇郊野特许领',
    description: '获颁大宪章式的市镇与远郊管辖权，整合整条河谷的农商腹地，迈向千户重镇。',
    landHa: 380,
    arableHa: 210,
    initialFarmHouseholds: 35,
    costGold: 340,
    requiredPrestige: 105,
    requiredHouseholds: 500,
    unlocked: false,
    anchorId: 'outer_suburb',
  },
];

