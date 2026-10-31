import { BUILDING_DEFINITIONS, INITIAL_REGION_EXPANSIONS } from '../../data/buildings';
import { DEFAULT_FAMILY_NAME, LORD_TRAITS } from '../../data/events';
import { INITIAL_MAP_ANCHORS } from '../../data/mapAnchors';
import { hasBuilding } from '../simulation/agriculture';
import { SIMULATION_PARAMETERS } from '../simulation/parameters';
import { updateWorldVisualState } from './visualRules';
import { BuildingId, BuildingState, GameState } from './worldState';

export function createInitialGameState(
  seed: number = 9000900,
  familyName: string = DEFAULT_FAMILY_NAME
): GameState {
  const init = SIMULATION_PARAMETERS.initial;
  const allBuildingIds = Object.keys(BUILDING_DEFINITIONS) as BuildingId[];

  const buildings: BuildingState[] = allBuildingIds.map((id) => ({
    id,
    built: false,
    underConstruction: false,
    progressMonths: 0,
    totalMonths: BUILDING_DEFINITIONS[id].buildMonths,
    anchorId: BUILDING_DEFINITIONS[id].anchorId,
  }));

  const state: GameState = {
    version: 1,
    randomSeed: seed,
    gameDate: {
      year: init.year,
      month: init.month,
      totalMonths: 0,
    },
    time: {
      lastRealTimestamp: Date.now(),
      isPaused: false,
      speedMultiplier: 1,
      fractionalMonths: 0,
    },
    population: {
      totalPopulation: init.population,
      totalHouseholds: init.farmHouseholds + init.nonFarmHouseholds,
      farmHouseholds: init.farmHouseholds,
      farmPopulation: init.population,
      nonFarmHouseholds: init.nonFarmHouseholds,
      nonFarmPopulation: 0,
      farmHouseholdSavings: init.farmHouseholdSavings,
      nonFarmHouseholdSavings: init.nonFarmHouseholdSavings,
      housingCapacity: init.housingCapacity,
      annualBirths: 2,
      annualDeaths: 1,
      annualImmigrants: 0,
      annualEmigrants: 0,
      newHouseholdsFormed: 0,
      history10Years: [
        {
          year: init.year,
          households: 10,
          population: 50,
          births: 2,
          deaths: 1,
          immigrants: 0,
          emigrants: 0,
          newHouseholds: 0,
          foodSurplusTons: 4.3,
          commercialProsperity: init.commercialProsperity,
          treasuryBalance: 1.8,
        },
      ],
    },
    agriculture: {
      controlledLandHa: init.controlledLandHa,
      arablePotentialHa: init.arablePotentialHa,
      cultivatedLandHa: init.cultivatedLandHa,
      sownAreaHa: init.sownAreaHa,
      fertility: 1.0,
      weatherFactor: 1.0,
      weatherType: 'normal',
      techFactor: 1.0,
      toolsLevel: 1.0,
      foodStockTons: init.foodStockTons,
      lastGrossYieldTons: 24.0,
      lastSeedTons: 5.3,
      lastLossTons: 1.9,
      lastNetYieldTons: 16.8,
      lastAnnualConsumptionTons: 12.5,
      lastFoodImportedTons: 0,
      lastFoodExportedTons: 0,
      reclaimedThisYearHa: 0,
    },
    economy: {
      security: init.security,
      commercialProsperity: init.commercialProsperity,
      commercialActivity: 5,
      tradeAccess: SIMULATION_PARAMETERS.commerce.baseTradeAccess,
      foodImportCapacityTons: 0,
      workshopsCount: 0,
      merchantsCount: 0,
      prestige: 10,
      grantedMarketCharter: false,
      grantedGuildCharter: false,
    },
    finance: {
      treasury: init.treasuryGold,
      annualIncome: 9.5,
      annualExpense: 7.7,
      annualBalance: 1.8,
      incomeBreakdown: {
        rentIncome: 6.0,
        demesneIncome: 3.5,
        millIncome: 0,
        marketFees: 0,
        tradeTariffs: 0,
        forestryAndSpecial: 0,
      },
      expenseBreakdown: {
        familyUpkeep: 4.0,
        adminCost: 1.5,
        defenseCost: 2.0,
        maintenanceCost: 0.2,
        constructionCostThisYear: 0,
      },
      consecutiveDeficitYears: 0,
    },
    policies: {
      rentPolicy: 'normal',
      landPolicy: 'maintain',
      tradePolicy: 'normal',
      securityBudget: 'normal',
      maintenanceBudget: 'normal',
    },
    buildings,
    regions: INITIAL_REGION_EXPANSIONS.map((r) => ({ ...r })),
    pendingDecisions: [],
    map: {
      stage: 'manor',
      anchors: INITIAL_MAP_ANCHORS.map((a) => ({ ...a })),
    },
    dynasty: {
      familyName,
      generation: 1,
      currentLord: {
        name: '艾德温 (Edwin)',
        age: 28,
        trait: LORD_TRAITS.benevolent,
        yearsRuled: 0,
      },
      heir: {
        name: '埃塞尔斯坦 (Athelstan)',
        age: 6,
        trait: LORD_TRAITS.pioneer,
        relation: '长子',
      },
      pastLords: [],
    },
    events: [
      {
        id: 'evt_init_900',
        year: 900,
        month: 1,
        title: '艾什福德河谷庄园肇始',
        description:
          '公元900年春，你的家族受封这片拥有10户佃农、250公顷河谷林地的宁静庄园，开启世代治理之路。',
        category: 'milestone',
        important: true,
      },
    ],
    milestone1000Reached: false,
    milestone1000Year: null,
  };

  state.map = updateWorldVisualState(state);
  return state;
}

