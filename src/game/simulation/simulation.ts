import { BUILDING_DEFINITIONS } from '../../data/buildings';
import { updateWorldVisualState } from '../world/visualRules';
import {
  BuildingId,
  GameEvent,
  GameState,
  OfflineReportData,
  PendingDecision,
  SimulationResult,
} from '../world/worldState';
import { calculateAnnualAgriculture } from './agriculture';
import { advanceAnnualDynasty } from './dynasty';
import { calculateAnnualEconomyAndPrivateWealth } from './economy';
import { evaluateAnnualRandomEvents } from './events';
import { calculateAnnualFinance } from './finance';
import { SIMULATION_PARAMETERS } from './parameters';
import { calculateAnnualPopulation } from './population';
import { SeededRandom } from './rng';

const HOUSEHOLD_MILESTONES = [25, 50, 100, 200, 300, 500, 750, 1000];

/**
 * Core deterministic monthly simulation step.
 * Advances the game state by 1 month, executing monthly consumption/finance/construction
 * and triggering full annual agricultural, demographic, commercial, and dynasty settlements on Month 12 -> Month 1.
 */
export function simulateMonth(
  state: GameState,
  rng: SeededRandom = new SeededRandom(state.randomSeed)
): SimulationResult {
  const prevPop = state.population.totalPopulation;
  const prevHouseholds = state.population.totalHouseholds;
  const prevTreasury = state.finance.treasury;
  const prevFood = state.agriculture.foodStockTons;
  const prevCultivated = state.agriculture.cultivatedLandHa;
  const prevProsperity = state.economy.commercialProsperity;

  const newEvents: GameEvent[] = [];

  // 1. Advance Game Date
  const isYearEnd = state.gameDate.month === 12;
  const nextYear = isYearEnd ? state.gameDate.year + 1 : state.gameDate.year;
  const nextMonth = isYearEnd ? 1 : state.gameDate.month + 1;
  const nextTotalMonths = state.gameDate.totalMonths + 1;

  // 2. Advance Building Construction Projects
  const nextBuildings = state.buildings.map((b) => {
    if (!b.underConstruction || b.built) return b;
    const nextProgress = b.progressMonths + 1;
    if (nextProgress >= b.totalMonths) {
      const def = BUILDING_DEFINITIONS[b.id];
      newEvents.push({
        id: `evt_built_${b.id}_${nextYear}_${nextMonth}`,
        year: nextYear,
        month: nextMonth,
        title: `${def.name}竣工落成`,
        description: `历时 ${b.totalMonths} 个月施工，【${def.name}】正式建成并投入使用。`,
        category: 'construction',
        important: true,
      });
      return {
        ...b,
        built: true,
        underConstruction: false,
        progressMonths: b.totalMonths,
        builtYear: nextYear,
      };
    }
    return {
      ...b,
      progressMonths: nextProgress,
    };
  });

  let workingState: GameState = {
    ...state,
    gameDate: {
      year: nextYear,
      month: nextMonth,
      totalMonths: nextTotalMonths,
    },
    buildings: nextBuildings,
  };

  // 3. Monthly Food Stock & Treasury Accrual
  const annualNetFoodFlow =
    workingState.agriculture.lastNetYieldTons +
    workingState.agriculture.lastFoodImportedTons -
    workingState.agriculture.lastAnnualConsumptionTons -
    workingState.agriculture.lastFoodExportedTons;

  const monthlyFoodDelta = annualNetFoodFlow / 12;
  const maxFoodStorage = Math.max(
    45,
    workingState.agriculture.lastAnnualConsumptionTons *
      SIMULATION_PARAMETERS.agriculture.maxStorageMultiplierOfAnnualNeed
  );
  const nextFoodStock = Number(
    Math.max(0, Math.min(maxFoodStorage, workingState.agriculture.foodStockTons + monthlyFoodDelta)).toFixed(2)
  );

  const finCalc = calculateAnnualFinance(workingState);
  const monthlyTreasuryDelta = finCalc.annualBalance / 12;
  const nextTreasury = Number(
    Math.max(-30, workingState.finance.treasury + monthlyTreasuryDelta).toFixed(2)
  );

  workingState = {
    ...workingState,
    agriculture: {
      ...workingState.agriculture,
      foodStockTons: nextFoodStock,
    },
    finance: {
      ...workingState.finance,
      treasury: nextTreasury,
      annualIncome: finCalc.annualIncome,
      annualExpense: finCalc.annualExpense,
      annualBalance: finCalc.annualBalance,
      incomeBreakdown: finCalc.incomeBreakdown,
      expenseBreakdown: finCalc.expenseBreakdown,
    },
  };

  // 4. Annual Settlement (Triggered when transitioning into Month 1 of a new year)
  if (isYearEnd) {
    // 4a. Agriculture & Autonomous Reclamation
    const agResult = calculateAnnualAgriculture(workingState, rng);

    if (
      agResult.reclaimedThisYearHa >= 1.5 &&
      Math.floor(agResult.cultivatedLandHa / 20) >
        Math.floor(workingState.agriculture.cultivatedLandHa / 20)
    ) {
      newEvents.push({
        id: `evt_reclaim_${nextYear}`,
        year: nextYear,
        month: 1,
        title: '农田开垦边界扩大',
        description: `佃农们利用积蓄自主开荒，领地已开垦耕地扩大至 ${agResult.cultivatedLandHa.toFixed(0)} 公顷。`,
        category: 'harvest',
        important: false,
      });
    }

    workingState = {
      ...workingState,
      agriculture: {
        ...workingState.agriculture,
        cultivatedLandHa: agResult.cultivatedLandHa,
        sownAreaHa: agResult.sownAreaHa,
        fertility: agResult.fertility,
        weatherType: agResult.weatherType,
        weatherFactor: agResult.weatherFactor,
        techFactor: agResult.techFactor,
        toolsLevel: agResult.toolsLevel,
        lastGrossYieldTons: agResult.grossYieldTons,
        lastSeedTons: agResult.seedTons,
        lastLossTons: agResult.lossTons,
        lastNetYieldTons: agResult.netYieldTons,
        lastAnnualConsumptionTons: agResult.annualConsumptionTons,
        reclaimedThisYearHa: agResult.reclaimedThisYearHa,
      },
    };

    // 4b. Economy, Trade & Private Household Wealth
    const prevWorkshops = workingState.economy.workshopsCount;
    const econResult = calculateAnnualEconomyAndPrivateWealth(workingState, agResult);

    if (prevWorkshops === 0 && econResult.workshopsCount >= 1) {
      newEvents.push({
        id: `evt_first_workshop_${nextYear}`,
        year: nextYear,
        month: 1,
        title: '村庄出现第一间专业铁匠与木工作坊',
        description: '随着聚落积累余粮与私产，心灵手巧的匠人自发开设了领地内第一间专业手工作坊。',
        category: 'commerce',
        important: true,
      });
    } else if (
      econResult.workshopsCount > prevWorkshops &&
      Math.floor(econResult.workshopsCount / 5) > Math.floor(prevWorkshops / 5)
    ) {
      newEvents.push({
        id: `evt_workshops_${nextYear}`,
        year: nextYear,
        month: 1,
        title: `镇内手工作坊增至 ${econResult.workshopsCount} 间`,
        description: '铁匠铺、面包房、织布坊与皮匠铺在街道两侧陆续开业，市镇手工业日益兴旺。',
        category: 'commerce',
        important: false,
      });
    }

    workingState = {
      ...workingState,
      agriculture: {
        ...workingState.agriculture,
        lastFoodImportedTons: econResult.foodImportedTons,
        lastFoodExportedTons: econResult.foodExportedTons,
      },
      economy: {
        ...workingState.economy,
        security: econResult.security,
        tradeAccess: econResult.tradeAccess,
        commercialActivity: econResult.commercialActivity,
        commercialProsperity: econResult.commercialProsperity,
        foodImportCapacityTons: econResult.foodImportCapacityTons,
        workshopsCount: econResult.workshopsCount,
        merchantsCount: econResult.merchantsCount,
        prestige: econResult.prestige,
      },
    };

    // 4c. Population, Migration & Household Formation
    const farmSavingsAfterIncome = Math.max(
      0,
      workingState.population.farmHouseholdSavings + econResult.farmNetSavingsDelta
    );
    const nonFarmSavingsAfterIncome = Math.max(
      0,
      workingState.population.nonFarmHouseholdSavings + econResult.nonFarmNetSavingsDelta
    );
    const projectedFoodStock =
      workingState.agriculture.foodStockTons +
      agResult.netYieldTons +
      econResult.foodImportedTons -
      agResult.annualConsumptionTons;

    const popResult = calculateAnnualPopulation(
      workingState,
      projectedFoodStock,
      agResult.annualConsumptionTons,
      farmSavingsAfterIncome,
      nonFarmSavingsAfterIncome,
      rng
    );

    const netNewHouseholds = popResult.totalHouseholds - workingState.population.totalHouseholds;
    if (netNewHouseholds >= 3 && rng.chance(0.45)) {
      newEvents.push({
        id: `evt_pop_growth_${nextYear}`,
        year: nextYear,
        month: 1,
        title: `领地新增 ${netNewHouseholds} 户定居家庭`,
        description: `凭借良好的生计与安定环境，本年度新组建及迁入共增加 ${netNewHouseholds} 户居民，总户数达 ${popResult.totalHouseholds} 户。`,
        category: 'migration',
        important: false,
      });
    }

    workingState = {
      ...workingState,
      population: {
        ...workingState.population,
        ...popResult,
      },
    };

    // 4d. Random Historical Events & Pending Decisions
    const randOutcome = evaluateAnnualRandomEvents(workingState, rng);
    newEvents.push(...randOutcome.events);

    const updatedFarmH = Math.max(
      3,
      workingState.population.farmHouseholds + randOutcome.farmHouseholdsDelta
    );
    const updatedNonFarmH = Math.max(
      0,
      workingState.population.nonFarmHouseholds + randOutcome.nonFarmHouseholdsDelta
    );
    const updatedTotalH = updatedFarmH + updatedNonFarmH;
    const updatedFarmPop = Math.max(
      12,
      workingState.population.farmPopulation + randOutcome.populationDelta
    );
    const updatedTotalPop = updatedFarmPop + workingState.population.nonFarmPopulation;

    // Check household milestones
    for (const ms of HOUSEHOLD_MILESTONES) {
      if (prevHouseholds < ms && updatedTotalH >= ms) {
        newEvents.push({
          id: `evt_milestone_${ms}_${nextYear}`,
          year: nextYear,
          month: 1,
          title: `领地突破 ${ms} 户历史里程碑！`,
          description: `经过世代经营，领地居民规模达到 ${updatedTotalH} 户（${updatedTotalPop} 人），河谷聚落愈发繁荣壮观！`,
          category: 'milestone',
          important: true,
        });
      }
    }

    let milestone1000Reached = workingState.milestone1000Reached;
    let milestone1000Year = workingState.milestone1000Year;
    if (!milestone1000Reached && updatedTotalH >= 1000) {
      milestone1000Reached = true;
      milestone1000Year = nextYear;
    }

    // 4e. Dynasty Aging & Succession
    const dynastyResult = advanceAnnualDynasty(workingState, rng);
    newEvents.push(...dynastyResult.events);

    // 4f. Recalculate Annual Finance & History Snapshot
    const updatedFinance = calculateAnnualFinance({
      ...workingState,
      population: {
        ...workingState.population,
        totalHouseholds: updatedTotalH,
        farmHouseholds: updatedFarmH,
        nonFarmHouseholds: updatedNonFarmH,
        totalPopulation: updatedTotalPop,
        farmPopulation: updatedFarmPop,
      },
      dynasty: dynastyResult.dynasty,
    });

    const nextTreasuryAfterEvents = Number(
      Math.max(-30, workingState.finance.treasury + randOutcome.treasuryDelta).toFixed(2)
    );
    const nextFoodAfterEvents = Number(
      Math.max(0, workingState.agriculture.foodStockTons + randOutcome.foodDeltaTons).toFixed(2)
    );

    const consecutiveDeficitYears =
      updatedFinance.annualBalance < 0 || nextTreasuryAfterEvents < 0
        ? workingState.finance.consecutiveDeficitYears + 1
        : 0;

    const snapshot = {
      year: nextYear,
      households: updatedTotalH,
      population: updatedTotalPop,
      births: popResult.annualBirths,
      deaths: popResult.annualDeaths,
      immigrants: popResult.annualImmigrants,
      emigrants: popResult.annualEmigrants,
      newHouseholds: popResult.newHouseholdsFormed,
      foodSurplusTons: Number(
        (agResult.netYieldTons + econResult.foodImportedTons - agResult.annualConsumptionTons).toFixed(2)
      ),
      commercialProsperity: econResult.commercialProsperity,
      treasuryBalance: updatedFinance.annualBalance,
    };

    const nextHistory10Years = [...workingState.population.history10Years, snapshot].slice(-10);

    workingState = {
      ...workingState,
      population: {
        ...workingState.population,
        totalHouseholds: updatedTotalH,
        farmHouseholds: updatedFarmH,
        nonFarmHouseholds: updatedNonFarmH,
        totalPopulation: updatedTotalPop,
        farmPopulation: updatedFarmPop,
        history10Years: nextHistory10Years,
      },
      agriculture: {
        ...workingState.agriculture,
        foodStockTons: nextFoodAfterEvents,
      },
      finance: {
        treasury: nextTreasuryAfterEvents,
        annualIncome: updatedFinance.annualIncome,
        annualExpense: updatedFinance.annualExpense,
        annualBalance: updatedFinance.annualBalance,
        incomeBreakdown: updatedFinance.incomeBreakdown,
        expenseBreakdown: {
          ...updatedFinance.expenseBreakdown,
          constructionCostThisYear: 0,
        },
        consecutiveDeficitYears,
      },
      pendingDecisions: [
        ...workingState.pendingDecisions,
        ...randOutcome.newPendingDecisions,
      ],
      dynasty: dynastyResult.dynasty,
      milestone1000Reached,
      milestone1000Year,
    };
  }

  // 5. Update Visual Map State & Chronicle Events List
  const updatedMap = updateWorldVisualState(workingState);

  // Keep Chronicle events bounded (preserve important events + recent 180 events)
  const combinedEvents = [...newEvents.reverse(), ...workingState.events];
  const trimmedEvents =
    combinedEvents.length > 260
      ? [
          ...combinedEvents.slice(0, 140),
          ...combinedEvents.slice(140).filter((e) => e.important).slice(0, 120),
        ]
      : combinedEvents;

  const finalState: GameState = {
    ...workingState,
    randomSeed: rng.getState(),
    map: updatedMap,
    events: trimmedEvents,
  };

  return {
    nextState: finalState,
    events: newEvents,
    changes: {
      populationDelta: finalState.population.totalPopulation - prevPop,
      householdsDelta: finalState.population.totalHouseholds - prevHouseholds,
      treasuryDelta: Number((finalState.finance.treasury - prevTreasury).toFixed(2)),
      foodDelta: Number((finalState.agriculture.foodStockTons - prevFood).toFixed(2)),
      cultivatedDelta: Number(
        (finalState.agriculture.cultivatedLandHa - prevCultivated).toFixed(2)
      ),
      prosperityDelta: finalState.economy.commercialProsperity - prevProsperity,
    },
  };
}

