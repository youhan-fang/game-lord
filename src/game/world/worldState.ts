export type RentPolicy = 'low' | 'normal' | 'high';
export type LandPolicy = 'encourage_reclamation' | 'maintain' | 'protect_woodland';
export type TradePolicy = 'free_trade' | 'normal' | 'high_tariffs';
export type BudgetLevel = 'low' | 'normal' | 'high';

export type WeatherType = 'bumper' | 'normal' | 'poor' | 'harsh_winter';

export type LordTraitId = 'thrifty' | 'merchant_minded' | 'benevolent' | 'stern' | 'pioneer' | 'vigilant';

export interface LordTrait {
  id: LordTraitId;
  name: string;
  description: string;
}

export interface LordCharacter {
  name: string;
  age: number;
  trait: LordTrait;
  yearsRuled: number;
}

export interface HeirCharacter {
  name: string;
  age: number;
  trait: LordTrait;
  relation: string;
}

export interface PastLordRecord {
  name: string;
  generation: number;
  startYear: number;
  endYear: number;
  trait: LordTrait;
  peakHouseholds: number;
}

export interface DynastyState {
  familyName: string;
  generation: number;
  currentLord: LordCharacter;
  heir: HeirCharacter;
  pastLords: PastLordRecord[];
}

export interface GameDate {
  year: number;
  month: number; // 1 to 12
  totalMonths: number;
}

export interface TimeState {
  lastRealTimestamp: number;
  isPaused: boolean;
  speedMultiplier: number; // Default 1 (1 real hour = 3 game months)
  fractionalMonths: number;
}

export interface AnnualDiagnosticSnapshot {
  year: number;
  households: number;
  population: number;
  births: number;
  deaths: number;
  immigrants: number;
  emigrants: number;
  newHouseholds: number;
  foodSurplusTons: number;
  commercialProsperity: number;
  treasuryBalance: number;
}

export interface PopulationState {
  totalPopulation: number;
  totalHouseholds: number;
  farmHouseholds: number;
  farmPopulation: number;
  nonFarmHouseholds: number;
  nonFarmPopulation: number;
  farmHouseholdSavings: number; // Total private savings of farm sector (gold)
  nonFarmHouseholdSavings: number; // Total private savings of non-farm sector (gold)
  housingCapacity: number; // Dwellings built by residents
  annualBirths: number;
  annualDeaths: number;
  annualImmigrants: number;
  annualEmigrants: number;
  newHouseholdsFormed: number;
  history10Years: AnnualDiagnosticSnapshot[];
}

export interface AgricultureState {
  controlledLandHa: number;
  arablePotentialHa: number;
  cultivatedLandHa: number;
  sownAreaHa: number;
  fertility: number;
  weatherFactor: number;
  weatherType: WeatherType;
  techFactor: number;
  toolsLevel: number;
  foodStockTons: number;
  lastGrossYieldTons: number;
  lastSeedTons: number;
  lastLossTons: number;
  lastNetYieldTons: number;
  lastAnnualConsumptionTons: number;
  lastFoodImportedTons: number;
  lastFoodExportedTons: number;
  reclaimedThisYearHa: number;
}

export interface EconomyState {
  security: number; // 0 to 100
  commercialProsperity: number; // 0 to 100
  commercialActivity: number; // raw score
  tradeAccess: number; // 0 to 100
  foodImportCapacityTons: number;
  workshopsCount: number;
  merchantsCount: number;
  prestige: number;
  grantedMarketCharter: boolean;
  grantedGuildCharter: boolean;
}

export interface IncomeBreakdown {
  rentIncome: number;
  demesneIncome: number;
  millIncome: number;
  marketFees: number;
  tradeTariffs: number;
  forestryAndSpecial: number;
}

export interface ExpenseBreakdown {
  familyUpkeep: number;
  adminCost: number;
  defenseCost: number;
  maintenanceCost: number;
  constructionCostThisYear: number;
}

export interface FinanceState {
  treasury: number;
  annualIncome: number;
  annualExpense: number;
  annualBalance: number;
  incomeBreakdown: IncomeBreakdown;
  expenseBreakdown: ExpenseBreakdown;
  consecutiveDeficitYears: number;
}

