import { GameState } from '../world/worldState';
import { hasBuilding } from './agriculture';
import { SIMULATION_PARAMETERS } from './parameters';
import { SeededRandom } from './rng';

export interface MigrationResult {
  immigrantFarmHouseholds: number;
  immigrantNonFarmHouseholds: number;
  immigrantPopulation: number;
  emigrantFarmHouseholds: number;
  emigrantNonFarmHouseholds: number;
  emigrantPopulation: number;
}

/**
 * Calculates annual migration (immigration and emigration of farm & non-farm households)
 * driven by land availability, commercial opportunity, rent policy, trade access, food supply, and security.
 */
export function calculateAnnualMigration(
  state: GameState,
  projectedFoodStockTons: number,
  annualConsumptionTons: number,
  rng: SeededRandom
): MigrationResult {
  const rentMod = SIMULATION_PARAMETERS.policies.rent[state.policies.rentPolicy];
  const tradeMod = SIMULATION_PARAMETERS.policies.trade[state.policies.tradePolicy];
  const isEncouragingLand = state.policies.landPolicy === 'encourage_reclamation';
  const lordBenevolent = state.dynasty.currentLord.trait.id === 'benevolent';
  const lordStern = state.dynasty.currentLord.trait.id === 'stern';

  const foodRatio =
    annualConsumptionTons > 0 ? projectedFoodStockTons / annualConsumptionTons : 1.0;

  // 1. Agricultural Immigration (Peasant families seeking arable land)
  const totalMaxFarmHouseholdsByLand =
    state.agriculture.arablePotentialHa /
    (SIMULATION_PARAMETERS.agriculture.cultivableHaPerHousehold * 0.72);
  const availableFarmHouseholdSlots = Math.max(
    0,
    totalMaxFarmHouseholdsByLand - state.population.farmHouseholds
  );

  let immigrantFarmHouseholds = 0;
  if (
    availableFarmHouseholdSlots >= 1.2 &&
    foodRatio >= 0.35 &&
    state.economy.security >= 48
  ) {
    const landAttraction = Math.min(1.0, availableFarmHouseholdSlots / 25);
    const securityFactor = Math.max(0, (state.economy.security - 45) / 50);
    const policyFactor =
      1.0 +
      rentMod.migrationBonus +
      (isEncouragingLand ? 0.35 : 0) +
      (lordBenevolent ? 0.18 : 0) -
      (lordStern ? 0.06 : 0);

    const expectedFarmImmigrants =
      availableFarmHouseholdSlots *
      0.14 *
      (0.5 + landAttraction * 0.5) *
      securityFactor *
      Math.max(0.2, policyFactor);

    const baseCap = Math.min(
      Math.ceil(availableFarmHouseholdSlots * 0.35),
      Math.max(3, Math.floor(state.population.farmHouseholds * 0.14) + 2)
    );

    const noisyImmigrants = expectedFarmImmigrants * rng.range(0.75, 1.25);
    immigrantFarmHouseholds = Math.max(0, Math.min(baseCap, Math.round(noisyImmigrants)));
  }

  // 2. Non-Agricultural Immigration (Merchants, Artisans, Townsfolk)
  // Driven by marketplace, tradeAccess, commercialActivity, and food security (local surplus or import capacity)
  const hasMarket = hasBuilding(state, 'marketplace');
  const hasBridge = hasBuilding(state, 'river_bridge');
  const hasHighroad = hasBuilding(state, 'paved_highroad');
  const hasArtisanQuarter = hasBuilding(state, 'artisan_quarter');
  const hasStoneWall = hasBuilding(state, 'stone_wall');

  // How many non-farm households can the commercial & food import economy sustain?
  const localFoodSurplusPeopleSupported = Math.max(
    0,
    (state.agriculture.lastNetYieldTons - state.population.farmPopulation * 0.25) / 0.25
  );
  const importPeopleSupported = state.economy.foodImportCapacityTons / 0.25;
  const maxFoodSupportedNonFarmHouseholds =
    (localFoodSurplusPeopleSupported + importPeopleSupported) / 4.6;

  let commercialCapacityHouseholds = 2;
  if (hasBridge) commercialCapacityHouseholds += 18;
  if (hasMarket) commercialCapacityHouseholds += 95;
  if (state.economy.grantedMarketCharter) commercialCapacityHouseholds += 65;
  if (hasHighroad) commercialCapacityHouseholds += 140;
  if (hasArtisanQuarter) commercialCapacityHouseholds += 240;
  if (state.economy.grantedGuildCharter) commercialCapacityHouseholds += 110;
  if (hasStoneWall) commercialCapacityHouseholds += 220;
  if (hasBuilding(state, 'stone_keep')) commercialCapacityHouseholds += 160;
  commercialCapacityHouseholds += state.regions.filter((r) => r.unlocked).length * 45;

  const effectiveNonFarmCap = Math.min(
    commercialCapacityHouseholds,
    Math.max(8, maxFoodSupportedNonFarmHouseholds * 1.15)
  );
  const availableNonFarmSlots = Math.max(
    0,
    effectiveNonFarmCap - state.population.nonFarmHouseholds
  );

  let immigrantNonFarmHouseholds = 0;
  if (
    availableNonFarmSlots >= 1.0 &&
    foodRatio >= 0.3 &&
    state.economy.security >= 50 &&
    (hasBridge || hasMarket || state.economy.tradeAccess >= 20)
  ) {
    const tradeFactor = (state.economy.tradeAccess / 45) * tradeMod.merchantMigrationBonus;
    const rentFactor = 1.0 + rentMod.migrationBonus * 0.85;
    const securityFactor = Math.max(0.2, (state.economy.security - 45) / 45);

    const expectedNonFarm =
      Math.min(availableNonFarmSlots * 0.16, 2.2 + state.population.nonFarmHouseholds * 0.08) *
      tradeFactor *
      rentFactor *
      securityFactor *
      rng.range(0.8, 1.22);

    const maxAnnualNonFarmImmigrants = Math.max(
      2,
      Math.min(22, Math.ceil(availableNonFarmSlots * 0.25))
    );
    immigrantNonFarmHouseholds = Math.max(
      0,
      Math.min(maxAnnualNonFarmImmigrants, Math.round(expectedNonFarm))
    );
  }

  // 3. Emigration (Driven by severe food shortage, oppressive rent with low savings, or low security)
  let emigrantFarmHouseholds = 0;
  let emigrantNonFarmHouseholds = 0;

  let emigrationPressure = 0;
  if (foodRatio < 0.12) {
    emigrationPressure += SIMULATION_PARAMETERS.population.emigrationStarvationRate * (1 - foodRatio * 5);
  }
  if (state.policies.rentPolicy === 'high') {
    const avgSavings =
      state.population.totalHouseholds > 0
        ? (state.population.farmHouseholdSavings + state.population.nonFarmHouseholdSavings) /
          state.population.totalHouseholds
        : 1;
    if (avgSavings < 0.85) {
      emigrationPressure += SIMULATION_PARAMETERS.population.emigrationHighRentRate;
    } else {
      emigrationPressure += SIMULATION_PARAMETERS.population.emigrationHighRentRate * 0.35;
    }
  }
  if (state.economy.security < 40) {
    emigrationPressure +=
      SIMULATION_PARAMETERS.population.emigrationLowSecurityRate *
      ((40 - state.economy.security) / 25);
  }

  if (emigrationPressure > 0.005) {
    if (state.population.farmHouseholds > 4) {
      emigrantFarmHouseholds = Math.min(
        Math.floor(state.population.farmHouseholds * 0.15),
        Math.round(state.population.farmHouseholds * emigrationPressure * rng.range(0.7, 1.3))
      );
    }
    if (state.population.nonFarmHouseholds > 1) {
      emigrantNonFarmHouseholds = Math.min(
        Math.floor(state.population.nonFarmHouseholds * 0.2),
        Math.round(state.population.nonFarmHouseholds * emigrationPressure * 1.15 * rng.range(0.7, 1.3))
      );
    }
  }

  const avgHouseholdSize =
    state.population.totalHouseholds > 0
      ? Math.max(3.8, Math.min(5.2, state.population.totalPopulation / state.population.totalHouseholds))
      : 4.6;

  const immigrantPopulation = Math.round(
    (immigrantFarmHouseholds + immigrantNonFarmHouseholds) * 4.5
  );
  const emigrantPopulation = Math.round(
    (emigrantFarmHouseholds + emigrantNonFarmHouseholds) * avgHouseholdSize
  );

  return {
    immigrantFarmHouseholds,
    immigrantNonFarmHouseholds,
    immigrantPopulation,
    emigrantFarmHouseholds,
    emigrantNonFarmHouseholds,
    emigrantPopulation,
  };
}