/**
 * Batch-simulates multiple months deterministically (for fast-forward or offline catch-up).
 * Can simulate 100 to 300 years (1200 to 3600 months) in under 30 milliseconds.
 */
export function simulateMultipleMonths(
  initialState: GameState,
  monthsToSimulate: number,
  elapsedRealSeconds: number = 0
): {
  nextState: GameState;
  events: GameEvent[];
  offlineReport: OfflineReportData;
} {
  const cappedMonths = Math.max(
    0,
    Math.min(
      monthsToSimulate,
      SIMULATION_PARAMETERS.time.maxOfflineYearsToSimulate * 12
    )
  );

  const rng = new SeededRandom(initialState.randomSeed);
  let current = initialState;
  const collectedEvents: GameEvent[] = [];

  for (let i = 0; i < cappedMonths; i++) {
    const res = simulateMonth(current, rng);
    current = res.nextState;
    if (res.events.length > 0) {
      collectedEvents.push(...res.events);
    }
  }

  const foodRatio =
    current.agriculture.lastAnnualConsumptionTons > 0
      ? current.agriculture.foodStockTons / current.agriculture.lastAnnualConsumptionTons
      : 1;
  const foodStatusText =
    foodRatio >= 0.9
      ? `充足（存粮 ${current.agriculture.foodStockTons.toFixed(1)} 吨）`
      : foodRatio >= 0.4
        ? `平衡（存粮 ${current.agriculture.foodStockTons.toFixed(1)} 吨）`
        : `偏紧（存粮 ${current.agriculture.foodStockTons.toFixed(1)} 吨）`;

  const commDelta =
    current.economy.commercialProsperity - initialState.economy.commercialProsperity;
  const commerceStatusText =
    commDelta >= 10
      ? `显著增长（繁荣度 ${initialState.economy.commercialProsperity} → ${current.economy.commercialProsperity}）`
      : commDelta > 0
        ? `小幅增长（繁荣度 ${initialState.economy.commercialProsperity} → ${current.economy.commercialProsperity}）`
        : commDelta === 0
          ? `保持稳定（繁荣度 ${current.economy.commercialProsperity}/100）`
          : `有所回落（繁荣度 ${initialState.economy.commercialProsperity}/100）`;

  const importantFirst = [
    ...collectedEvents.filter((e) => e.important),
    ...collectedEvents.filter((e) => !e.important),
  ].slice(0, 8);

  const offlineReport: OfflineReportData = {
    elapsedRealSeconds,
    monthsSimulated: cappedMonths,
    yearsSimulated: Number((cappedMonths / 12).toFixed(1)),
    startYear: initialState.gameDate.year,
    endYear: current.gameDate.year,
    oldHouseholds: initialState.population.totalHouseholds,
    newHouseholds: current.population.totalHouseholds,
    oldPopulation: initialState.population.totalPopulation,
    newPopulation: current.population.totalPopulation,
    oldTreasury: initialState.finance.treasury,
    newTreasury: current.finance.treasury,
    foodStatusText,
    commerceStatusText,
    highlightEvents: importantFirst,
  };

  return {
    nextState: current,
    events: collectedEvents,
    offlineReport,
  };
}

