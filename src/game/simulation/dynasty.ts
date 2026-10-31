import { ANGLO_SAXON_NAMES, LORD_TRAIT_LIST } from '../../data/events';
import { DynastyState, GameEvent, GameState } from '../world/worldState';
import { SeededRandom } from './rng';

export function pickNewName(rng: SeededRandom, excludeNames: string[]): string {
  const candidates = ANGLO_SAXON_NAMES.filter((n) => !excludeNames.includes(n));
  if (candidates.length === 0) {
    return rng.pick(ANGLO_SAXON_NAMES);
  }
  return rng.pick(candidates);
}

/**
 * Advances dynasty ages by 1 year and handles generational succession if the current Lord passes away.
 */
export function advanceAnnualDynasty(
  state: GameState,
  rng: SeededRandom
): {
  dynasty: DynastyState;
  events: GameEvent[];
} {
  const current = state.dynasty.currentLord;
  const heir = state.dynasty.heir;
  const events: GameEvent[] = [];

  const nextLordAge = current.age + 1;
  const nextYearsRuled = current.yearsRuled + 1;
  const nextHeirAge = heir.age + 1;

  // Mortality probability after age 54, guaranteed by age 78
  let deathProb = 0;
  if (nextLordAge >= 78) {
    deathProb = 1.0;
  } else if (nextLordAge >= 68) {
    deathProb = 0.22;
  } else if (nextLordAge >= 60) {
    deathProb = 0.1;
  } else if (nextLordAge >= 54) {
    deathProb = 0.04;
  }

  if (rng.chance(deathProb)) {
    const startYear = state.gameDate.year - current.yearsRuled;
    const pastRecord = {
      name: current.name,
      generation: state.dynasty.generation,
      startYear,
      endYear: state.gameDate.year,
      trait: current.trait,
      peakHouseholds: state.population.totalHouseholds,
    };

    const newGeneration = state.dynasty.generation + 1;
    const newLordAge = Math.max(18, Math.min(46, nextHeirAge));
    const newLord = {
      name: heir.name,
      age: newLordAge,
      trait: heir.trait,
      yearsRuled: 0,
    };

    const nextHeirName = pickNewName(rng, [current.name, heir.name]);
    const nextHeirTrait = rng.pick(LORD_TRAIT_LIST);
    const newHeir = {
      name: nextHeirName,
      age: Math.max(1, Math.min(22, newLordAge - rng.int(18, 25))),
      trait: nextHeirTrait,
      relation: rng.chance(0.8) ? '长子' : '侄子（旁系继承人）',
    };

    events.push({
      id: `evt_dynasty_${state.gameDate.year}_${newGeneration}`,
      year: state.gameDate.year,
      month: state.gameDate.month,
      title: `领主更替：第 ${newGeneration} 代家主继位`,
      description: `统治领地 ${nextYearsRuled} 年的第 ${state.dynasty.generation} 代领主 ${current.name} 享年 ${nextLordAge} 岁安然离世。${heir.relation} ${newLord.name}（特质：${newLord.trait.name}）正式继承领地。`,
      category: 'dynasty',
      important: true,
    });

    return {
      dynasty: {
        familyName: state.dynasty.familyName,
        generation: newGeneration,
        currentLord: newLord,
        heir: newHeir,
        pastLords: [...state.dynasty.pastLords, pastRecord],
      },
      events,
    };
  }

  return {
    dynasty: {
      ...state.dynasty,
      currentLord: {
        ...current,
        age: nextLordAge,
        yearsRuled: nextYearsRuled,
      },
      heir: {
        ...heir,
        age: nextHeirAge,
      },
    },
    events,
  };
}

