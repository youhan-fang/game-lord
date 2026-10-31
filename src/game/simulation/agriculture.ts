import { BuildingId, GameState, WeatherType } from '../world/worldState';
import { SIMULATION_PARAMETERS } from './parameters';
import { SeededRandom } from './rng';

export function hasBuilding(state: GameState, id: BuildingId): boolean {
  return state.buildings.some((b) => b.id === id && b.built);
}

export function getMaintenanceEfficiency(state: GameState): number {
  return SIMULATION_PARAMETERS.policies.budget.maintenance[state.policies.maintenanceBudget]
    .buildingEfficiency;
}

export function rollAnnualWeather(rng: SeededRandom): {
  weatherType: WeatherType;
  weatherFactor: number;
} {
  const probs = SIMULATION_PARAMETERS.agriculture.weatherProbabilities;
  const mods = SIMULATION_PARAMETERS.agriculture.weatherModifiers;
  const r = rng.next();

  if (r < probs.bumper) {
    return { weatherType: 'bumper', weatherFactor: mods.bumper };
  }
  if (r < probs.bumper + probs.normal) {
    return { weatherType: 'normal', weatherFactor: mods.normal };
  }
  if (r < probs.bumper + probs.normal + probs.poor) {
    return { weatherType: 'poor', weatherFactor: mods.poor };
  }
  return { weatherType: 'harsh_winter', weatherFactor: mods.harsh_winter };
}

/**
 * Calculates the annual agricultural production, autonomous land reclamation,
 * and updates agriculture parameters at the start of a new agricultural cycle.
 */