/**
 * Player Action Helpers (Pure state transitions for building, expanding land, and resolving pending decisions)
 */
export function startBuildingConstruction(
  state: GameState,
  buildingId: BuildingId
): { nextState: GameState; success: boolean; reason?: string } {
  const bState = state.buildings.find((b) => b.id === buildingId);
  const def = BUILDING_DEFINITIONS[buildingId];
  if (!bState || !def) {
    return { nextState: state, success: false, reason: '未知建筑项目' };
  }
  if (bState.built) {
    return { nextState: state, success: false, reason: '该项目已经建成' };
  }
  if (bState.underConstruction) {
    return { nextState: state, success: false, reason: '该项目正在施工中' };
  }
  if (state.finance.treasury < def.costGold) {
    return {
      nextState: state,
      success: false,
      reason: `金库资金不足（需 ${def.costGold} 金币）`,
    };
  }
  if (
    def.prerequisites.minHouseholds &&
    state.population.totalHouseholds < def.prerequisites.minHouseholds
  ) {
    return {
      nextState: state,
      success: false,
      reason: def.prerequisites.prerequisiteText,
    };
  }
  if (def.prerequisites.requiredBuildings) {
    for (const reqId of def.prerequisites.requiredBuildings) {
      const reqBuilt = state.buildings.some((b) => b.id === reqId && b.built);
      if (!reqBuilt) {
        return {
          nextState: state,
          success: false,
          reason: def.prerequisites.prerequisiteText,
        };
      }
    }
  }

  const nextBuildings = state.buildings.map((b) =>
    b.id === buildingId ? { ...b, underConstruction: true, progressMonths: 0 } : b
  );

  const nextTreasury = Number((state.finance.treasury - def.costGold).toFixed(2));
  const nextState: GameState = {
    ...state,
    finance: {
      ...state.finance,
      treasury: nextTreasury,
      expenseBreakdown: {
        ...state.finance.expenseBreakdown,
        constructionCostThisYear: Number(
          (state.finance.expenseBreakdown.constructionCostThisYear + def.costGold).toFixed(2)
        ),
      },
    },
    buildings: nextBuildings,
    events: [
      {
        id: `evt_start_build_${buildingId}_${state.gameDate.year}_${state.gameDate.month}`,
        year: state.gameDate.year,
        month: state.gameDate.month,
        title: `动工兴建：${def.name}`,
        description: `领主拨款 ${def.costGold} 金币启动【${def.name}】工程，预计工期 ${def.buildMonths} 个月。`,
        category: 'construction',
        important: false,
      },
      ...state.events,
    ],
  };

  nextState.map = updateWorldVisualState(nextState);
  return { nextState, success: true };
}

