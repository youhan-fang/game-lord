import Dexie, { Table } from 'dexie';
import { createInitialGameState } from '../game/world/progression';
import { GameState } from '../game/world/worldState';

export const CURRENT_SAVE_VERSION = 1;
const PRIMARY_SLOT_ID = 'main_lordship_save';
const LOCAL_STORAGE_BACKUP_KEY = 'medieval_lordship_save_backup_v1';

export interface SaveSlotRecord {
  id: string;
  version: number;
  updatedAt: number;
  state: GameState;
}

class LordshipDatabase extends Dexie {
  public saves!: Table<SaveSlotRecord, string>;

  constructor() {
    super('MedievalLordshipDB');
    this.version(1).stores({
      saves: 'id, version, updatedAt',
    });
  }
}

export const db = new LordshipDatabase();

/**
 * Validates and migrates a loaded GameState to ensure schema integrity and error recovery.
 */
export function validateAndMigrateState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<GameState>;

  if (
    !candidate.gameDate ||
    typeof candidate.gameDate.year !== 'number' ||
    !candidate.population ||
    typeof candidate.population.totalHouseholds !== 'number' ||
    !candidate.agriculture ||
    !candidate.finance ||
    !candidate.policies ||
    !candidate.map ||
    !candidate.dynasty
  ) {
    return null;
  }

  const fallback = createInitialGameState(candidate.randomSeed ?? 9000900);
  return {
    ...fallback,
    ...candidate,
    version: CURRENT_SAVE_VERSION,
    population: {
      ...fallback.population,
      ...candidate.population,
      totalPopulation: Math.max(10, candidate.population.totalPopulation ?? 50),
      totalHouseholds: Math.max(3, candidate.population.totalHouseholds ?? 10),
    },
    agriculture: {
      ...fallback.agriculture,
      ...candidate.agriculture,
      cultivatedLandHa: Math.max(10, candidate.agriculture.cultivatedLandHa ?? 45),
      foodStockTons: Math.max(0, candidate.agriculture.foodStockTons ?? 8),
    },
  };
}

/**
 * Saves the current GameState to IndexedDB (Dexie) and mirrors to localStorage for instant recovery.
 */
export async function saveGameState(state: GameState): Promise<void> {
  const now = Date.now();
  const stateWithTimestamp: GameState = {
    ...state,
    version: CURRENT_SAVE_VERSION,
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(stateWithTimestamp));
  } catch {
    // Ignore storage quota errors on backup
  }

  try {
    await db.saves.put({
      id: PRIMARY_SLOT_ID,
      version: CURRENT_SAVE_VERSION,
      updatedAt: now,
      state: stateWithTimestamp,
    });
  } catch (err) {
    console.warn('IndexedDB save warning, fallback used:', err);
  }
}

/**
 * Loads the saved GameState from IndexedDB or localStorage fallback.
 * Compares timestamps to prevent multi-tab stale overwrite or duplicate offline catch-up.
 */
export async function loadGameState(): Promise<GameState | null> {
  let idbState: GameState | null = null;
  let lsState: GameState | null = null;

  try {
    const record = await db.saves.get(PRIMARY_SLOT_ID);
    if (record?.state) {
      idbState = validateAndMigrateState(record.state);
    }
  } catch (err) {
    console.warn('IndexedDB load warning:', err);
  }

  try {
    const rawJson = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (rawJson) {
      lsState = validateAndMigrateState(JSON.parse(rawJson));
    }
  } catch {
    // Ignore parse error
  }

  if (idbState && lsState) {
    // Pick the one with the more recent simulation progress / timestamp
    if (lsState.gameDate.totalMonths > idbState.gameDate.totalMonths) {
      return lsState;
    }
    if (
      lsState.gameDate.totalMonths === idbState.gameDate.totalMonths &&
      lsState.time.lastRealTimestamp > idbState.time.lastRealTimestamp
    ) {
      return lsState;
    }
    return idbState;
  }

  return idbState || lsState;
}

/**
 * Clears saved state and starts fresh.
 */
export async function clearSavedGame(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
  } catch {
    // Ignore
  }
  try {
    await db.saves.delete(PRIMARY_SLOT_ID);
  } catch {
    // Ignore
  }
}

