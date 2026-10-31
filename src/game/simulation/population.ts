import { GameState } from '../world/worldState';
import { getMaintenanceEfficiency, hasBuilding } from './agriculture';
import { calculateAnnualMigration } from './migration';
import { SIMULATION_PARAMETERS } from './parameters';
import { SeededRandom } from './rng';

export interface PopulationUpdateResult {
  totalPopulation: number;
  totalHouseholds: number;
  farmHouseholds: number;
  farmPopulation: number;
  nonFarmHouseholds: number;
  nonFarmPopulation: number;
  farmHouseholdSavings: number;
  nonFarmHouseholdSavings: number;
  housingCapacity: number;
  annualBirths: number;
  annualDeaths: number;
  annualImmigrants: number;
  annualEmigrants: number;
  newHouseholdsFormed: number;
}

/**
 * Computes annual natural population growth (births & deaths), migration,
 * and autonomous household formation & cottage building.
 */
export function calculateAnnualPopulation(
  state: GameState,
  projectedFoodStockTons: number,
  annualConsumptionTons: number,
  farmSavingsAfterIncome: number,
  nonFarmSavingsAfterIncome: number,
  rng: SeededRandom
): PopulationUpdateResult {
  const params = SIMULATION_PARAMETERS.population;
  const maintEff = getMaintenanceEfficiency(state);

  // 1. Food Sufficiency & Living Conditions
  const foodRatio =
    annualConsumptionTons > 0 ? projectedFoodStockTons / annualConsumptionTons : 1.0;

  const avgHouseholdSavings =
    state.population.totalHouseholds > 0
      ? (farmSavingsAfterIncome + nonFarmSavingsAfterIncome) / state.population.totalHouseholds
      : 1.0;

  // 2. Birth Rate
  let birthRate = params.baseBirthRate;
  if (foodRatio >= 0.85) {
    birthRate += 0.005;
  } else if (foodRatio < 0.25) {
    birthRate *= 0.55;
  } else if (foodRatio < 0.5) {
    birthRate *= 0.8;
  }

  if (avgHouseholdSavings > 1.8) {
    birthRate += 0.003;
  } else if (avgHouseholdSavings < 0.4) {
    birthRate -= 0.004;
  }

  if (state.dynasty.currentLord.trait.id === 'benevolent') {
    birthRate += 0.0025;
  }

  // Soft carrying capacity dampening when land & commerce are both saturated
  const maxFarmHouseholdsByLand =
    state.agriculture.arablePotentialHa /
    (SIMULATION_PARAMETERS.agriculture.cultivableHaPerHousehold * 0.68);
  const landSaturation = state.population.farmHouseholds / Math.max(1, maxFarmHouseholdsByLand);
  if (landSaturation > 0.95 && state.economy.commercialProsperity < 25) {
    birthRate *= 0.72;
  }

  // 3. Death Rate
  let deathRate = params.baseDeathRate;
  if (hasBuilding(state, 'parish_church')) {
    deathRate -= 0.0035 * maintEff;
  }
  if (state.policies.maintenanceBudget === 'high') {
    deathRate -= 0.0015;
  } else if (state.policies.maintenanceBudget === 'low') {
    deathRate += 0.002;
  }

  // Starvation mortality if food stock is critically depleted
  if (projectedFoodStockTons <= 0.05) {
    const deficitSeverity = Math.min(
      1.0,
      Math.max(0.1, (annualConsumptionTons * 0.35 - projectedFoodStockTons) / Math.max(1, annualConsumptionTons))
    );
    deathRate += params.starvationDeathRateMax * deficitSeverity;
  } else if (foodRatio < 0.2) {
    deathRate += 0.012;
  }

  if (state.agriculture.weatherType === 'harsh_winter') {
    deathRate += 0.005;
  }

  const annualBirths = Math.max(
    0,
    Math.round(state.population.totalPopulation * birthRate * rng.range(0.9, 1.1))
  );
  const annualDeaths = Math.max(
    0,
    Math.round(state.population.totalPopulation * deathRate * rng.range(0.9, 1.1))
  );

  // 4. Migration (Households & People)
  const migration = calculateAnnualMigration(
    state,
    projectedFoodStockTons,
    annualConsumptionTons,
    rng
  );

  // 5. Distribute natural growth & migration across Farm and Non-Farm populations
  const farmPopShare =
    state.population.totalPopulation > 0
      ? state.population.farmPopulation / state.population.totalPopulation
      : 1.0;

  const farmBirths = Math.round(annualBirths * farmPopShare);
  const nonFarmBirths = annualBirths - farmBirths;

  const farmDeaths = Math.round(annualDeaths * farmPopShare);
  const nonFarmDeaths = annualDeaths - farmDeaths;

  const farmImmPop = Math.round(migration.immigrantFarmHouseholds * 4.5);
  const nonFarmImmPop = Math.max(0, migration.immigrantPopulation - farmImmPop);

  const farmEmigPop = Math.round(migration.emigrantFarmHouseholds * 4.5);
  const nonFarmEmigPop = Math.max(0, migration.emigrantPopulation - farmEmigPop);

  let nextFarmPop = Math.max(
    12,
    state.population.farmPopulation + farmBirths - farmDeaths + farmImmPop - farmEmigPop
  );
  let nextNonFarmPop = Math.max(
    0,
    state.population.nonFarmPopulation +
      nonFarmBirths -
      nonFarmDeaths +
      nonFarmImmPop -
      nonFarmEmigPop
  );

  let nextFarmHouseholds = Math.max(
    3,
    state.population.farmHouseholds +
      migration.immigrantFarmHouseholds -
      migration.emigrantFarmHouseholds
  );
  let nextNonFarmHouseholds = Math.max(
    0,
    state.population.nonFarmHouseholds +
      migration.immigrantNonFarmHouseholds -
      migration.emigrantNonFarmHouseholds
  );

  if (nextNonFarmHouseholds === 0) {
    nextNonFarmPop = 0;
  } else if (nextNonFarmPop < nextNonFarmHouseholds * 2) {
    nextNonFarmPop = nextNonFarmHouseholds * 3;
  }

  let nextFarmSavings = Math.max(0, farmSavingsAfterIncome);
  let nextNonFarmSavings = Math.max(0, nonFarmSavingsAfterIncome);

  // Incoming migrants bring modest starter savings
  nextFarmSavings += migration.immigrantFarmHouseholds * 0.9;
  nextNonFarmSavings += migration.immigrantNonFarmHouseholds * 1.4;

  // 6. Autonomous Household Formation (Splitting grown families into new households & building cottages)
  // Distinguished from births: requires household size > minPersonsForNewHousehold, private savings, and economic opportunity
  let newHouseholdsFormed = 0;
  const totalPopAfterMigration = nextFarmPop + nextNonFarmPop;
  const currentTotalHouseholds = nextFarmHouseholds + nextNonFarmHouseholds;
  const currentAvgSize =
    currentTotalHouseholds > 0 ? totalPopAfterMigration / currentTotalHouseholds : 4.8;

  if (currentAvgSize > params.minPersonsForNewHousehold && foodRatio >= 0.25) {
    const excessPeople =
      totalPopAfterMigration - currentTotalHouseholds * params.targetPersonsPerHousehold;
    const desiredNewHouseholds = Math.max(0, Math.floor(excessPeople / 4.2));

    const totalPrivateSavings = nextFarmSavings + nextNonFarmSavings;
    const maxAffordableBySavings = Math.floor(
      (totalPrivateSavings * 0.38) / params.newHouseholdPrivateCostGold
    );

    const openLandSlots = Math.max(0, Math.floor(maxFarmHouseholdsByLand - nextFarmHouseholds));
    const hasCommercialOpportunity =
      hasBuilding(state, 'marketplace') ||
      hasBuilding(state, 'river_bridge') ||
      state.economy.tradeAccess >= 18;
    const openCommercialSlots = hasCommercialOpportunity
      ? Math.max(
          0,
          Math.floor(state.economy.tradeAccess * 2.2 + state.economy.commercialProsperity * 4 - nextNonFarmHouseholds)
        )
      : 0;

    const totalEconomicSlots = openLandSlots + openCommercialSlots;
    newHouseholdsFormed = Math.min(
      desiredNewHouseholds,
      maxAffordableBySavings,
      totalEconomicSlots,
      Math.max(3, Math.ceil(currentTotalHouseholds * 0.08))
    );

    if (newHouseholdsFormed > 0) {
      const totalHousingCost = newHouseholdsFormed * params.newHouseholdPrivateCostGold;
      // Split new households between farm and non-farm based on where economic opportunity lies
      let newFarmH = Math.min(newHouseholdsFormed, openLandSlots);
      let newNonFarmH = newHouseholdsFormed - newFarmH;

      // If commercial prosperity is strong, some farm youths prefer artisan/merchant trade even if some land remains
      if (openCommercialSlots > 0 && state.economy.commercialProsperity >= 22 && newFarmH > 1) {
        const shiftToTown = Math.min(
          newFarmH,
          openCommercialSlots - newNonFarmH,
          Math.ceil(newHouseholdsFormed * 0.45)
        );
        if (shiftToTown > 0) {
          newFarmH -= shiftToTown;
          newNonFarmH += shiftToTown;
        }
      }

      nextFarmHouseholds += newFarmH;
      nextNonFarmHouseholds += newNonFarmH;

      // Transfer people when rural youth form urban non-farm households
      if (newNonFarmH > 0 && nextFarmPop > nextFarmHouseholds * 4.0) {
        const transferredPeople = Math.min(
          Math.round(newNonFarmH * 4.2),
          Math.max(0, nextFarmPop - nextFarmHouseholds * 3.8)
        );
        nextFarmPop -= transferredPeople;
        nextNonFarmPop += transferredPeople;
      }

      // Deduct cottage construction cost from private savings
      const farmCostShare =
        totalPrivateSavings > 0 ? nextFarmSavings / totalPrivateSavings : 0.7;
      nextFarmSavings = Math.max(0, nextFarmSavings - totalHousingCost * farmCostShare);
      nextNonFarmSavings = Math.max(
        0,
        nextNonFarmSavings - totalHousingCost * (1 - farmCostShare)
      );
    }
  }

  // 7. Sanity guard: prevent household count and population from drifting into unrealistic ratios
  const finalTotalHouseholds = nextFarmHouseholds + nextNonFarmHouseholds;
  const minReasonablePop = Math.round(finalTotalHouseholds * 3.5);
  const maxReasonablePop = Math.round(finalTotalHouseholds * 6.4);
  let finalTotalPop = nextFarmPop + nextNonFarmPop;

  if (finalTotalPop < minReasonablePop) {
    const diff = minReasonablePop - finalTotalPop;
    nextFarmPop += diff;
    finalTotalPop = minReasonablePop;
  } else if (finalTotalPop > maxReasonablePop) {
    // If population per household gets very high (>6.4) and economic capacity exists, form emergency households
    const extraH = Math.min(
      Math.max(1, Math.floor((finalTotalPop - maxReasonablePop) / 4.8)),
      Math.max(0, Math.floor(maxFarmHouseholdsByLand - nextFarmHouseholds))
    );
    if (extraH > 0) {
      nextFarmHouseholds += extraH;
      newHouseholdsFormed += extraH;
    } else {
      const capDiff = finalTotalPop - maxReasonablePop;
      nextFarmPop = Math.max(12, nextFarmPop - capDiff);
      finalTotalPop = nextFarmPop + nextNonFarmPop;
    }
  }

  const totalHouseholds = nextFarmHouseholds + nextNonFarmHouseholds;
  const housingCapacity = Math.max(
    totalHouseholds + 2,
    state.population.housingCapacity +
      newHouseholdsFormed +
      migration.immigrantFarmHouseholds +
      migration.immigrantNonFarmHouseholds
  );

  return {
    totalPopulation: finalTotalPop,
    totalHouseholds,
    farmHouseholds: nextFarmHouseholds,
    farmPopulation: nextFarmPop,
    nonFarmHouseholds: nextNonFarmHouseholds,
    nonFarmPopulation: nextNonFarmPop,
    farmHouseholdSavings: Number(nextFarmSavings.toFixed(2)),
    nonFarmHouseholdSavings: Number(nextNonFarmSavings.toFixed(2)),
    housingCapacity,
    annualBirths,
    annualDeaths,
    annualImmigrants: migration.immigrantPopulation,
    annualEmigrants: migration.emigrantPopulation,
    newHouseholdsFormed,
  };
}