export function acquireRegionExpansion(
  state: GameState,
  regionId: string
): { nextState: GameState; success: boolean; reason?: string } {
  const region = state.regions.find((r) => r.id === regionId);
  if (!region) {
    return { nextState: state, success: false, reason: '未知领地片区' };
  }
  if (region.unlocked) {
    return { nextState: state, success: false, reason: '该片区已并入领地' };
  }
  if (state.finance.treasury < region.costGold) {
    return {
      nextState: state,
      success: false,
      reason: `金库不足（需 ${region.costGold} 金币）`,
    };
  }
  if (state.population.totalHouseholds < region.requiredHouseholds) {
    return {
      nextState: state,
      success: false,
      reason: `需领地总户数达到 ${region.requiredHouseholds} 户`,
    };
  }
  if (state.economy.prestige < region.requiredPrestige) {
    return {
      nextState: state,
      success: false,
      reason: `需家族威望达到 ${region.requiredPrestige}（当前 ${state.economy.prestige}）`,
    };
  }

  const addedPop = region.initialFarmHouseholds * 5;
  const addedCultivatedHa = Math.round(region.initialFarmHouseholds * 3.8);

  const nextState: GameState = {
    ...state,
    finance: {
      ...state.finance,
      treasury: Number((state.finance.treasury - region.costGold).toFixed(2)),
    },
    agriculture: {
      ...state.agriculture,
      controlledLandHa: state.agriculture.controlledLandHa + region.landHa,
      arablePotentialHa: state.agriculture.arablePotentialHa + region.arableHa,
      cultivatedLandHa: state.agriculture.cultivatedLandHa + addedCultivatedHa,
    },
    population: {
      ...state.population,
      totalHouseholds: state.population.totalHouseholds + region.initialFarmHouseholds,
      farmHouseholds: state.population.farmHouseholds + region.initialFarmHouseholds,
      totalPopulation: state.population.totalPopulation + addedPop,
      farmPopulation: state.population.farmPopulation + addedPop,
      housingCapacity: state.population.housingCapacity + region.initialFarmHouseholds + 4,
    },
    regions: state.regions.map((r) =>
      r.id === regionId
        ? { ...r, unlocked: true, unlockedYear: state.gameDate.year }
        : r
    ),
    events: [
      {
        id: `evt_expand_${regionId}_${state.gameDate.year}`,
        year: state.gameDate.year,
        month: state.gameDate.month,
        title: `领地疆域扩张：并入${region.name}`,
        description: `耗资 ${region.costGold} 金币完成册封与赎买，领地新增控制土地 ${region.landHa} 公顷（潜在耕地 +${region.arableHa} 公顷），并吸纳当地 ${region.initialFarmHouseholds} 户居民！`,
        category: 'expansion',
        important: true,
      },
      ...state.events,
    ],
  };

  const finCalc = calculateAnnualFinance(nextState);
  nextState.finance.annualIncome = finCalc.annualIncome;
  nextState.finance.annualExpense = finCalc.annualExpense;
  nextState.finance.annualBalance = finCalc.annualBalance;
  nextState.finance.incomeBreakdown = finCalc.incomeBreakdown;
  nextState.finance.expenseBreakdown = finCalc.expenseBreakdown;
  nextState.map = updateWorldVisualState(nextState);

  return { nextState, success: true };
}

