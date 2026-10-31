import { create } from 'zustand';
import { calculateAnnualFinance } from '../game/simulation/finance';
import { SIMULATION_PARAMETERS } from '../game/simulation/parameters';
import { SeededRandom } from '../game/simulation/rng';
import {
  acquireRegionExpansion,
  resolvePendingDecision,
  simulateMonth,
  simulateMultipleMonths,
  startBuildingConstruction,
} from '../game/simulation/simulation';
import { createInitialGameState } from '../game/world/progression';
import {
  BudgetLevel,
  BuildingId,
  GameState,
  LandPolicy,
  OfflineReportData,
  RentPolicy,
  TradePolicy,
} from '../game/world/worldState';
import {
  clearSavedGame,
  loadGameState,
  saveGameState,
  validateAndMigrateState,
} from '../persistence/db';

export type NavTabId = 'domain' | 'finance' | 'policy' | 'construction' | 'chronicle' | null;
export type DiagnosticMetric = 'population' | 'food' | 'commerce' | 'finance' | null;

interface GameStore {
  gameState: GameState;
  isLoaded: boolean;
  activeTab: NavTabId;
  selectedAnchorId: string | null;
  diagnosticMetric: DiagnosticMetric;
  offlineReport: OfflineReportData | null;
  showMilestoneModal: boolean;
  milestoneDismissed: boolean;
  showDebugPanel: boolean;
  toastMessage: string | null;

  // Lifecycle & Time Actions
  initGame: () => Promise<void>;
  tickRealTime: (nowMs: number) => void;
  togglePause: () => void;
  setSpeedMultiplier: (multiplier: number) => void;

  // Player Governance Actions
  setRentPolicy: (policy: RentPolicy) => void;
  setLandPolicy: (policy: LandPolicy) => void;
  setTradePolicy: (policy: TradePolicy) => void;
  setSecurityBudget: (level: BudgetLevel) => void;
  setMaintenanceBudget: (level: BudgetLevel) => void;
  constructBuilding: (buildingId: BuildingId) => { success: boolean; reason?: string };
  expandRegion: (regionId: string) => { success: boolean; reason?: string };
  handleDecision: (decisionId: string, approved: boolean) => void;
  setFamilyName: (name: string) => void;

  // UI Navigation Actions
  setActiveTab: (tab: NavTabId) => void;
  setSelectedAnchorId: (anchorId: string | null) => void;
  setDiagnosticMetric: (metric: DiagnosticMetric) => void;
  dismissOfflineReport: () => void;
  dismissMilestoneModal: () => void;
  setShowDebugPanel: (show: boolean) => void;
  showToast: (msg: string) => void;

  // Debug & Testing Actions
  fastForwardYears: (years: number) => void;
  simulateOfflineLeave: (hoursAway: number) => void;
  loadScenarioHouseholds: (targetHouseholds: number) => void;
  resetGame: (customSeed?: number) => Promise<void>;
  exportSaveJson: () => string;
  importSaveJson: (jsonStr: string) => boolean;
}

