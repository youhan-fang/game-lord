import { hasBuilding } from '../simulation/agriculture';
import {
  DevelopmentAnchor,
  GameState,
  SettlementStage,
  WorldMapState,
} from './worldState';

/**
 * Evaluates multi-factor economic, demographic, agricultural, and construction state
 * to determine the settlement stage and the visibility/level of all 16 map anchors.
 * Never switches based purely on population count alone.
 */
export function updateWorldVisualState(state: GameState): WorldMapState {
  const h = state.population.totalHouseholds;
  const nonFarmH = state.population.nonFarmHouseholds;
  const cultHa = state.agriculture.cultivatedLandHa;
  const comm = state.economy.commercialProsperity;
  const sec = state.economy.security;

  const hasMill = hasBuilding(state, 'watermill');
  const hasBridge = hasBuilding(state, 'river_bridge');
  const hasMarket = hasBuilding(state, 'marketplace');
  const hasChurch = hasBuilding(state, 'parish_church');
  const hasPalisade = hasBuilding(state, 'wooden_palisade');
  const hasHighroad = hasBuilding(state, 'paved_highroad');
  const hasArtisan = hasBuilding(state, 'artisan_quarter');
  const hasWall = hasBuilding(state, 'stone_wall');
  const hasKeep = hasBuilding(state, 'stone_keep');
  const hasGranary = hasBuilding(state, 'granary_expansion');
  const hasFieldImp = hasBuilding(state, 'field_improvement');

  const isRegionUnlocked = (id: string) =>
    state.regions.some((r) => r.id === id && r.unlocked);

  // Determine overall SettlementStage based on multi-factor development
  let stage: SettlementStage = 'manor';
  if (h >= 600 && comm >= 55 && (hasWall || hasKeep || nonFarmH >= 180)) {
    stage = 'fortified_city';
  } else if (h >= 280 && comm >= 38 && (hasMarket || hasArtisan || nonFarmH >= 75)) {
    stage = 'prosperous_town';
  } else if (h >= 95 && (hasMarket || hasBridge || comm >= 20)) {
    stage = 'township';
  } else if (h >= 28 || cultHa >= 65 || hasMill) {
    stage = 'village';
  }

  const nextAnchors: DevelopmentAnchor[] = state.map.anchors.map((anchor) => {
    let level = anchor.level;
    let visible = anchor.visible;

    switch (anchor.type) {
      case 'main_settlement': {
        visible = true;
        // Level 0: ~10-25h, Level 1: Small Village, Level 2: Large Village, Level 3: Market Town, Level 4: Dense Town, Level 5: Fortified City
        if (h >= 600 && comm >= 50 && nonFarmH >= 150) level = 5;
        else if (h >= 300 && comm >= 35 && nonFarmH >= 60) level = 4;
        else if (h >= 110 && (hasMarket || comm >= 22)) level = 3;
        else if (h >= 45 && sec >= 50) level = 2;
        else if (h >= 20 || cultHa >= 55) level = 1;
        else level = 0;
        break;
      }

      case 'manor_house': {
        visible = true;
        if (hasKeep) level = 5;
        else if (hasWall || state.economy.prestige >= 90) level = 4;
        else if (h >= 150 || state.economy.prestige >= 45) level = 3;
        else if (h >= 45 || state.buildings.filter((b) => b.built).length >= 2) level = 2;
        else level = 1;
        break;
      }

      case 'farmland_a': {
        visible = true;
        if (cultHa >= 180 && hasFieldImp) level = 5;
        else if (cultHa >= 120) level = 4;
        else if (cultHa >= 80 || hasFieldImp) level = 3;
        else if (cultHa >= 54) level = 2;
        else level = 1;
        break;
      }

      case 'farmland_b': {
        visible = true;
        if (cultHa >= 280 || (cultHa >= 180 && hasGranary)) level = 5;
        else if (cultHa >= 170) level = 4;
        else if (cultHa >= 110 || hasGranary) level = 3;
        else if (cultHa >= 72) level = 2;
        else if (cultHa >= 50) level = 1;
        else level = 0;
        break;
      }

      case 'farmland_c': {
        const northUnlocked = isRegionUnlocked('north_abbey_fief');
        visible = northUnlocked || cultHa >= 210;
        if (!visible) {
          level = 0;
        } else if (cultHa >= 520) level = 5;
        else if (cultHa >= 380) level = 4;
        else if (cultHa >= 270) level = 3;
        else if (cultHa >= 180 || northUnlocked) level = 2;
        else level = 1;
        break;
      }

      case 'watermill': {
        const underConst = state.buildings.some(
          (b) => b.id === 'watermill' && b.underConstruction
        );
        visible = hasMill || underConst;
        if (hasMill) {
          level = h >= 200 ? 3 : h >= 70 ? 2 : 1;
        } else {
          level = 0;
        }
        break;
      }

      case 'bridge': {
        visible = true; // Starts at level 0 (wooden ford/stepping stones)
        if (hasBridge && hasHighroad) level = 3;
        else if (hasBridge && comm >= 30) level = 2;
        else if (hasBridge) level = 1;
        else level = 0;
        break;
      }

      case 'market': {
        visible = hasMarket || state.economy.workshopsCount >= 2 || nonFarmH >= 8;
        if (hasMarket && hasArtisan && comm >= 60) level = 4;
        else if (hasMarket && comm >= 35) level = 3;
        else if (hasMarket) level = 2;
        else if (visible) level = 1;
        else level = 0;
        break;
      }

      case 'church': {
        visible = hasChurch || h >= 65;
        if (hasChurch && h >= 350) level = 3;
        else if (hasChurch) level = 2;
        else if (h >= 65) level = 1; // Small wooden shrine before parish church
        else level = 0;
        break;
      }

      case 'east_village': {
        const eastUnlocked = isRegionUnlocked('east_meadows');
        visible = eastUnlocked || (hasBridge && h >= 55);
        if (!visible) level = 0;
        else if (h >= 450 && eastUnlocked) level = 4;
        else if (h >= 200 && eastUnlocked) level = 3;
        else if (h >= 85 || eastUnlocked) level = 2;
        else level = 1;
        break;
      }

      case 'west_village': {
        const westUnlocked = isRegionUnlocked('west_hill_clearings');
        visible = westUnlocked || h >= 95;
        if (!visible) level = 0;
        else if (h >= 500 && westUnlocked) level = 4;
        else if (h >= 240 && westUnlocked) level = 3;
        else if (westUnlocked) level = 2;
        else level = 1;
        break;
      }

      case 'river_hamlet': {
        const wharfUnlocked = isRegionUnlocked('lower_river_wharf');
        visible = wharfUnlocked || (state.economy.tradeAccess >= 38 && h >= 130);
        if (!visible) level = 0;
        else if (h >= 550 && comm >= 50) level = 4;
        else if (h >= 300 || (wharfUnlocked && comm >= 35)) level = 3;
        else if (wharfUnlocked) level = 2;
        else level = 1;
        break;
      }

      case 'forest_edge': {
        visible = true;
        // As cultivation expands, dense forest retreats (level 4 = lush primeval forest, level 1 = thinned edge with forester lodge)
        const ratioCultivated =
          state.agriculture.cultivatedLandHa / Math.max(1, state.agriculture.controlledLandHa);
        if (state.policies.landPolicy === 'protect_woodland') {
          level = 4;
        } else if (ratioCultivated > 0.52) {
          level = 1;
        } else if (ratioCultivated > 0.35) {
          level = 2;
        } else {
          level = 3;
        }
        break;
      }

      case 'fortification': {
        const hasPatrol = hasBuilding(state, 'patrol_guard');
        visible = hasPalisade || hasPatrol || hasWall;
        if (hasWall) level = 3;
        else if (hasPalisade && hasPatrol) level = 2;
        else if (hasPalisade || hasPatrol) level = 1;
        else level = 0;
        break;
      }

      case 'outer_suburb': {
        const royalUnlocked = isRegionUnlocked('royal_borough_charter');
        visible = hasHighroad || hasArtisan || royalUnlocked || h >= 180;
        if (!visible) level = 0;
        else if (h >= 750) level = 4;
        else if (h >= 450 || royalUnlocked) level = 3;
        else if (h >= 250 || hasArtisan) level = 2;
        else level = 1;
        break;
      }

      case 'city_wall': {
        const wallConst = state.buildings.some(
          (b) => b.id === 'stone_wall' && b.underConstruction
        );
        visible = hasWall || wallConst;
        if (hasWall && hasKeep && h >= 750) level = 3;
        else if (hasWall && h >= 500) level = 2;
        else if (hasWall) level = 1;
        else level = 0;
        break;
      }
    }

    return {
      ...anchor,
      level,
      visible,
    };
  });

  return {
    stage,
    anchors: nextAnchors,
  };
}

