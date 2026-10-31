import { GameState } from '../world/worldState';
import { getMaintenanceEfficiency, hasBuilding } from './agriculture';
import { SIMULATION_PARAMETERS } from './parameters';

export interface EconomyUpdateResult {
  security: number;
  tradeAccess: number;
  commercialActivity: number;
  commercialProsperity: number;
  foodImportCapacityTons: number;
  foodImportedTons: number;
  foodExportedTons: number;
  workshopsCount: number;
  merchantsCount: number;
  farmNetSavingsDelta: number;
  nonFarmNetSavingsDelta: number;
  prestige: number;
}

/**
 * Computes annual commercial metrics, food trade (imports/exports),
 * and private household savings accumulation for both farm and non-farm sectors.
 */
export function calculateAnnualEconomyAndPrivateWealth(
  state: GameState,
  agResult: {
    netYieldTons: number;
    annualConsumptionTons: number;
    reclamationCostGold: number;
    toolInvestmentGold: number;
  }
): EconomyUpdateResult {
  const maintEff = getMaintenanceEfficiency(state);
  const secBudget = SIMULATION_PARAMETERS.policies.budget.security[state.policies.securityBudget];
  const tradePolicy = SIMULATION_PARAMETERS.policies.trade[state.policies.tradePolicy];
  const rentPolicy = SIMULATION_PARAMETERS.policies.rent[state.policies.rentPolicy];
  const landPolicy = SIMULATION_PARAMETERS.policies.land[state.policies.landPolicy];

  // 1. Security calculation
  let targetSecurity = 64 + secBudget.securityTargetDelta;
  if (hasBuilding(state, 'patrol_guard')) targetSecurity += 14 * maintEff;
  if (hasBuilding(state, 'wooden_palisade')) targetSecurity += 12 * maintEff;
  if (hasBuilding(state, 'stone_wall')) targetSecurity += 18 * maintEff;
  if (hasBuilding(state, 'stone_keep')) targetSecurity += 10 * maintEff;
  if (state.dynasty.currentLord.trait.id === 'vigilant') targetSecurity += 12;
  if (state.dynasty.currentLord.trait.id === 'stern') targetSecurity += 8;

  // Urban crowding slightly reduces base security unless patrolled/walled
  const crowdingPenalty = Math.min(24, Math.floor(state.population.totalHouseholds / 45));
  targetSecurity -= crowdingPenalty;

  // Fiscal deficit penalty
  if (state.finance.consecutiveDeficitYears > 0) {
    targetSecurity -= Math.min(25, state.finance.consecutiveDeficitYears * 5);
  }

  targetSecurity = Math.max(15, Math.min(100, targetSecurity));
  const security = Math.round(state.economy.security * 0.55 + targetSecurity * 0.45);

  // 2. Trade Access calculation
  let tradeAccess: number = SIMULATION_PARAMETERS.commerce.baseTradeAccess;
  if (hasBuilding(state, 'river_bridge')) {
    tradeAccess += SIMULATION_PARAMETERS.commerce.bridgeTradeBonus * maintEff;
  }
  if (hasBuilding(state, 'marketplace')) {
    tradeAccess += SIMULATION_PARAMETERS.commerce.marketplaceTradeBonus * maintEff;
  }
  if (hasBuilding(state, 'paved_highroad')) {
    tradeAccess += SIMULATION_PARAMETERS.commerce.highroadTradeBonus * maintEff;
  }
  if (hasBuilding(state, 'artisan_quarter')) {
    tradeAccess += 14 * maintEff;
  }
  if (state.economy.grantedMarketCharter) {
    tradeAccess += SIMULATION_PARAMETERS.commerce.charterTradeBonus;
  }
  if (state.economy.grantedGuildCharter) {
    tradeAccess += 10;
  }
  // Regional river wharf bonus
  const hasWharf = state.regions.some((r) => r.id === 'lower_river_wharf' && r.unlocked);
  if (hasWharf) {
    tradeAccess += 15;
  }
  const hasRoyalBorough = state.regions.some((r) => r.id === 'royal_borough_charter' && r.unlocked);
  if (hasRoyalBorough) {
    tradeAccess += 18;
  }

  tradeAccess = tradeAccess * tradePolicy.tradeAttractionBonus;
  if (state.dynasty.currentLord.trait.id === 'merchant_minded') {
    tradeAccess *= 1.15;
  }
  tradeAccess = Number(Math.min(120, Math.max(5, tradeAccess)).toFixed(1));

  // 3. Food Import Capacity & Trade Execution
  // Only possible if bridge or marketplace is built, and limited by tradeAccess and private wealth
  const canImportFood = hasBuilding(state, 'river_bridge') || hasBuilding(state, 'marketplace');
  const foodImportCapacityTons = canImportFood
    ? Number(
        (
          tradeAccess *
          SIMULATION_PARAMETERS.commerce.maxFoodImportPerPointOfTradeAccessTons *
          (security / 80)
        ).toFixed(2)
      )
    : 0;

  const foodSurplusBeforeTrade = agResult.netYieldTons - agResult.annualConsumptionTons;
  const targetReserveTons = agResult.annualConsumptionTons * 0.85;
  const projectedStock = state.agriculture.foodStockTons + foodSurplusBeforeTrade;

  let foodImportedTons = 0;
  let foodExportedTons = 0;
  let foodImportCostGold = 0;
  let foodExportRevenueGold = 0;

  if (projectedStock < targetReserveTons && foodImportCapacityTons > 0) {
    const neededTons = targetReserveTons - projectedStock;
    // Paid primarily by non-farm commercial wealth and farm savings buffer
    const availablePrivateImportBudget =
      state.population.nonFarmHouseholdSavings * 0.45 +
      state.population.farmHouseholdSavings * 0.15 +
      state.population.nonFarmHouseholds * 0.55;
    const maxAffordableTons =
      availablePrivateImportBudget / SIMULATION_PARAMETERS.commerce.foodImportPriceGoldPerTon;

    foodImportedTons = Number(
      Math.max(0, Math.min(neededTons, foodImportCapacityTons, maxAffordableTons)).toFixed(2)
    );
    foodImportCostGold = Number(
      (foodImportedTons * SIMULATION_PARAMETERS.commerce.foodImportPriceGoldPerTon).toFixed(2)
    );
  } else if (projectedStock > agResult.annualConsumptionTons * 1.45) {
    // Surplus grain is sold to external merchants if trade routes exist
    const exportableSurplus = projectedStock - agResult.annualConsumptionTons * 1.35;
    const maxExportByRoute = tradeAccess * 0.65;
    foodExportedTons = Number(
      Math.max(0, Math.min(exportableSurplus * 0.55, maxExportByRoute)).toFixed(2)
    );
    foodExportRevenueGold = Number(
      (foodExportedTons * SIMULATION_PARAMETERS.agriculture.foodValueGoldPerTon * 0.85).toFixed(2)
    );
  }

  // 4. Commercial Activity & Prosperity
  const hasMarket = hasBuilding(state, 'marketplace');
  const hasArtisanQuarter = hasBuilding(state, 'artisan_quarter');
  const securityFactor = Math.max(0.3, Math.min(1.25, security / 75));
  const localDemandFactor = Math.sqrt(Math.max(10, state.population.totalHouseholds)) * 1.8;
  const nonFarmFactor = state.population.nonFarmHouseholds * (hasArtisanQuarter ? 1.85 : 1.35);
  const foodStabilityFactor =
    projectedStock + foodImportedTons >= agResult.annualConsumptionTons * 0.5 ? 1.0 : 0.65;

  const rawCommercialActivity =
    (localDemandFactor * 0.45 + nonFarmFactor * 0.85 + tradeAccess * (hasMarket ? 0.65 : 0.25)) *
    securityFactor *
    foodStabilityFactor;

  const commercialActivity = Number(Math.max(2, rawCommercialActivity).toFixed(1));

  // Map commercialActivity onto 0..100 Commercial Prosperity curve
  const targetProsperity = Math.min(
    100,
    Math.round((100 * commercialActivity) / (commercialActivity + 95))
  );
  const commercialProsperity = Math.max(
    2,
    Math.min(100, Math.round(state.economy.commercialProsperity * 0.5 + targetProsperity * 0.5))
  );

  // 5. Private Household Economy: Farm Sector
  // Farm gross income comes from agricultural net harvest value + domestic/export sales + pastoral/cottage output
  const harvestEconomicValueGold = agResult.netYieldTons * 0.45;
  const netSurplusTons = Math.max(0, agResult.netYieldTons - state.population.farmPopulation * 0.25);
  const domesticGrainSalesGold =
    Math.min(netSurplusTons, state.population.nonFarmPopulation * 0.25) *
    SIMULATION_PARAMETERS.agriculture.foodValueGoldPerTon *
    0.5;
  const pastoralAndCottageCraftGold = state.population.farmHouseholds * 0.68;
  const grossFarmIncomeGold =
    harvestEconomicValueGold +
    domesticGrainSalesGold +
    foodExportRevenueGold * 0.6 +
    pastoralAndCottageCraftGold;

  const farmRentPerHousehold =
    rentPolicy.farmRentPerHouseholdGold * landPolicy.rentDiscountFactor;
  const totalFarmRentGold = state.population.farmHouseholds * farmRentPerHousehold;
  const totalFarmLivingCostGold =
    state.population.farmHouseholds * SIMULATION_PARAMETERS.privateEconomy.livingCostPerHouseholdGold;

  const farmPrivateInvestmentGold =
    agResult.reclamationCostGold + agResult.toolInvestmentGold;

  const farmNetSavingsDelta = Number(
    (
      grossFarmIncomeGold -
      totalFarmLivingCostGold -
      totalFarmRentGold -
      farmPrivateInvestmentGold
    ).toFixed(2)
  );

  // 6. Private Household Economy: Non-Farm Sector (Artisans & Merchants)
  const artisanMultiplier =
    (hasMarket ? 1.22 : 0.9) *
    (hasArtisanQuarter ? 1.25 : 1.0) *
    (1 + tradeAccess / 180) *
    securityFactor;

  const grossNonFarmIncomeGold =
    state.population.nonFarmHouseholds *
    SIMULATION_PARAMETERS.privateEconomy.baseNonFarmIncomePerHouseholdGold *
    artisanMultiplier;

  const nonFarmTaxGold = grossNonFarmIncomeGold * rentPolicy.nonFarmTaxRate;
  const nonFarmLivingCostGold =
    state.population.nonFarmHouseholds *
    (SIMULATION_PARAMETERS.privateEconomy.livingCostPerHouseholdGold + 0.18);

  // Autonomous creation of workshops & merchant houses from non-farm private savings
  let workshopsCount = state.economy.workshopsCount;
  let workshopInvestmentGold = 0;
  const targetWorkshops = Math.floor(
    state.population.nonFarmHouseholds / 3.5 + (hasMarket ? 2 : 0) + (hasArtisanQuarter ? 6 : 0)
  );
  if (
    workshopsCount < targetWorkshops &&
    state.population.nonFarmHouseholdSavings >
      SIMULATION_PARAMETERS.privateEconomy.workshopCreationCostGold
  ) {
    const newWorkshops = Math.min(
      3,
      targetWorkshops - workshopsCount,
      Math.floor(
        (state.population.nonFarmHouseholdSavings * 0.35) /
          SIMULATION_PARAMETERS.privateEconomy.workshopCreationCostGold
      )
    );
    if (newWorkshops > 0) {
      workshopsCount += newWorkshops;
      workshopInvestmentGold =
        newWorkshops * SIMULATION_PARAMETERS.privateEconomy.workshopCreationCostGold;
    }
  } else if (state.population.nonFarmHouseholds >= 3 && workshopsCount === 0) {
    workshopsCount = 1;
  }

  const merchantsCount = Math.max(
    0,
    Math.floor(
      state.population.nonFarmHouseholds * 0.28 +
        (hasMarket ? 2 : 0) +
        (tradeAccess > 35 ? Math.floor(tradeAccess / 15) : 0)
    )
  );

  const nonFarmNetSavingsDelta = Number(
    (
      grossNonFarmIncomeGold -
      nonFarmLivingCostGold -
      nonFarmTaxGold -
      foodImportCostGold * 0.65 -
      workshopInvestmentGold
    ).toFixed(2)
  );

  // 7. Prestige calculation
  let prestige = 10 + Math.floor(state.population.totalHouseholds / 8);
  prestige += state.buildings.filter((b) => b.built).length * 6;
  if (hasBuilding(state, 'parish_church')) prestige += 18;
  if (hasBuilding(state, 'stone_wall')) prestige += 30;
  if (hasBuilding(state, 'stone_keep')) prestige += 50;
  prestige += state.regions.filter((r) => r.unlocked).length * 10;
  prestige += Math.floor(commercialProsperity / 4);

  return {
    security,
    tradeAccess,
    commercialActivity,
    commercialProsperity,
    foodImportCapacityTons,
    foodImportedTons,
    foodExportedTons,
    workshopsCount,
    merchantsCount,
    farmNetSavingsDelta,
    nonFarmNetSavingsDelta,
    prestige,
  };
}