export interface PolicyState {
  rentPolicy: RentPolicy;
  landPolicy: LandPolicy;
  tradePolicy: TradePolicy;
  securityBudget: BudgetLevel;
  maintenanceBudget: BudgetLevel;
}

export type BuildingId =
  | 'watermill'
  | 'river_bridge'
  | 'marketplace'
  | 'field_improvement'
  | 'patrol_guard'
  | 'wooden_palisade'
  | 'parish_church'
  | 'granary_expansion'
  | 'paved_highroad'
  | 'artisan_quarter'
  | 'stone_wall'
  | 'stone_keep';

export interface BuildingState {
  id: BuildingId;
  built: boolean;
  underConstruction: boolean;
  progressMonths: number;
  totalMonths: number;
  builtYear?: number;
  anchorId: string;
}

export interface RegionExpansion {
  id: string;
  name: string;
  description: string;
  landHa: number;
  arableHa: number;
  initialFarmHouseholds: number;
  costGold: number;
  requiredPrestige: number;
  requiredHouseholds: number;
  unlocked: boolean;
  unlockedYear?: number;
  anchorId: string;
}

export type AnchorType =
  | 'main_settlement'
  | 'manor_house'
  | 'market'
  | 'watermill'
  | 'bridge'
  | 'church'
  | 'east_village'
  | 'west_village'
  | 'river_hamlet'
  | 'farmland_a'
  | 'farmland_b'
  | 'farmland_c'
  | 'forest_edge'
  | 'fortification'
  | 'outer_suburb'
  | 'city_wall';

export interface DevelopmentAnchor {
  id: string;
  name: string;
  type: AnchorType;
  position: { x: number; y: number }; // Normalized 0..1000 map coordinates
  level: number;
  maxLevel: number;
  visible: boolean;
  description: string;
}

export type SettlementStage =
  | 'manor'
  | 'village'
  | 'township'
  | 'prosperous_town'
  | 'fortified_city';

export interface WorldMapState {
  stage: SettlementStage;
  anchors: DevelopmentAnchor[];
}

export type EventCategory =
  | 'harvest'
  | 'migration'
  | 'commerce'
  | 'construction'
  | 'dynasty'
  | 'security'
  | 'expansion'
  | 'milestone'
  | 'policy';

export interface GameEvent {
  id: string;
  year: number;
  month: number;
  title: string;
  description: string;
  category: EventCategory;
  important: boolean;
}

export interface PendingDecision {
  id: string;
  year: number;
  title: string;
  description: string;
  approveLabel: string;
  declineLabel: string;
  costGold: number;
  effectType: 'market_charter' | 'guild_charter' | 'refugee_settlement' | 'forest_assart';
}

export interface OfflineReportData {
  elapsedRealSeconds: number;
  monthsSimulated: number;
  yearsSimulated: number;
  startYear: number;
  endYear: number;
  oldHouseholds: number;
  newHouseholds: number;
  oldPopulation: number;
  newPopulation: number;
  oldTreasury: number;
  newTreasury: number;
  foodStatusText: string;
  commerceStatusText: string;
  highlightEvents: GameEvent[];
}

export interface GameState {
  version: number;
  randomSeed: number;
  gameDate: GameDate;
  time: TimeState;
  population: PopulationState;
  agriculture: AgricultureState;
  economy: EconomyState;
  finance: FinanceState;
  policies: PolicyState;
  buildings: BuildingState[];
  regions: RegionExpansion[];
  pendingDecisions: PendingDecision[];
  map: WorldMapState;
  dynasty: DynastyState;
  events: GameEvent[];
  milestone1000Reached: boolean;
  milestone1000Year: number | null;
}

export interface SimulationChanges {
  populationDelta: number;
  householdsDelta: number;
  treasuryDelta: number;
  foodDelta: number;
  cultivatedDelta: number;
  prosperityDelta: number;
}

export interface SimulationResult {
  nextState: GameState;
  events: GameEvent[];
  changes: SimulationChanges;
}

