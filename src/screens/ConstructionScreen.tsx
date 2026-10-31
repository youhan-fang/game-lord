import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Coins,
  Hammer,
  Lock,
  Map,
  Wrench,
} from 'lucide-react';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { hasBuilding } from '../game/simulation/agriculture';
import { BuildingState } from '../game/world/worldState';
import { useGameStore } from '../store/gameStore';

export const ConstructionScreen: React.FC = () => {
  const { gameState, constructBuilding, expandRegion } = useGameStore();
  const [subTab, setSubTab] = useState<'buildings' | 'regions'>('buildings');

  const evaluateBuildingAvailability = (b: BuildingState) => {
    const def = BUILDING_DEFINITIONS[b.id];
    if (b.built) return { canBuild: false, reason: '已建成' };
    if (b.underConstruction)
      return {
        canBuild: false,
        reason: `施工中 (${b.progressMonths}/${b.totalMonths} 个月)`,
      };

    if (
      def.prerequisites.minHouseholds &&
      gameState.population.totalHouseholds < def.prerequisites.minHouseholds
    ) {
      return {
        canBuild: false,
        reason: `未满足前置：${def.prerequisites.prerequisiteText}（当前 ${gameState.population.totalHouseholds} 户）`,
      };
    }

    if (def.prerequisites.requiredBuildings) {
      for (const reqId of def.prerequisites.requiredBuildings) {
        if (!hasBuilding(gameState, reqId)) {
          return {
            canBuild: false,
            reason: `未满足前置：${def.prerequisites.prerequisiteText}`,
          };
        }
      }
    }

    if (gameState.finance.treasury < def.costGold) {
      return {
        canBuild: false,
        reason: `金库不足：需 ${def.costGold} 金币（当前 ${gameState.finance.treasury.toFixed(1)} 金币）`,
      };
    }

    return { canBuild: true, reason: '可立即动工' };
  };

  return (
    <div className="panel-body">
      <div className="subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'buildings' ? 'active' : ''}`}
          onClick={() => setSubTab('buildings')}
        >
          <Hammer size={15} />
          <span>公共工程投资 ({gameState.buildings.filter((b) => b.built).length}/{gameState.buildings.length})</span>
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'regions' ? 'active' : ''}`}
          onClick={() => setSubTab('regions')}
        >
          <Map size={15} />
          <span>领地疆域扩张 ({gameState.regions.filter((r) => r.unlocked).length}/{gameState.regions.length})</span>
        </button>
      </div>

      {subTab === 'buildings' ? (
        <div className="construction-list">
          {gameState.buildings.map((b) => {
            const def = BUILDING_DEFINITIONS[b.id];
            const status = evaluateBuildingAvailability(b);

            return (
              <div
                key={b.id}
                className={`build-card ${b.built ? 'built' : b.underConstruction ? 'constructing' : ''}`}
              >
                <div className="build-card-header">
                  <div>
                    <h4>{def.name}</h4>
                    <div className="build-meta-tags">
                      <span className="meta-tag">
                        <Coins size={12} /> 造价 {def.costGold} 金
                      </span>
                      <span className="meta-tag">
                        <Wrench size={12} /> 维护 {def.maintenanceGoldPerYear} 金/年
                      </span>
                      <span className="meta-tag">
                        <Clock size={12} /> 工期 {def.buildMonths} 个月
                      </span>
                    </div>
                  </div>

                  {b.built ? (
                    <span className="status-badge built-badge">
                      <CheckCircle2 size={14} /> 已建成
                    </span>
                  ) : b.underConstruction ? (
                    <span className="status-badge progress-badge">
                      施工中 {b.progressMonths}/{b.totalMonths}月
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={!status.canBuild}
                      onClick={() => constructBuilding(b.id)}
                    >
                      投资兴建
                    </button>
                  )}
                </div>

                <p className="build-desc">{def.description}</p>

                <ul className="build-effects">
                  {def.effectsSummary.map((eff, idx) => (
                    <li key={idx}>• {eff}</li>
                  ))}
                </ul>

                {!b.built && !b.underConstruction && !status.canBuild && (
                  <div className="prereq-warning">
                    <Lock size={13} />
                    <span>{status.reason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="construction-list">
          <p className="panel-intro-note">
            初始庄园仅有 250 公顷土地（潜在可耕地 90 公顷）。要发展为百户乃至千户繁荣重镇，需通过赎买与王室册封并入河谷周边片区，吸收邻近村落并扩大耕地与贸易腹地。
          </p>

          {gameState.regions.map((reg) => {
            const meetsHouseholds =
              gameState.population.totalHouseholds >= reg.requiredHouseholds;
            const meetsPrestige = gameState.economy.prestige >= reg.requiredPrestige;
            const meetsGold = gameState.finance.treasury >= reg.costGold;
            const canAcquire =
              !reg.unlocked && meetsHouseholds && meetsPrestige && meetsGold;

            return (
              <div
                key={reg.id}
                className={`build-card ${reg.unlocked ? 'built' : ''}`}
              >
                <div className="build-card-header">
                  <div>
                    <h4>{reg.name}</h4>
                    <div className="build-meta-tags">
                      <span className="meta-tag">
                        <Coins size={12} /> 册封赎金 {reg.costGold} 金
                      </span>
                      <span className="meta-tag">
                        +{reg.landHa} 公顷土地（可耕地 +{reg.arableHa} 公顷）
                      </span>
                      <span className="meta-tag">
                        吸纳 +{reg.initialFarmHouseholds} 户原住民
                      </span>
                    </div>
                  </div>

                  {reg.unlocked ? (
                    <span className="status-badge built-badge">
                      <CheckCircle2 size={14} /> 已并入版图
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={!canAcquire}
                      onClick={() => expandRegion(reg.id)}
                    >
                      赎买并入
                    </button>
                  )}
                </div>

                <p className="build-desc">{reg.description}</p>

                {!reg.unlocked && !canAcquire && (
                  <div className="prereq-warning">
                    <Lock size={13} />
                    <span>
                      条件：需 {reg.requiredHouseholds} 户居民（当前 {gameState.population.totalHouseholds}）、威望 {reg.requiredPrestige}（当前 {gameState.economy.prestige}）、资金 {reg.costGold} 金币
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