export interface DiagnosticExplanation {
  title: string;
  headline: string;
  summary10Years: string;
  positiveFactors: string[];
  limitingFactors: string[];
  advice: string;
}

/**
 * Generates local rule-based causal explanations for key indicators (Section 10.6).
 */
export function generateDevelopmentExplanation(
  state: GameState,
  metric: 'population' | 'food' | 'commerce' | 'finance'
): DiagnosticExplanation {
  const hist = state.population.history10Years;
  const oldest = hist[0] ?? {
    households: state.population.totalHouseholds,
    population: state.population.totalPopulation,
  };
  const householdsDelta10Y = state.population.totalHouseholds - oldest.households;
  const popDelta10Y = state.population.totalPopulation - oldest.population;

  if (metric === 'population') {
    const positiveFactors: string[] = [];
    const limitingFactors: string[] = [];

    const freeArableHa =
      state.agriculture.arablePotentialHa - state.agriculture.cultivatedLandHa;
    const avgSavings =
      state.population.totalHouseholds > 0
        ? (state.population.farmHouseholdSavings + state.population.nonFarmHouseholdSavings) /
          state.population.totalHouseholds
        : 0;

    if (state.agriculture.foodStockTons >= state.agriculture.lastAnnualConsumptionTons * 0.6) {
      positiveFactors.push('粮食储备充裕，保障了较高的自然出生率与成活率');
    } else {
      limitingFactors.push('粮食储备偏低，抑制了人口自然繁衍与外来移民定居');
    }

    if (freeArableHa >= 18) {
      positiveFactors.push(`仍有 ${freeArableHa.toFixed(0)} 公顷潜在可垦荒地，吸引外地佃农迁入`);
    } else {
      limitingFactors.push(
        `现有控制区内的潜在耕地已接近饱和（仅剩 ${freeArableHa.toFixed(1)} 公顷），限制了纯农业户数增长`
      );
    }

    if (state.policies.rentPolicy === 'low') {
      positiveFactors.push('当前实行【低地租】政策，居民留存积蓄较多，加速建房分户与移民流入');
    } else if (state.policies.rentPolicy === 'high') {
      limitingFactors.push('当前【高地租】加重了家庭负担，减缓了居民积蓄建房分家的速度');
    }

    if (hasBuilding(state, 'marketplace') || state.economy.commercialProsperity >= 25) {
      positiveFactors.push(
        `商业与集市提供了非农就业机会（当前非农家庭 ${state.population.nonFarmHouseholds} 户）`
      );
    } else if (state.population.totalHouseholds >= 20) {
      limitingFactors.push('尚未形成繁荣集市与贸易网络，非农业就业岗位有限');
    }

    if (state.economy.security >= 70) {
      positiveFactors.push(`领地治安良好（${state.economy.security}/100），社会环境稳定`);
    } else if (state.economy.security < 55) {
      limitingFactors.push(`领地治安偏低（${state.economy.security}/100），降低了移民安全感`);
    }

    if (avgSavings < 0.9) {
      limitingFactors.push('居民平均私人积蓄较少，青年人口难以筹资建造新农舍独立成户');
    }

    const headline =
      householdsDelta10Y >= 12
        ? '人口与户数快速增长'
        : householdsDelta10Y >= 3
          ? '人口稳步自然成长'
          : householdsDelta10Y >= 0
            ? '人口增长趋于缓慢'
            : '人口出现阶段性流失';

    return {
      title: '人口与家庭发展诊断',
      headline,
      summary10Years: `过去 ${hist.length} 年间，领地总户数变化 ${householdsDelta10Y >= 0 ? '+' : ''}${householdsDelta10Y} 户（净增人口 ${popDelta10Y >= 0 ? '+' : ''}${popDelta10Y} 人）。当前平均每户 ${(state.population.totalPopulation / Math.max(1, state.population.totalHouseholds)).toFixed(1)} 人。`,
      positiveFactors:
        positiveFactors.length > 0 ? positiveFactors : ['基础庄园运转平稳，维持自然更替'],
      limitingFactors:
        limitingFactors.length > 0 ? limitingFactors : ['当前暂无明显人口增长瓶颈'],
      advice:
        freeArableHa < 18 && !hasBuilding(state, 'marketplace')
          ? '建议：通过建设【跨河木石桥】与【定期集市广场】发展工商业，或在【建设-扩土】中并入周边片区以突破土地承载上限。'
          : '建议：保持充足余粮与治安，适时降低地租或鼓励开垦以加速家庭裂变与移民迁入。',
    };
  }

  if (metric === 'food') {
    const netSurplus =
      state.agriculture.lastNetYieldTons +
      state.agriculture.lastFoodImportedTons -
      state.agriculture.lastAnnualConsumptionTons -
      state.agriculture.lastFoodExportedTons;
    const positiveFactors: string[] = [];
    const limitingFactors: string[] = [];

    positiveFactors.push(
      `已开垦耕地 ${state.agriculture.cultivatedLandHa.toFixed(1)} 公顷（本年实际播种 ${state.agriculture.sownAreaHa.toFixed(1)} 公顷）`
    );
    if (hasBuilding(state, 'watermill')) {
      positiveFactors.push('水磨坊已投入运转，降低了加工损耗并提升技术产出');
    }
    if (hasBuilding(state, 'field_improvement')) {
      positiveFactors.push('农田改良工程提高了轮作播种比例与土地肥力');
    }
    if (state.agriculture.lastFoodImportedTons > 0) {
      positiveFactors.push(
        `外部商路本年进口补充了 ${state.agriculture.lastFoodImportedTons.toFixed(1)} 吨粮食`
      );
    }

    if (state.agriculture.weatherFactor < 1.0) {
      limitingFactors.push(
        `本年遭遇不利天气（系数 ×${state.agriculture.weatherFactor}），导致单产下滑`
      );
    }
    if (
      state.agriculture.cultivatedLandHa >= state.agriculture.arablePotentialHa * 0.92 &&
      state.population.nonFarmHouseholds > 15 &&
      state.economy.foodImportCapacityTons < 10
    ) {
      limitingFactors.push('本地耕地已近上限，需进一步提升对外贸易便利度以扩大粮食进口能力');
    }

    return {
      title: '农业生产与粮食供需解释',
      headline:
        state.agriculture.foodStockTons >= state.agriculture.lastAnnualConsumptionTons * 0.8
          ? '谷仓充盈，粮食安全稳固'
          : state.agriculture.foodStockTons >= state.agriculture.lastAnnualConsumptionTons * 0.35
            ? '粮食供需基本平衡'
            : '存粮紧张，需警惕歉收风险',
      summary10Years: `本年度总产 ${state.agriculture.lastGrossYieldTons.toFixed(1)} 吨，扣除留种 ${state.agriculture.lastSeedTons.toFixed(1)} 吨与损耗 ${state.agriculture.lastLossTons.toFixed(1)} 吨后，净产 ${state.agriculture.lastNetYieldTons.toFixed(1)} 吨；全领地 ${state.population.totalPopulation} 人年消耗 ${state.agriculture.lastAnnualConsumptionTons.toFixed(1)} 吨（净结余 ${netSurplus >= 0 ? '+' : ''}${netSurplus.toFixed(1)} 吨）。`,
      positiveFactors,
      limitingFactors:
        limitingFactors.length > 0 ? limitingFactors : ['当前农业生产与消费结构健康'],
      advice:
        '农民拥有积蓄且安全有保障时会自动开垦荒地；建设水磨坊、农田改良工程与大谷仓可显著提高单产并降低损耗。',
    };
  }

  if (metric === 'commerce') {
    const positiveFactors: string[] = [];
    const limitingFactors: string[] = [];

    if (hasBuilding(state, 'river_bridge')) {
      positiveFactors.push('跨河木石桥已打通两岸陆路商机');
    } else {
      limitingFactors.push('尚未建造跨河桥梁，对外交通便利度受限');
    }

    if (hasBuilding(state, 'marketplace')) {
      positiveFactors.push('定期集市广场吸引商贾汇集，支撑非农工匠家庭发展');
    } else {
      limitingFactors.push('尚未兴建定期集市广场，缺乏固定交易场所');
    }

    if (state.policies.tradePolicy === 'free_trade') {
      positiveFactors.push('【鼓励自由贸易】政策提升了商队到访与商人定居意愿');
    } else if (state.policies.tradePolicy === 'high_tariffs') {
      limitingFactors.push('【提高市场收费】政策增加了单笔税收，但抑制了整体贸易规模扩张');
    }

    return {
      title: '商业繁荣度与手工业解释',
      headline:
        state.economy.commercialProsperity >= 55
          ? '商贾云集，区域贸易重镇'
          : state.economy.commercialProsperity >= 22
            ? '集市兴起，手工业稳步成长'
            : '乡村自给经济为主，商业初萌',
      summary10Years: `当前商业繁荣度 ${state.economy.commercialProsperity}/100，对外交通便利度 ${state.economy.tradeAccess.toFixed(0)}，非农业家庭 ${state.population.nonFarmHouseholds} 户，自发形成手工作坊 ${state.economy.workshopsCount} 间，粮食年进口运力上限 ${state.economy.foodImportCapacityTons.toFixed(1)} 吨。`,
      positiveFactors:
        positiveFactors.length > 0
          ? positiveFactors
          : ['随着农业余粮积累，乡村铁匠与小商贩将自然萌芽'],
      limitingFactors:
        limitingFactors.length > 0 ? limitingFactors : ['商业网络畅通，无明显体制阻碍'],
      advice:
        '商业繁荣并非独立数字，而是由农业余粮、本地人口需求、交通桥梁、集市建设及治安共同驱动。',
    };
  }

  // finance
  return {
    title: '领主金库与财政收支解释',
    headline:
      state.finance.annualBalance >= 5
        ? '财政盈余丰厚，具备大型建设能力'
        : state.finance.annualBalance >= 0
          ? '财政收支平衡，稳步积累资金'
          : '财政出现赤字，需控制开支或开辟税源',
    summary10Years: `当前金库余额 ${state.finance.treasury.toFixed(1)} 金币，年收入 ${state.finance.annualIncome.toFixed(1)} 金币，年支出 ${state.finance.annualExpense.toFixed(1)} 金币，年度净结余 ${state.finance.annualBalance >= 0 ? '+' : ''}${state.finance.annualBalance.toFixed(1)} 金币。`,
    positiveFactors: [
      `地租与税赋贡献 ${state.finance.incomeBreakdown.rentIncome.toFixed(1)} 金币/年`,
      `领主自营庄园贡献 ${state.finance.incomeBreakdown.demesneIncome.toFixed(1)} 金币/年`,
      ...(state.finance.incomeBreakdown.millIncome > 0
        ? [`水磨坊贡献 ${state.finance.incomeBreakdown.millIncome.toFixed(1)} 金币/年`]
        : []),
      ...(state.finance.incomeBreakdown.marketFees + state.finance.incomeBreakdown.tradeTariffs > 0
        ? [
            `集市与商路关税贡献 ${(state.finance.incomeBreakdown.marketFees + state.finance.incomeBreakdown.tradeTariffs).toFixed(1)} 金币/年`,
          ]
        : []),
    ],
    limitingFactors:
      state.finance.consecutiveDeficitYears > 0
        ? [`已连续 ${state.finance.consecutiveDeficitYears} 年赤字，长期赤字将导致维护不足与治安下滑`]
        : ['各项财政支出处于可控范围'],
    advice: '前期依靠农业地租与水磨坊积累资金；中后期通过兴建桥梁、集市与商道获取丰厚的贸易税收。',
  };
}