export function calculateAnnualAgriculture(
  state: GameState,
  rng: SeededRandom
): {
  cultivatedLandHa: number;
  sownAreaHa: number;
  fertility: number;
  weatherType: WeatherType;
  weatherFactor: number;
  techFactor: number;
  toolsLevel: number;
  grossYieldTons: number;
  seedTons: number;
  lossTons: number;
  netYieldTons: number;
  annualConsumptionTons: number;
  reclaimedThisYearHa: number;
  reclamationCostGold: number;
  toolInvestmentGold: number;
} {
  const params = SIMULATION_PARAMETERS.agriculture;
  const maintEff = getMaintenanceEfficiency(state);

  // 1. Autonomous peasant tool investment
  let toolsLevel = state.agriculture.toolsLevel;
  let toolInvestmentGold = 0;
  const avgFarmSavings =
    state.population.farmHouseholds > 0
      ? state.population.farmHouseholdSavings / state.population.farmHouseholds
      : 0;

  if (
    avgFarmSavings > SIMULATION_PARAMETERS.privateEconomy.toolUpgradeSavingsThresholdPerHousehold &&
    toolsLevel < SIMULATION_PARAMETERS.privateEconomy.maxToolsLevel
  ) {
    const investable = Math.min(
      state.population.farmHouseholdSavings * 0.12,
      state.population.farmHouseholds * 0.25
    );
    if (investable > 0.3) {
      toolInvestmentGold = investable;
      toolsLevel = Math.min(
        SIMULATION_PARAMETERS.privateEconomy.maxToolsLevel,
        toolsLevel + 0.008 * (1 + investable / Math.max(10, state.population.farmHouseholds))
      );
    }
  }

  // 2. Autonomous land reclamation by peasants
  // Requires: available potential arable land, farm labor demand, peasant savings, basic security, land policy
  const uncultivatedArableHa = Math.max(
    0,
    state.agriculture.arablePotentialHa - state.agriculture.cultivatedLandHa
  );
  const desiredCultivatedHa =
    state.population.farmHouseholds * params.cultivableHaPerHousehold * 1.05;
  const landDemandGapHa = Math.max(0, desiredCultivatedHa - state.agriculture.cultivatedLandHa);

  let reclaimedThisYearHa = 0;
  let reclamationCostGold = 0;

  if (
    uncultivatedArableHa > 0.1 &&
    state.economy.security >= params.minSecurityForReclamation &&
    state.population.farmHouseholdSavings > 1.5
  ) {
    const landMod =
      SIMULATION_PARAMETERS.policies.land[state.policies.landPolicy].reclamationSpeedMultiplier;
    const rentMod =
      SIMULATION_PARAMETERS.policies.rent[state.policies.rentPolicy].reclamationModifier;
    const lordTraitMod = state.dynasty.currentLord.trait.id === 'pioneer' ? 1.2 : 1.0;
    const securityMod = Math.min(1.2, Math.max(0.5, state.economy.security / 75));

    // Base reclamation driven by labor capacity + land demand gap
    const potentialReclaimByLabor =
      state.population.farmHouseholds *
      params.baseReclamationRateHaPerHousehold *
      landMod *
      rentMod *
      lordTraitMod *
      securityMod;

    const targetReclaim = Math.min(
      uncultivatedArableHa,
      Math.max(potentialReclaimByLabor * 0.45, Math.min(landDemandGapHa * 0.45, potentialReclaimByLabor))
    );

    // Constrained by peasant savings (peasants spend up to 30% of savings on clearing land)
    const maxAffordableHa =
      (state.population.farmHouseholdSavings * 0.3) / params.reclamationCostGoldPerHa;

    reclaimedThisYearHa = Math.max(0, Math.min(targetReclaim, maxAffordableHa));
    reclamationCostGold = reclaimedThisYearHa * params.reclamationCostGoldPerHa;
  }

  const cultivatedLandHa = Math.min(
    state.agriculture.arablePotentialHa,
    state.agriculture.cultivatedLandHa + reclaimedThisYearHa
  );

  // 3. Fertility & Tech calculation
  const hasFieldImp = hasBuilding(state, 'field_improvement');
  const hasWatermill = hasBuilding(state, 'watermill');
  const hasGranary = hasBuilding(state, 'granary_expansion');

  let targetFertility = 1.0;
  if (hasFieldImp) {
    targetFertility += 0.1 * maintEff;
  }
  if (state.policies.landPolicy === 'protect_woodland') {
    targetFertility += 0.04;
  }
  const fertility = Number(
    (state.agriculture.fertility * 0.7 + targetFertility * 0.3).toFixed(3)
  );

  let techFactor = toolsLevel;
  if (hasWatermill) {
    techFactor += 0.08 * maintEff;
  }
  if (hasGranary) {
    techFactor += 0.06 * maintEff;
  }
  if (state.dynasty.currentLord.trait.id === 'pioneer') {
    techFactor += 0.05;
  }

  // 4. Weather roll (in year 900 initial state, keep weather gentle on very first year)
  const weather =
    state.gameDate.year === 900
      ? { weatherType: 'normal' as WeatherType, weatherFactor: 1.0 }
      : rollAnnualWeather(rng);

  // Mitigate poor weather slightly if field improvements or granary exist
  let effectiveWeatherFactor = weather.weatherFactor;
  if (effectiveWeatherFactor < 1.0 && hasFieldImp) {
    effectiveWeatherFactor = Math.min(1.0, effectiveWeatherFactor + 0.06 * maintEff);
  }

  // 5. Effective Cultivated & Sown Area
  // 实际耕作面积 = min(可用耕地, 农业劳动力可耕作面积)
  const maxCultivableByLaborHa =
    state.population.farmHouseholds * params.cultivableHaPerHousehold;
  const effectiveCultivatedHa = Math.min(cultivatedLandHa, maxCultivableByLaborHa);

  const sownRatio = hasFieldImp
    ? params.baseSownRatio + (params.improvedSownRatio - params.baseSownRatio) * maintEff
    : params.baseSownRatio;

  const sownAreaHa = Number((effectiveCultivatedHa * sownRatio).toFixed(2));

  // 6. Gross Yield, Seed, and Loss
  // 总粮食产量 = 播种面积 × 单位产量 × 肥力系数 × 天气系数 × 技术系数
  const grossYieldTons = Number(
    (
      sownAreaHa *
      params.baseYieldPerHaTons *
      fertility *
      effectiveWeatherFactor *
      techFactor
    ).toFixed(2)
  );

  const seedTons = Number((grossYieldTons * params.seedRatio).toFixed(2));

  let lossRatio: number = params.baseLossRatio;
  if (hasWatermill) {
    lossRatio -= params.watermillLossReduction * maintEff;
  }
  if (hasGranary) {
    lossRatio -= params.granaryLossReduction * maintEff;
  }
  lossRatio = Math.max(0.025, lossRatio);

  const lossTons = Number((grossYieldTons * lossRatio).toFixed(2));
  const netYieldTons = Number(Math.max(0, grossYieldTons - seedTons - lossTons).toFixed(2));

  const annualConsumptionTons = Number(
    (state.population.totalPopulation * params.foodPerPersonPerYearTons).toFixed(2)
  );

  return {
    cultivatedLandHa: Number(cultivatedLandHa.toFixed(2)),
    sownAreaHa,
    fertility,
    weatherType: weather.weatherType,
    weatherFactor: Number(effectiveWeatherFactor.toFixed(2)),
    techFactor: Number(techFactor.toFixed(3)),
    toolsLevel: Number(toolsLevel.toFixed(3)),
    grossYieldTons,
    seedTons,
    lossTons,
    netYieldTons,
    annualConsumptionTons,
    reclaimedThisYearHa: Number(reclaimedThisYearHa.toFixed(2)),
    reclamationCostGold: Number(reclamationCostGold.toFixed(2)),
    toolInvestmentGold: Number(toolInvestmentGold.toFixed(2)),
  };
}