function recalculateFinanceImmediately(state: GameState): GameState {
  const fin = calculateAnnualFinance(state);
  return {
    ...state,
    finance: {
      ...state.finance,
      annualIncome: fin.annualIncome,
      annualExpense: fin.annualExpense,
      annualBalance: fin.annualBalance,
      incomeBreakdown: fin.incomeBreakdown,
      expenseBreakdown: fin.expenseBreakdown,
    },
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialGameState(9000900),
  isLoaded: false,
  activeTab: null,
  selectedAnchorId: null,
  diagnosticMetric: null,
  offlineReport: null,
  showMilestoneModal: false,
  milestoneDismissed: false,
  showDebugPanel: false,
  toastMessage: null,

  showToast: (msg: string) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3200);
  },

  initGame: async () => {
    if (get().isLoaded) return;
    const saved = await loadGameState();
    const now = Date.now();

    if (!saved) {
      const fresh = createInitialGameState(9000900);
      fresh.time.lastRealTimestamp = now;
      await saveGameState(fresh);
      set({ gameState: fresh, isLoaded: true });
      return;
    }

    // Check offline elapsed time if not paused
    if (!saved.time.isPaused && saved.time.lastRealTimestamp > 0) {
      const elapsedSeconds = Math.max(0, (now - saved.time.lastRealTimestamp) / 1000);
      const totalExactMonths =
        saved.time.fractionalMonths +
        elapsedSeconds / SIMULATION_PARAMETERS.time.realSecondsPerGameMonth;
      const wholeMonthsToSimulate = Math.floor(totalExactMonths);
      const remainingFraction = totalExactMonths - wholeMonthsToSimulate;

      if (wholeMonthsToSimulate >= 1) {
        const { nextState, offlineReport } = simulateMultipleMonths(
          saved,
          wholeMonthsToSimulate,
          elapsedSeconds
        );
        nextState.time.lastRealTimestamp = now;
        nextState.time.fractionalMonths = remainingFraction;
        await saveGameState(nextState);

        set({
          gameState: nextState,
          isLoaded: true,
          // Show offline report if player was away for at least 2 game months (~40 mins)
          offlineReport: wholeMonthsToSimulate >= 2 ? offlineReport : null,
          showMilestoneModal:
            nextState.milestone1000Reached && !saved.milestone1000Reached,
        });
        return;
      }

      saved.time.lastRealTimestamp = now;
      saved.time.fractionalMonths = remainingFraction;
      await saveGameState(saved);
    } else {
      saved.time.lastRealTimestamp = now;
      await saveGameState(saved);
    }

    set({ gameState: saved, isLoaded: true });
  },

  tickRealTime: (nowMs: number) => {
    const { gameState, isLoaded, milestoneDismissed } = get();
    if (!isLoaded || gameState.time.isPaused) return;

    const elapsedSec = Math.max(0, (nowMs - gameState.time.lastRealTimestamp) / 1000);
    if (elapsedSec <= 0.05) return;

    const monthsAdded =
      (elapsedSec * gameState.time.speedMultiplier) /
      SIMULATION_PARAMETERS.time.realSecondsPerGameMonth;
    const totalMonthsAccum = gameState.time.fractionalMonths + monthsAdded;
    const wholeMonths = Math.floor(totalMonthsAccum);
    const remainder = totalMonthsAccum - wholeMonths;

    if (wholeMonths < 1) {
      set({
        gameState: {
          ...gameState,
          time: {
            ...gameState.time,
            lastRealTimestamp: nowMs,
            fractionalMonths: remainder,
          },
        },
      });
      return;
    }

    // Cap single tick catch-up to keep UI responsive
    const monthsToRun = Math.min(wholeMonths, 240);
    const rng = new SeededRandom(gameState.randomSeed);
    let next = gameState;
    for (let i = 0; i < monthsToRun; i++) {
      next = simulateMonth(next, rng).nextState;
    }

    next = {
      ...next,
      time: {
        ...next.time,
        lastRealTimestamp: nowMs,
        fractionalMonths: remainder,
      },
    };

    void saveGameState(next);

    const newlyReached1000 =
      next.milestone1000Reached && !gameState.milestone1000Reached && !milestoneDismissed;

    set({
      gameState: next,
      ...(newlyReached1000 ? { showMilestoneModal: true } : {}),
    });
  },

  togglePause: () => {
    const { gameState } = get();
    const nextPaused = !gameState.time.isPaused;
    const nextState: GameState = {
      ...gameState,
      time: {
        ...gameState.time,
        isPaused: nextPaused,
        lastRealTimestamp: Date.now(),
      },
    };
    void saveGameState(nextState);
    set({ gameState: nextState });
  },

  setSpeedMultiplier: (multiplier: number) => {
    const { gameState } = get();
    const nextState: GameState = {
      ...gameState,
      time: {
        ...gameState.time,
        speedMultiplier: multiplier,
        lastRealTimestamp: Date.now(),
      },
    };
    void saveGameState(nextState);
    set({ gameState: nextState });
  },

  setRentPolicy: (policy: RentPolicy) => {
    const { gameState, showToast } = get();
    const updated = recalculateFinanceImmediately({
      ...gameState,
      policies: {
        ...gameState.policies,
        rentPolicy: policy,
      },
    });
    void saveGameState(updated);
    set({ gameState: updated });
    const label = policy === 'low' ? '低地租' : policy === 'normal' ? '正常地租' : '高地租';
    showToast(`已颁布新地租政策：${label}`);
  },

  setLandPolicy: (policy: LandPolicy) => {
    const { gameState, showToast } = get();
    const updated = recalculateFinanceImmediately({
      ...gameState,
      policies: {
        ...gameState.policies,
        landPolicy: policy,
      },
    });
    void saveGameState(updated);
    set({ gameState: updated });
    const label =
      policy === 'encourage_reclamation'
        ? '鼓励开垦'
        : policy === 'maintain'
          ? '维持现状'
          : '保护林地';
    showToast(`已调整土地政策：${label}`);
  },

  setTradePolicy: (policy: TradePolicy) => {
    const { gameState, showToast } = get();
    const updated = recalculateFinanceImmediately({
      ...gameState,
      policies: {
        ...gameState.policies,
        tradePolicy: policy,
      },
    });
    void saveGameState(updated);
    set({ gameState: updated });
    const label =
      policy === 'free_trade'
        ? '鼓励自由贸易'
        : policy === 'normal'
          ? '正常贸易'
          : '提高市场收费';
    showToast(`已调整贸易政策：${label}`);
  },

  setSecurityBudget: (level: BudgetLevel) => {
    const { gameState, showToast } = get();
    const updated = recalculateFinanceImmediately({
      ...gameState,
      policies: {
        ...gameState.policies,
        securityBudget: level,
      },
    });
    void saveGameState(updated);
    set({ gameState: updated });
    showToast('已更新年度治安防卫预算');
  },

  setMaintenanceBudget: (level: BudgetLevel) => {
    const { gameState, showToast } = get();
    const updated = recalculateFinanceImmediately({
      ...gameState,
      policies: {
        ...gameState.policies,
        maintenanceBudget: level,
      },
    });
    void saveGameState(updated);
    set({ gameState: updated });
    showToast('已更新公共设施维护预算');
  },

  constructBuilding: (buildingId: BuildingId) => {
    const { gameState, showToast } = get();
    const res = startBuildingConstruction(gameState, buildingId);
    if (res.success) {
      void saveGameState(res.nextState);
      set({ gameState: res.nextState });
      showToast('工程已动工兴建！');
    } else if (res.reason) {
      showToast(res.reason);
    }
    return { success: res.success, reason: res.reason };
  },

  expandRegion: (regionId: string) => {
    const { gameState, showToast } = get();
    const res = acquireRegionExpansion(gameState, regionId);
    if (res.success) {
      void saveGameState(res.nextState);
      set({ gameState: res.nextState });
      showToast('新片区已正式并入领地版图！');
    } else if (res.reason) {
      showToast(res.reason);
    }
    return { success: res.success, reason: res.reason };
  },

  handleDecision: (decisionId: string, approved: boolean) => {
    const { gameState, showToast } = get();
    const nextState = resolvePendingDecision(gameState, decisionId, approved);
    void saveGameState(nextState);
    set({ gameState: nextState });
    showToast(approved ? '已批准该项领地政令' : '已搁置该项请愿');
  },

  setFamilyName: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { gameState, showToast } = get();
    const nextState: GameState = {
      ...gameState,
      dynasty: {
        ...gameState.dynasty,
        familyName: trimmed,
      },
    };
    void saveGameState(nextState);
    set({ gameState: nextState });
    showToast(`家族名号已更新为：${trimmed}`);
  },

  setActiveTab: (tab: NavTabId) => set({ activeTab: tab }),
  setSelectedAnchorId: (anchorId: string | null) => set({ selectedAnchorId: anchorId }),
  setDiagnosticMetric: (metric: DiagnosticMetric) => set({ diagnosticMetric: metric }),
  dismissOfflineReport: () => set({ offlineReport: null }),
  dismissMilestoneModal: () => set({ showMilestoneModal: false, milestoneDismissed: true }),
  setShowDebugPanel: (show: boolean) => set({ showDebugPanel: show }),

  fastForwardYears: (years: number) => {
    const { gameState, milestoneDismissed, showToast } = get();
    const months = Math.max(1, Math.round(years * 12));
    const { nextState } = simulateMultipleMonths(gameState, months);
    nextState.time.lastRealTimestamp = Date.now();
    void saveGameState(nextState);

    const newlyReached1000 =
      nextState.milestone1000Reached && !gameState.milestone1000Reached && !milestoneDismissed;

    set({
      gameState: nextState,
      ...(newlyReached1000 ? { showMilestoneModal: true } : {}),
    });
    showToast(`已推进 ${years} 年（当前公元 ${nextState.gameDate.year} 年）`);
  },

  simulateOfflineLeave: (hoursAway: number) => {
    const { gameState } = get();
    const elapsedSeconds = hoursAway * 3600;
    const months = Math.max(
      1,
      Math.round(elapsedSeconds / SIMULATION_PARAMETERS.time.realSecondsPerGameMonth)
    );
    const { nextState, offlineReport } = simulateMultipleMonths(
      gameState,
      months,
      elapsedSeconds
    );
    nextState.time.lastRealTimestamp = Date.now();
    void saveGameState(nextState);
    set({
      gameState: nextState,
      offlineReport,
    });
  },

  loadScenarioHouseholds: (targetHouseholds: number) => {
    const { showToast } = get();
    let state = createInitialGameState(999111);

    if (targetHouseholds <= 10) {
      state.time.lastRealTimestamp = Date.now();
      void saveGameState(state);
      set({ gameState: state, milestoneDismissed: false, showMilestoneModal: false });
      showToast('已重置为 10 户初始庄园场景');
      return;
    }

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
    for (let y = 0; y < 260; y++) {
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
          if (expRes.success) state = expRes.nextState;
        }
      }
      for (const bId of buildOrder) {
        const b = state.buildings.find((item) => item.id === bId);
        if (b && !b.built && !b.underConstruction) {
          const bRes = startBuildingConstruction(state, bId);
          if (bRes.success) state = bRes.nextState;
        }
      }
      for (let m = 0; m < 12; m++) {
        state = simulateMonth(state, rng).nextState;
        if (state.population.totalHouseholds >= targetHouseholds) break;
      }
      if (state.population.totalHouseholds >= targetHouseholds) break;
    }

    state.time.lastRealTimestamp = Date.now();
    void saveGameState(state);
    set({
      gameState: state,
      showMilestoneModal: state.population.totalHouseholds >= 1000,
    });
    showToast(`已通过真实经济模拟生成 ${state.population.totalHouseholds} 户领地场景`);
  },

  resetGame: async (customSeed?: number) => {
    await clearSavedGame();
    const seed = customSeed ?? Math.floor(100000 + Math.random() * 9000000);
    const fresh = createInitialGameState(seed);
    fresh.time.lastRealTimestamp = Date.now();
    await saveGameState(fresh);
    set({
      gameState: fresh,
      activeTab: null,
      selectedAnchorId: null,
      diagnosticMetric: null,
      offlineReport: null,
      showMilestoneModal: false,
      milestoneDismissed: false,
    });
    get().showToast('已重新开始新领地治理');
  },

  exportSaveJson: () => {
    return JSON.stringify(get().gameState, null, 2);
  },

  importSaveJson: (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const validated = validateAndMigrateState(parsed);
      if (!validated) {
        get().showToast('存档格式无效，导入失败');
        return false;
      }
      validated.time.lastRealTimestamp = Date.now();
      void saveGameState(validated);
      set({ gameState: validated });
      get().showToast('存档导入成功！');
      return true;
    } catch {
      get().showToast('JSON 解析失败，请检查存档内容');
      return false;
    }
  },
}));

