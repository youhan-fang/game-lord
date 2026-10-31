import { BudgetLevel, LandPolicy, RentPolicy, TradePolicy } from '../game/world/worldState';

export interface PolicyOptionMeta<T extends string> {
  value: T;
  name: string;
  subtitle: string;
  pros: string[];
  cons: string[];
}

export const RENT_POLICY_OPTIONS: PolicyOptionMeta<RentPolicy>[] = [
  {
    value: 'low',
    name: '低地租（轻徭薄赋）',
    subtitle: '每户年基准地租 0.38 金，非农税率 8%',
    pros: [
      '农户与工匠留存更多私人积蓄，加速购买农具、开垦荒地与建房',
      '领地对外来移民吸引力提升 28%',
    ],
    cons: [
      '领主金库短期地租与税赋收入显著减少',
    ],
  },
  {
    value: 'normal',
    name: '正常地租（传统惯例）',
    subtitle: '每户年基准地租 0.60 金，非农税率 13%',
    pros: [
      '领主财政收入与居民财富积累保持平衡',
      '社会稳定，无额外民怨负担',
    ],
    cons: [
      '无特殊激励效果',
    ],
  },
  {
    value: 'high',
    name: '高地租（严苛征敛）',
    subtitle: '每户年基准地租 0.88 金，非农税率 20%',
    pros: [
      '短期内大幅提高领主金库岁入，便于快速筹措工程资金',
    ],
    cons: [
      '居民私人积蓄减少，自主开垦与新家庭建房速度下降 32%',
      '外来移民意愿降低，歉收年份更容易引发居民外流',
    ],
  },
];

export const LAND_POLICY_OPTIONS: PolicyOptionMeta<LandPolicy>[] = [
  {
    value: 'encourage_reclamation',
    name: '鼓励开垦（垦荒免赋令）',
    subtitle: '对新辟荒地给予初期租赋减免',
    pros: [
      '农民自主开垦潜在耕地的速度提升 55%',
      '吸引渴望土地的自耕农迁入领地',
    ],
    cons: [
      '地租折算率短期下降 14%，林地与牧场资源收入减少',
    ],
  },
  {
    value: 'maintain',
    name: '维持现状（常规垦殖）',
    subtitle: '按庄园传统节奏自然开垦',
    pros: [
      '农业开垦与林牧产出维持均衡',
    ],
    cons: [
      '土地扩张速度中规中矩',
    ],
  },
  {
    value: 'protect_woodland',
    name: '保护林地（王室林苑法）',
    subtitle: '限制毁林开荒，经营林木、养猪与草场',
    pros: [
      '未开垦林地与草场每年为领主提供可观的林牧特许收入',
      '减缓水土流失，长期保持耕地肥力稳定',
    ],
    cons: [
      '农民自主开垦耕地速度降低 62%，限制纯农业人口上限',
    ],
  },
];

export const TRADE_POLICY_OPTIONS: PolicyOptionMeta<TradePolicy>[] = [
  {
    value: 'free_trade',
    name: '鼓励自由贸易（减免通行税）',
    subtitle: '降低集市摊位费与过境商队税率',
    pros: [
      '贸易吸引力提升 32%，商人与手工业者迁入速度提升 35%',
      '加速商业繁荣度增长，扩大外部粮食进口能力',
    ],
    cons: [
      '单位交易额的关税与市场收费比例降低 32%',
    ],
  },
  {
    value: 'normal',
    name: '正常贸易（标准商税）',
    subtitle: '执行常规集市与过境收费标准',
    pros: [
      '兼顾市场繁荣与领主商业税收',
    ],
    cons: [
      '无额外贸易加成或惩罚',
    ],
  },
  {
    value: 'high_tariffs',
    name: '提高市场收费（重征商税）',
    subtitle: '提高集市摊位费、过桥费与商队抽成',
    pros: [
      '在已有繁荣市场时，单笔贸易税收提高 42%',
    ],
    cons: [
      '商业吸引力下降 26%，抑制新商人定居与贸易总量扩张',
    ],
  },
];

export const SECURITY_BUDGET_OPTIONS: PolicyOptionMeta<BudgetLevel>[] = [
  {
    value: 'low',
    name: '低投入（缩减戍卫）',
    subtitle: '防卫预算为基准的 60%',
    pros: ['每年节省 40% 防卫开支'],
    cons: ['治安目标值下降 12 点，盗匪袭扰风险上升'],
  },
  {
    value: 'normal',
    name: '正常投入（常规巡防）',
    subtitle: '防卫预算为基准的 100%',
    pros: ['维持标准领地治安与商路安全'],
    cons: ['常规防卫支出'],
  },
  {
    value: 'high',
    name: '高投入（强化治安）',
    subtitle: '防卫预算为基准的 155%',
    pros: ['治安目标值提升 14 点，显著促进商业与移民'],
    cons: ['每年防卫开支增加 55%'],
  },
];

export const MAINTENANCE_BUDGET_OPTIONS: PolicyOptionMeta<BudgetLevel>[] = [
  {
    value: 'low',
    name: '低投入（延期修缮）',
    subtitle: '设施维护费为基准的 60%',
    pros: ['节省 40% 公共设施维护开支'],
    cons: ['磨坊、道路、市场等公共设施实际效能降至 78%'],
  },
  {
    value: 'normal',
    name: '正常投入（定期养护）',
    subtitle: '设施维护费为基准的 100%',
    pros: ['所有公共设施保持 100% 正常效能'],
    cons: ['标准维护支出'],
  },
  {
    value: 'high',
    name: '高投入（精工修缮）',
    subtitle: '设施维护费为基准的 145%',
    pros: ['公共设施效能提升至 118%，改善聚落卫生与声望'],
    cons: ['维护开支增加 45%'],
  },
];

