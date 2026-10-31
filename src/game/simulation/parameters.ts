/**
 * Centralized Economic, Demographic, and Simulation Parameters
 * All balance numbers are managed here rather than hardcoded across components.
 */
export const SIMULATION_PARAMETERS = {
  // Time Configuration
  time: {
    // Default: 1 real hour (3600s) = 3 game months => 1200 real seconds per game month
    realSecondsPerGameMonth: 1200,
    maxOfflineYearsToSimulate: 300,
  },

  // Initial State (900 AD English Valley Manor)
  initial: {
    year: 900,
    month: 1,
    farmHouseholds: 10,
    nonFarmHouseholds: 0,
    population: 50,
    controlledLandHa: 250,
    arablePotentialHa: 90,
    cultivatedLandHa: 45,
    sownAreaHa: 30,
    foodStockTons: 8.0,
    treasuryGold: 40.0,
    security: 70,
    commercialProsperity: 5,
    farmHouseholdSavings: 14.0,
    nonFarmHouseholdSavings: 0,
    housingCapacity: 13,
  },

  // Agriculture Parameters
  agriculture: {
    // Each farm household can cultivate up to ~4.5 ha effectively (with fallow rotation, ~3.0-3.4 ha sown per household)
    cultivableHaPerHousehold: 4.6,
    // Fraction of cultivated land sown each year (two-field / three-field rotation ~ 0.667 to 0.76)
    baseSownRatio: 0.667,
    improvedSownRatio: 0.78, // With field improvement project
    // Base yield per sown hectare (tons) -> 30 ha * 0.8 = 24.0 tons initially
    baseYieldPerHaTons: 0.8,
    // Seed reserve ratio of gross yield (~22.08% -> ~5.3 tons out of 24 tons)
    seedRatio: 0.2208,
    // Harvest and storage loss ratio (~7.92% -> ~1.9 tons out of 24 tons; reduced by watermill & granary)
    baseLossRatio: 0.0792,
    watermillLossReduction: 0.022,
    granaryLossReduction: 0.02,
    // Annual food consumption per person (tons) -> 50 people * 0.25 = 12.5 tons
    foodPerPersonPerYearTons: 0.25,
    // Autonomous land reclamation by peasants
    baseReclamationRateHaPerHousehold: 0.16,
    reclamationCostGoldPerHa: 0.75,
    minSecurityForReclamation: 42,
    // Weather modifiers
    weatherModifiers: {
      bumper: 1.2,
      normal: 1.0,
      poor: 0.78,
      harsh_winter: 0.72,
    },
    weatherProbabilities: {
      bumper: 0.22,
      normal: 0.58,
      poor: 0.14,
      harsh_winter: 0.06,
    },
    // Food market value per ton in gold equivalent
    foodValueGoldPerTon: 1.15,
    maxStorageMultiplierOfAnnualNeed: 4.2,
  },

  // Population & Household Dynamics
  population: {
    targetPersonsPerHousehold: 4.8,
    minPersonsForNewHousehold: 5.15,
    maxPersonsPerHouseholdBeforeSplit: 5.7,
    // Natural birth and death rates (annual per person)
    baseBirthRate: 0.036,
    baseDeathRate: 0.023,
    starvationDeathRateMax: 0.065,
    epidemicDeathRate: 0.028,
    // Household formation private cost (building cottage + basic hearth)
    newHouseholdPrivateCostGold: 1.35,
    // Migration parameters
    baseMaxImmigrantHouseholdsPerYear: 14,
    immigrationLandWeight: 0.35,
    immigrationCommerceWeight: 0.4,
    immigrationSecurityWeight: 0.25,
    emigrationStarvationRate: 0.08,
    emigrationHighRentRate: 0.025,
    emigrationLowSecurityRate: 0.035,
  },

  // Private Household Economy & Autonomous Investment
  privateEconomy: {
    // Living cost per household per year (non-food essentials, clothing, tools upkeep)
    livingCostPerHouseholdGold: 0.42,
    // Base artisan / merchant annual gross value per non-farm household
    baseNonFarmIncomePerHouseholdGold: 1.95,
    // Autonomous tool investment threshold & bonus
    toolUpgradeSavingsThresholdPerHousehold: 2.2,
    maxToolsLevel: 1.32,
    // Autonomous workshop creation cost
    workshopCreationCostGold: 6.5,
  },

  // Rent, Land & Trade Policies
  policies: {
    rent: {
      low: {
        farmRentPerHouseholdGold: 0.38,
        nonFarmTaxRate: 0.08,
        migrationBonus: 0.28,
        reclamationModifier: 1.25,
        savingsRetentionBonus: 1.2,
      },
      normal: {
        farmRentPerHouseholdGold: 0.6, // 10 households * 0.6 = 6.0 gold initial rent
        nonFarmTaxRate: 0.13,
        migrationBonus: 0.0,
        reclamationModifier: 1.0,
        savingsRetentionBonus: 1.0,
      },
      high: {
        farmRentPerHouseholdGold: 0.88,
        nonFarmTaxRate: 0.2,
        migrationBonus: -0.25,
        reclamationModifier: 0.68,
        savingsRetentionBonus: 0.72,
      },
    },
    land: {
      encourage_reclamation: {
        reclamationSpeedMultiplier: 1.55,
        rentDiscountFactor: 0.86,
        forestryIncomePer100WoodlandHa: 0.15,
      },
      maintain: {
        reclamationSpeedMultiplier: 1.0,
        rentDiscountFactor: 1.0,
        forestryIncomePer100WoodlandHa: 0.35,
      },
      protect_woodland: {
        reclamationSpeedMultiplier: 0.38,
        rentDiscountFactor: 1.02,
        forestryIncomePer100WoodlandHa: 0.95,
      },
    },
    trade: {
      free_trade: {
        tariffRateMultiplier: 0.68,
        tradeAttractionBonus: 1.32,
        merchantMigrationBonus: 1.35,
      },
      normal: {
        tariffRateMultiplier: 1.0,
        tradeAttractionBonus: 1.0,
        merchantMigrationBonus: 1.0,
      },
      high_tariffs: {
        tariffRateMultiplier: 1.42,
        tradeAttractionBonus: 0.74,
        merchantMigrationBonus: 0.68,
      },
    },
    budget: {
      security: {
        low: { costMultiplier: 0.6, securityTargetDelta: -12 },
        normal: { costMultiplier: 1.0, securityTargetDelta: 0 },
        high: { costMultiplier: 1.55, securityTargetDelta: 14 },
      },
      maintenance: {
        low: { costMultiplier: 0.6, buildingEfficiency: 0.78 },
        normal: { costMultiplier: 1.0, buildingEfficiency: 1.0 },
        high: { costMultiplier: 1.45, buildingEfficiency: 1.18 },
      },
    },
  },

  // Lord Finance (Initial: Income 9.5 = 6.0 rent + 3.5 demesne; Expense 7.7 = 4.0 family + 1.5 admin + 2.0 defense + 0.2 maint; Balance +1.8)
  finance: {
    baseDemesneIncomeGold: 3.5,
    demesneScaleWithLandFactor: 0.006,
    baseFamilyUpkeepGold: 4.0,
    familyUpkeepScalePer100Households: 1.1,
    baseAdminCostGold: 1.5,
    adminCostPer100Households: 1.25,
    baseDefenseCostGold: 2.0,
    defenseCostPer100Households: 0.95,
    baseMaintenanceCostGold: 0.2,
  },

  // Commercial & Urban Growth Parameters
  commerce: {
    baseTradeAccess: 12,
    bridgeTradeBonus: 16,
    marketplaceTradeBonus: 22,
    highroadTradeBonus: 20,
    charterTradeBonus: 12,
    maxFoodImportPerPointOfTradeAccessTons: 1.65,
    foodImportPriceGoldPerTon: 1.05,
  },
} as const;

