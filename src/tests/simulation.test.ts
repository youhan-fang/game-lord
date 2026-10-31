import { describe, expect, it } from 'vitest';
import {
  acquireRegionExpansion,
  resolvePendingDecision,
  simulateMonth,
  simulateMultipleMonths,
  startBuildingConstruction,
} from '../game/simulation/simulation';
import { SeededRandom } from '../game/simulation/rng';
import {
  createInitialGameState,
  generateDevelopmentExplanation,
} from '../game/world/progression';
import { BuildingId, GameState } from '../game/world/worldState';

describe('Medieval Lordship Economic & Demographic Simulation Suite', () => {
  it('verifies initial 900 AD state matches specification', () => {
    const state = createInitialGameState(12345);
    expect(state.gameDate.year).toBe(900);
    expect(state.population.totalHouseholds).toBe(10);
    expect(state.population.totalPopulation).toBe(50);
    expect(state.population.farmHouseholds).toBe(10);
    expect(state.population.nonFarmHouseholds).toBe(0);
    expect(state.agriculture.controlledLandHa).toBe(250);
    expect(state.agriculture.cultivatedLandHa).toBe(45);
    expect(state.agriculture.arablePotentialHa).toBe(90);
    expect(state.agriculture.foodStockTons).toBe(8);
    expect(state.finance.treasury).toBe(40);
    expect(state.economy.security).toBe(70);
    expect(state.economy.commercialProsperity).toBe(5);
    expect(state.finance.annualIncome).toBeCloseTo(9.5, 1);
    expect(state.finance.annualBalance).toBeCloseTo(1.8, 1);
  });

  it('guarantees strict determinism for identical seed and elapsed time', () => {
    const state1 = createInitialGameState(777888);
    const state2 = createInitialGameState(777888);

    const res1 = simulateMultipleMonths(state1, 12 * 50); // 50 years
    const res2 = simulateMultipleMonths(state2, 12 * 50);

    expect(res1.nextState.population.totalPopulation).toBe(
      res2.nextState.population.totalPopulation
    );
    expect(res1.nextState.population.totalHouseholds).toBe(
      res2.nextState.population.totalHouseholds
    );
    expect(res1.nextState.finance.treasury).toBe(res2.nextState.finance.treasury);
    expect(res1.nextState.agriculture.cultivatedLandHa).toBe(
      res2.nextState.agriculture.cultivatedLandHa
    );
    expect(res1.nextState.randomSeed).toBe(res2.nextState.randomSeed);
  });

  it('Scenario A: Hands-off 100 years simulation runs autonomously and plateaus near initial land carrying capacity', () => {
    const initial = createInitialGameState(900100);
    const { nextState, offlineReport } = simulateMultipleMonths(
      initial,
      12 * 100,
      100 * 4 * 3600
    );

    expect(nextState.gameDate.year).toBe(1000);
    // Should grow from 10 households to the carrying capacity of 90ha arable land (~24-45 households)
    expect(nextState.population.totalHouseholds).toBeGreaterThan(18);
    expect(nextState.population.totalHouseholds).toBeLessThan(85);
    // Peasants should have autonomously reclaimed most of the 90ha potential arable land
    expect(nextState.agriculture.cultivatedLandHa).toBeGreaterThan(60);
    expect(nextState.agriculture.cultivatedLandHa).toBeLessThanOrEqual(90);
    // Dynasty should have progressed through multiple generations
    expect(nextState.dynasty.generation).toBeGreaterThanOrEqual(2);
    // Invariants check
    expect(nextState.population.totalPopulation).toBeGreaterThan(0);
    expect(nextState.agriculture.foodStockTons).toBeGreaterThanOrEqual(0);
    expect(offlineReport.yearsSimulated).toBe(100);
  });

  it('Scenario B & C: Policy comparison (Low Rent + Encourage Reclamation vs High Rent)', () => {
    const stateLow = createInitialGameState(424242);
    stateLow.policies.rentPolicy = 'low';
    stateLow.policies.landPolicy = 'encourage_reclamation';

    const stateHigh = createInitialGameState(424242);
    stateHigh.policies.rentPolicy = 'high';
    stateHigh.policies.landPolicy = 'maintain';

    // Simulate 15 years
    const resLow15 = simulateMultipleMonths(stateLow, 12 * 15).nextState;
    const resHigh15 = simulateMultipleMonths(stateHigh, 12 * 15).nextState;

    // Low rent + encourage reclamation yields faster land reclamation, higher peasant savings, and more households
    expect(resLow15.agriculture.cultivatedLandHa).toBeGreaterThan(
      resHigh15.agriculture.cultivatedLandHa
    );
    expect(resLow15.population.totalHouseholds).toBeGreaterThanOrEqual(
      resHigh15.population.totalHouseholds
    );
    expect(resLow15.population.farmHouseholdSavings).toBeGreaterThan(
      resHigh15.population.farmHouseholdSavings
    );

    // Meanwhile, High Rent accumulated more Lord treasury in the short term
    expect(resHigh15.finance.treasury).toBeGreaterThan(resLow15.finance.treasury);
  });

  it('Scenario D: Public Investments (Watermill, Bridge, Marketplace) drive commerce and non-farm growth', () => {
    let state = createInitialGameState(555666);
    state.finance.treasury = 300; // Give sufficient starting treasury to test public infrastructure effects

    // Simulate 10 years so population reaches ~20+
    state = simulateMultipleMonths(state, 12 * 10).nextState;

    // Build watermill and bridge
    state = startBuildingConstruction(state, 'watermill').nextState;
    state = startBuildingConstruction(state, 'river_bridge').nextState;
    state = simulateMultipleMonths(state, 12 * 10).nextState;

    expect(state.buildings.find((b) => b.id === 'watermill')?.built).toBe(true);
    expect(state.buildings.find((b) => b.id === 'river_bridge')?.built).toBe(true);
    expect(state.finance.incomeBreakdown.millIncome).toBeGreaterThan(0);

    // Build marketplace once households >= 28
    if (state.population.totalHouseholds < 28) {
      state = simulateMultipleMonths(state, 12 * 10).nextState;
    }
    const mktRes = startBuildingConstruction(state, 'marketplace');
    expect(mktRes.success).toBe(true);
    state = simulateMultipleMonths(mktRes.nextState, 12 * 25).nextState;

    expect(state.economy.commercialProsperity).toBeGreaterThan(15);
    expect(state.population.nonFarmHouseholds).toBeGreaterThan(5);
    expect(state.finance.incomeBreakdown.marketFees).toBeGreaterThan(0);
    // Visual anchors for watermill, bridge, and market should now be visible and upgraded
    expect(state.map.anchors.find((a) => a.id === 'watermill')?.visible).toBe(true);
    expect(state.map.anchors.find((a) => a.id === 'bridge')?.level).toBeGreaterThanOrEqual(1);
    expect(state.map.anchors.find((a) => a.id === 'market')?.visible).toBe(true);
  });

  it('Scenario E & F: Long-term governance and territory expansion reaches 1000+ households within 150-260 years', () => {
    let state: GameState = createInitialGameState(999111);
    state.policies.rentPolicy = 'low';
    state.policies.landPolicy = 'encourage_reclamation';
    state.policies.tradePolicy = 'free_trade';

    const buildOrder: BuildingId[] = [
      'watermill',
      'patrol_guard',
      'river_bridge',
      'field_improvement',
      'wooden_palisade',
      'marketplace',
      'granary_expansion',
      'parish_church',
      'paved_highroad',
      'artisan_quarter',
      'stone_wall',
      'stone_keep',
    ];

    const rng = new SeededRandom(state.randomSeed);

    for (let yearIdx = 0; yearIdx < 240; yearIdx++) {
      if (state.population.totalHouseholds >= 45 && state.policies.rentPolicy === 'low') {
        state.policies.rentPolicy = 'normal';
      }
      if (state.population.totalHouseholds >= 180) {
        state.policies.securityBudget = 'high';
        state.policies.maintenanceBudget = 'high';
      }

      for (const dec of [...state.pendingDecisions]) {
        if (state.finance.treasury >= dec.costGold + 10) {
          state = resolvePendingDecision(state, dec.id, true);
        }
      }

      for (const reg of state.regions) {
        if (!reg.unlocked && state.finance.treasury >= reg.costGold + 8) {
          const expRes = acquireRegionExpansion(state, reg.id);
          if (expRes.success) {
            state = expRes.nextState;
          }
        }
      }

      for (const bId of buildOrder) {
        const b = state.buildings.find((item) => item.id === bId);
        if (b && !b.built && !b.underConstruction) {
          const bRes = startBuildingConstruction(state, bId);
          if (bRes.success) {
            state = bRes.nextState;
          }
        }
      }

      for (let m = 0; m < 12; m++) {
        state = simulateMonth(state, rng).nextState;
      }

      if (state.population.totalHouseholds >= 1000) {
        break;
      }
    }

    expect(state.population.totalHouseholds).toBeGreaterThanOrEqual(1000);
    expect(state.milestone1000Reached).toBe(true);
    expect(state.map.stage).toBe('fortified_city');
    expect(state.agriculture.controlledLandHa).toBeGreaterThan(1000);
    expect(state.population.nonFarmHouseholds).toBeGreaterThan(250);

    // Verify explainable economy diagnostics work cleanly at 1000+ households
    const popDiag = generateDevelopmentExplanation(state, 'population');
    const foodDiag = generateDevelopmentExplanation(state, 'food');
    const commDiag = generateDevelopmentExplanation(state, 'commerce');
    expect(popDiag.positiveFactors.length).toBeGreaterThan(0);
    expect(foodDiag.positiveFactors.length).toBeGreaterThan(0);
    expect(commDiag.positiveFactors.length).toBeGreaterThan(0);
  });
});