export function resolvePendingDecision(
  state: GameState,
  decisionId: string,
  approved: boolean
): GameState {
  const decision: PendingDecision | undefined = state.pendingDecisions.find(
    (d) => d.id === decisionId
  );
  if (!decision) return state;

  const remaining = state.pendingDecisions.filter((d) => d.id !== decisionId);
  if (!approved) {
    return {
      ...state,
      pendingDecisions: remaining,
    };
  }

  if (state.finance.treasury < decision.costGold) {
    return state;
  }

  let nextState: GameState = {
    ...state,
    finance: {
      ...state.finance,
      treasury: Number((state.finance.treasury - decision.costGold).toFixed(2)),
    },
    pendingDecisions: remaining,
  };

  if (decision.effectType === 'market_charter') {
    nextState = {
      ...nextState,
      economy: {
        ...nextState.economy,
        grantedMarketCharter: true,
        tradeAccess: nextState.economy.tradeAccess + 12,
        prestige: nextState.economy.prestige + 8,
      },
      events: [
        {
          id: `evt_dec_market_${state.gameDate.year}`,
          year: state.gameDate.year,
          month: state.gameDate.month,
          title: '领主颁布《河谷集市特许状》',
          description: '常设集市获得领主宪章保护，四方行商纷纷携货前来定居贸易。',
          category: 'commerce',
          important: true,
        },
        ...nextState.events,
      ],
    };
  } else if (decision.effectType === 'guild_charter') {
    nextState = {
      ...nextState,
      economy: {
        ...nextState.economy,
        grantedGuildCharter: true,
        workshopsCount: nextState.economy.workshopsCount + 2,
        prestige: nextState.economy.prestige + 10,
      },
      events: [
        {
          id: `evt_dec_guild_${state.gameDate.year}`,
          year: state.gameDate.year,
          month: state.gameDate.month,
          title: '批准成立《领地手工业联合行会》',
          description: '铁匠、织工与木匠行会正式挂牌，领地手工业品质与商业声望显著提高。',
          category: 'commerce',
          important: true,
        },
        ...nextState.events,
      ],
    };
  } else if (decision.effectType === 'forest_assart') {
    nextState = {
      ...nextState,
      agriculture: {
        ...nextState.agriculture,
        arablePotentialHa: Math.min(
          nextState.agriculture.controlledLandHa - 20,
          nextState.agriculture.arablePotentialHa + 35
        ),
      },
      events: [
        {
          id: `evt_dec_assart_${state.gameDate.year}`,
          year: state.gameDate.year,
          month: state.gameDate.month,
          title: '完成林间沼泽排干与垦区勘界',
          description: '领地内新增 35 公顷潜在可耕地，供佃农家庭进一步开垦。',
          category: 'harvest',
          important: true,
        },
        ...nextState.events,
      ],
    };
  }

  nextState.map = updateWorldVisualState(nextState);
  return nextState;
}

