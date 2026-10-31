import { BUILDING_DEFINITIONS } from '../../data/buildings';
import { ExpenseBreakdown, FinanceState, GameState, IncomeBreakdown } from '../world/worldState';
import { getMaintenanceEfficiency, hasBuilding } from './agriculture';
import { SIMULATION_PARAMETERS } from './parameters';

/**
 * Calculates the Lord's annual income, expenses, and net fiscal balance.
 * Matches initial 900 AD reference values (Income: 9.5, Family: 4.0, Admin: 1.5, Defense: 2.0, Maint: 0.2, Balance: +1.8)
 * and scales organically with population, buildings, policies, and commerce.
 */
export function calculateAnnualFinance(state: GameState): {
  annualIncome: number;
  annualExpense: number;
  annualBalance: number;
  incomeBreakdown: IncomeBreakdown;
  expenseBreakdown: ExpenseBreakdown;
} {
  const maintEff = getMaintenanceEfficiency(state);
  const rentPol = SIMULATION_PARAMETERS.policies.rent[state.policies.rentPolicy];
  const landPol = SIMULATION_PARAMETERS.policies.land[state.policies.landPolicy];
  const tradePol = SIMULATION_PARAMETERS.policies.trade[state.policies.tradePolicy];
  const secBudget = SIMULATION_PARAMETERS.policies.budget.security[state.policies.securityBudget];
  const maintBudget =
    SIMULATION_PARAMETERS.policies.budget.maintenance[state.policies.maintenanceBudget];

  const lordTrait = state.dynasty.currentLord.trait.id;
  const sternBonus = lordTrait === 'stern' ? 1.12 : 1.0;
  const merchantBonus = lordTrait === 'merchant_minded' ? 1.15 : 1.0;
  const thriftyMod = lordTrait === 'thrifty' ? 0.8 : 1.0;

  // Weather impact on agricultural rent collection & demesne
  const harvestMod =
    state.agriculture.weatherFactor < 0.85
      ? 0.85
      : state.agriculture.weatherFactor > 1.1
        ? 1.06
        : 1.0;

  // 1. Rent & Tax Income (Initial: 10 farm households * 0.60 = 6.0 gold)
  const farmRentGold =
    state.population.farmHouseholds *
    rentPol.farmRentPerHouseholdGold *
    landPol.rentDiscountFactor *
    harvestMod *
    sternBonus;

  const hasArtisan = hasBuilding(state, 'artisan_quarter');
  const nonFarmTaxGold =
    state.population.nonFarmHouseholds *
    SIMULATION_PARAMETERS.privateEconomy.baseNonFarmIncomePerHouseholdGold *
    (hasArtisan ? 1.25 : 1.0) *
    rentPol.nonFarmTaxRate *
    sternBonus;

  const rentIncome = Number((farmRentGold + nonFarmTaxGold).toFixed(2));

  // 2. Lord's Demesne Income (Initial: 3.5 gold)
  const extraLandHa = Math.max(0, state.agriculture.controlledLandHa - 250);
  const keepBonus = hasBuilding(state, 'stone_keep') ? 1.35 : 1.0;
  const demesneIncome = Number(
    (
      (SIMULATION_PARAMETERS.finance.baseDemesneIncomeGold +
        extraLandHa * SIMULATION_PARAMETERS.finance.demesneScaleWithLandFactor) *
      harvestMod *
      keepBonus
    ).toFixed(2)
  );

  // 3. Watermill Income (Initial: 0)
  let millIncome = 0;
  if (hasBuilding(state, 'watermill')) {
    millIncome = Number(
      (
        (state.agriculture.lastGrossYieldTons * 0.11 + state.population.totalHouseholds * 0.08) *
        maintEff
      ).toFixed(2)
    );
  }

  // 4. Market Fees (Initial: 0)
  let marketFees = 0;
  if (hasBuilding(state, 'marketplace')) {
    marketFees = Number(
      (
        (state.economy.commercialActivity * 0.22 + state.population.nonFarmHouseholds * 0.24) *
        tradePol.tariffRateMultiplier *
        merchantBonus *
        maintEff
      ).toFixed(2)
    );
  }

  // 5. Trade Tariffs & Bridge Tolls (Initial: 0)
  let tradeTariffs = 0;
  if (hasBuilding(state, 'river_bridge') || hasBuilding(state, 'paved_highroad')) {
    const routeMultiplier =
      (hasBuilding(state, 'river_bridge') ? 0.14 : 0) +
      (hasBuilding(state, 'paved_highroad') ? 0.2 : 0);
    tradeTariffs = Number(
      (
        state.economy.tradeAccess *
        routeMultiplier *
        (1 + state.population.totalHouseholds / 180) *
        tradePol.tariffRateMultiplier *
        merchantBonus *
        maintEff
      ).toFixed(2)
    );
  }

  // 6. Forestry & Special Fief Revenue (Initial: 0 in 'maintain' mode on base 250ha, positive when woodland policy or expanded regions)
  let forestryAndSpecial = 0;
  const woodlandHa = Math.max(
    0,
    state.agriculture.controlledLandHa - state.agriculture.cultivatedLandHa
  );
  if (state.policies.landPolicy === 'protect_woodland') {
    forestryAndSpecial += (woodlandHa / 100) * landPol.forestryIncomePer100WoodlandHa;
  } else if (extraLandHa > 0) {
    forestryAndSpecial += (extraLandHa / 100) * landPol.forestryIncomePer100WoodlandHa;
  }
  const unlockedRegionsCount = state.regions.filter((r) => r.unlocked).length;
  if (unlockedRegionsCount > 0) {
    forestryAndSpecial += unlockedRegionsCount * 1.8;
  }
  forestryAndSpecial = Number(forestryAndSpecial.toFixed(2));

  const annualIncome = Number(
    (
      rentIncome +
      demesneIncome +
      millIncome +
      marketFees +
      tradeTariffs +
      forestryAndSpecial
    ).toFixed(2)
  );

  // EXPENSES
  const extraHouseholds = Math.max(0, state.population.totalHouseholds - 10);

  // 1. Family Upkeep (Initial: 4.0 gold)
  const familyUpkeep = Number(
    (
      (SIMULATION_PARAMETERS.finance.baseFamilyUpkeepGold +
        (extraHouseholds / 100) * SIMULATION_PARAMETERS.finance.familyUpkeepScalePer100Households) *
      thriftyMod
    ).toFixed(2)
  );

  // 2. Administrative Cost (Initial: 1.5 gold)
  const adminCost = Number(
    (
      SIMULATION_PARAMETERS.finance.baseAdminCostGold +
      (extraHouseholds / 100) * SIMULATION_PARAMETERS.finance.adminCostPer100Households +
      unlockedRegionsCount * 0.65
    ).toFixed(2)
  );

  // 3. Defense Cost (Initial: 2.0 gold)
  const defenseCost = Number(
    (
      (SIMULATION_PARAMETERS.finance.baseDefenseCostGold +
        (extraHouseholds / 100) * SIMULATION_PARAMETERS.finance.defenseCostPer100Households) *
      secBudget.costMultiplier
    ).toFixed(2)
  );

  // 4. Facility Maintenance Cost (Initial: 0.2 gold)
  let builtMaintenanceSum = SIMULATION_PARAMETERS.finance.baseMaintenanceCostGold;
  for (const b of state.buildings) {
    if (b.built) {
      builtMaintenanceSum += BUILDING_DEFINITIONS[b.id].maintenanceGoldPerYear;
    }
  }
  const thriftyMaintMod = lordTrait === 'thrifty' ? 0.9 : 1.0;
  const maintenanceCost = Number(
    (builtMaintenanceSum * maintBudget.costMultiplier * thriftyMaintMod).toFixed(2)
  );

  const annualExpense = Number(
    (familyUpkeep + adminCost + defenseCost + maintenanceCost).toFixed(2)
  );
  const annualBalance = Number((annualIncome - annualExpense).toFixed(2));

  return {
    annualIncome,
    annualExpense,
    annualBalance,
    incomeBreakdown: {
      rentIncome,
      demesneIncome,
      millIncome,
      marketFees,
      tradeTariffs,
      forestryAndSpecial,
    },
    expenseBreakdown: {
      familyUpkeep,
      adminCost,
      defenseCost,
      maintenanceCost,
      constructionCostThisYear: state.finance.expenseBreakdown.constructionCostThisYear,
    },
  };
}

