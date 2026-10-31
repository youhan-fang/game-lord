import { GameEvent, GameState, PendingDecision } from '../world/worldState';
import { hasBuilding } from './agriculture';
import { SeededRandom } from './rng';

export interface RandomEventsOutcome {
  events: GameEvent[];
  treasuryDelta: number;
  foodDeltaTons: number;
  populationDelta: number;
  farmHouseholdsDelta: number;
  nonFarmHouseholdsDelta: number;
  newPendingDecisions: PendingDecision[];
}

/**
 * Evaluates annual historical and economic random events based on current lordship conditions.
 * Bounded so offline players never suffer unrecoverable wipeouts.
 */
export function evaluateAnnualRandomEvents(
  state: GameState,
  rng: SeededRandom
): RandomEventsOutcome {
  const events: GameEvent[] = [];
  const newPendingDecisions: PendingDecision[] = [];
  let treasuryDelta = 0;
  let foodDeltaTons = 0;
  let populationDelta = 0;
  let farmHouseholdsDelta = 0;
  let nonFarmHouseholdsDelta = 0;

  const year = state.gameDate.year;
  const month = state.gameDate.month;

  // 1. Weather / Harvest Chronicle Event
  if (state.agriculture.weatherType === 'bumper' && rng.chance(0.55)) {
    events.push({
      id: `evt_harvest_bumper_${year}`,
      year,
      month,
      title: '河谷喜迎丰收',
      description: `今年风调雨顺，麦穗饱满，领地净收获粮食达 ${state.agriculture.lastNetYieldTons.toFixed(1)} 吨，谷仓充盈。`,
      category: 'harvest',
      important: false,
    });
  } else if (state.agriculture.weatherType === 'poor' && rng.chance(0.65)) {
    events.push({
      id: `evt_harvest_poor_${year}`,
      year,
      month,
      title: '连绵秋雨导致歉收',
      description: `秋收时节阴雨连绵，谷物产量下降，今年净收获 ${state.agriculture.lastNetYieldTons.toFixed(1)} 吨。`,
      category: 'harvest',
      important: true,
    });
  } else if (state.agriculture.weatherType === 'harsh_winter') {
    const extraFirewoodFoodLoss = Math.min(state.agriculture.foodStockTons * 0.08, 2.5);
    foodDeltaTons -= extraFirewoodFoodLoss;
    events.push({
      id: `evt_harsh_winter_${year}`,
      year,
      month,
      title: '罕见严冬降临河谷',
      description: `凛冽寒霜封冻了艾什河，作物收成受损且居民消耗了更多储备越冬。`,
      category: 'harvest',
      important: true,
    });
  }

  // 2. Merchant Caravan Visit (Probability scales with tradeAccess & security)
  const caravanProb = Math.min(
    0.26,
    (state.economy.tradeAccess / 220) * (state.economy.security / 80)
  );
  if (state.economy.security >= 52 && rng.chance(caravanProb)) {
    const tollBonus = Number(
      (1.8 + state.economy.tradeAccess * 0.08 + state.population.totalHouseholds * 0.015).toFixed(1)
    );
    treasuryDelta += tollBonus;
    events.push({
      id: `evt_caravan_${year}`,
      year,
      month,
      title: '远方行商车队到访',
      description: `一支满载毛皮、盐巴与铁器的商队途经领地交易，为金库带来 ${tollBonus} 金币通行与交易税。`,
      category: 'commerce',
      important: false,
    });
  }

  // 3. Bandit Raid (Only when security is low; mitigated by Patrol Guard / Palisade / Vigilant Lord)
  if (state.economy.security < 58) {
    const banditProb = ((60 - state.economy.security) / 100) * 0.28;
    if (rng.chance(banditProb)) {
      const hasPalisade = hasBuilding(state, 'wooden_palisade') || hasBuilding(state, 'stone_wall');
      const vigilantMod = state.dynasty.currentLord.trait.id === 'vigilant' ? 0.5 : 1.0;
      const defenseMod = (hasPalisade ? 0.5 : 1.0) * vigilantMod;

      const goldLoss = Number(
        Math.min(state.finance.treasury * 0.08, (2.5 + state.population.totalHouseholds * 0.02) * defenseMod).toFixed(1)
      );
      const foodLoss = Number(
        Math.min(state.agriculture.foodStockTons * 0.08, 2.2 * defenseMod).toFixed(1)
      );
      treasuryDelta -= goldLoss;
      foodDeltaTons -= foodLoss;

      events.push({
        id: `evt_bandits_${year}`,
        year,
        month,
        title: '林间盗匪袭扰边村',
        description: `由于领地治安偏低，流窜盗匪趁夜劫掠了外围农庄，损失 ${goldLoss} 金币与 ${foodLoss} 吨存粮。`,
        category: 'security',
        important: true,
      });
    }
  }

  // 4. Minor Epidemic (Rare, reduced by Parish Church & high maintenance)
  const hasChurch = hasBuilding(state, 'parish_church');
  const epidemicProb = hasChurch ? 0.018 : 0.035;
  if (state.population.totalPopulation > 90 && rng.chance(epidemicProb)) {
    const lossPop = Math.max(
      2,
      Math.min(18, Math.round(state.population.totalPopulation * (hasChurch ? 0.015 : 0.028)))
    );
    populationDelta -= lossPop;
    events.push({
      id: `evt_epidemic_${year}`,
      year,
      month,
      title: '河谷发生小规模春瘟',
      description: `春季潮湿引发风寒疫病，导致 ${lossPop} 名居民不幸病逝${hasChurch ? '（教区教堂草药救济减轻了疫情）' : ''}。`,
      category: 'security',
      important: true,
    });
  }

  // 5. Wave of Free Migrants (When land or commerce is welcoming and security is high)
  const freeLandHa = state.agriculture.arablePotentialHa - state.agriculture.cultivatedLandHa;
  if (
    state.economy.security >= 68 &&
    state.agriculture.foodStockTons > state.agriculture.lastAnnualConsumptionTons * 0.6 &&
    freeLandHa > 18 &&
    rng.chance(0.11)
  ) {
    const migrantH = rng.int(2, 4);
    const migrantPop = migrantH * 4;
    farmHouseholdsDelta += migrantH;
    populationDelta += migrantPop;
    events.push({
      id: `evt_migrant_wave_${year}`,
      year,
      month,
      title: '邻郡自由农举家来投',
      description: `仰慕领地安宁与垦荒良政，${migrantH} 户（共 ${migrantPop} 人）自由农携农具迁入河谷定居。`,
      category: 'migration',
      important: true,
    });
  }

  // 6. Non-urgent Pending Decisions for Player Authorization (Section 7.4)
  const existingDecisionTypes = new Set(state.pendingDecisions.map((d) => d.effectType));

  // Decision A: Merchant Charter Request
  if (
    !state.economy.grantedMarketCharter &&
    !existingDecisionTypes.has('market_charter') &&
    state.population.totalHouseholds >= 32 &&
    (hasBuilding(state, 'river_bridge') || hasBuilding(state, 'marketplace'))
  ) {
    newPendingDecisions.push({
      id: `dec_market_charter_${year}`,
      year,
      title: '商人请求颁发《河谷集市特许状》',
      description:
        '往来行商代表觐见领主，请求正式颁布常设集市保护宪章，豁免琐碎盘查并规范度量衡。批准需花费 15 金币制作宪章与界碑，但将永久提升贸易便利度与商人定居吸引力。',
      approveLabel: '批准宪章 (-15 金币)',
      declineLabel: '暂缓，维持现状',
      costGold: 15,
      effectType: 'market_charter',
    });
    events.push({
      id: `evt_req_charter_${year}`,
      year,
      month,
      title: '商人代表请求设立特许集市',
      description: '行商代表递交请愿书，请求领主颁布定期集市特许状（可在领地待批政务中随时处理）。',
      category: 'commerce',
      important: true,
    });
  }

  // Decision B: Artisan Guild Charter Request
  if (
    !state.economy.grantedGuildCharter &&
    !existingDecisionTypes.has('guild_charter') &&
    state.population.nonFarmHouseholds >= 25 &&
    hasBuilding(state, 'marketplace')
  ) {
    newPendingDecisions.push({
      id: `dec_guild_charter_${year}`,
      year,
      title: '工匠大师请求成立《手工业行会》',
      description:
        '领地内的铁匠、织工与木匠大师联名请愿，希望由领主资助 28 金币设立联合行会会堂，以吸纳更多熟练工匠并提高手工业产出。',
      approveLabel: '赐予行会特权 (-28 金币)',
      declineLabel: '暂不批准',
      costGold: 28,
      effectType: 'guild_charter',
    });
    events.push({
      id: `evt_req_guild_${year}`,
      year,
      month,
      title: '工匠联名申请设立手工业行会',
      description: '随着镇内手工业者增多，工匠大师请求领主赐予行会特许权。',
      category: 'commerce',
      important: true,
    });
  }

  // Decision C: Borderland Land Assart / Royal Forest Grant Opportunity
  if (
    !existingDecisionTypes.has('forest_assart') &&
    state.population.totalHouseholds >= 45 &&
    freeLandHa < 22 &&
    state.pendingDecisions.length < 3 &&
    rng.chance(0.18)
  ) {
    newPendingDecisions.push({
      id: `dec_forest_assart_${year}`,
      year,
      title: '林苑官提议勘界开辟新林间耕地',
      description:
        '随着现有耕地逐渐饱和，庄园林苑官建议拨款 20 金币组织勘界与排干沼泽，可将领地内 35 公顷荒林转化为潜在可耕地。',
      approveLabel: '拨款勘界扩耕 (-20 金币)',
      declineLabel: '保留荒林原貌',
      costGold: 20,
      effectType: 'forest_assart',
    });
  }

  return {
    events,
    treasuryDelta,
    foodDeltaTons,
    populationDelta,
    farmHouseholdsDelta,
    nonFarmHouseholdsDelta,
    newPendingDecisions,
  };
}

