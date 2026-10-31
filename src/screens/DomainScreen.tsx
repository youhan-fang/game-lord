import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Crown,
  Edit3,
  HelpCircle,
  Home,
  MapPin,
  Store,
  Users,
  Wheat,
  XCircle,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const DomainScreen: React.FC = () => {
  const {
    gameState,
    handleDecision,
    setDiagnosticMetric,
    setFamilyName,
  } = useGameStore();

  const { dynasty, population, agriculture, economy, pendingDecisions } = gameState;
  const [editingFamily, setEditingFamily] = useState(false);
  const [familyInput, setFamilyInput] = useState(dynasty.familyName);

  const weatherLabelMap = {
    bumper: '丰收之年 (×1.20)',
    normal: '风调雨顺 (×1.00)',
    poor: '阴雨歉收 (×0.78)',
    harsh_winter: '凛冽严冬 (×0.72)',
  };

  const saveFamily = () => {
    setFamilyName(familyInput);
    setEditingFamily(false);
  };

  return (
    <div className="panel-body">
      {/* 1. Pending Lord Decisions (Non-Urgent Petitions, Section 7.4) */}
      {pendingDecisions.length > 0 && (
        <section className="panel-section highlight-card">
          <div className="section-header">
            <Award size={18} className="icon-gold" />
            <h3>待批阅领地政务（无时限）</h3>
          </div>
          <div className="decisions-list">
            {pendingDecisions.map((dec) => {
              const canAfford = gameState.finance.treasury >= dec.costGold;
              return (
                <div key={dec.id} className="decision-item">
                  <div className="decision-top">
                    <span className="decision-year">公元 {dec.year} 年呈递</span>
                    <h4>{dec.title}</h4>
                  </div>
                  <p className="decision-desc">{dec.description}</p>
                  <div className="decision-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!canAfford}
                      onClick={() => handleDecision(dec.id, true)}
                    >
                      <CheckCircle2 size={15} />
                      <span>
                        {dec.approveLabel}
                        {!canAfford ? ' (金库不足)' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDecision(dec.id, false)}
                    >
                      <XCircle size={15} />
                      <span>{dec.declineLabel}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Dynasty & Current Lord Card (Section 8) */}
      <section className="panel-section">
        <div className="section-header">
          <Crown size={18} className="icon-gold" />
          <h3>领主家族与继承人</h3>
          <span className="tag-badge">第 {dynasty.generation} 代家主 · 威望 {economy.prestige}</span>
        </div>

        <div className="family-name-bar">
          {editingFamily ? (
            <div className="family-edit-row">
              <input
                type="text"
                className="text-input"
                value={familyInput}
                onChange={(e) => setFamilyInput(e.target.value)}
                maxLength={28}
              />
              <button type="button" className="btn-primary btn-sm" onClick={saveFamily}>
                保存
              </button>
            </div>
          ) : (
            <div className="family-display-row">
              <span className="family-title">{dynasty.familyName}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setFamilyInput(dynasty.familyName);
                  setEditingFamily(true);
                }}
                title="修改家族名称"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="lord-grid">
          <div className="lord-box">
            <div className="lord-role">现任领主（执政 {dynasty.currentLord.yearsRuled} 年）</div>
            <div className="lord-name">{dynasty.currentLord.name}</div>
            <div className="lord-meta">年龄：{dynasty.currentLord.age} 岁</div>
            <div className="trait-box">
              <span className="trait-badge">{dynasty.currentLord.trait.name}</span>
              <p className="trait-desc">{dynasty.currentLord.trait.description}</p>
            </div>
          </div>

          <div className="lord-box">
            <div className="lord-role">指定继承人（{dynasty.heir.relation}）</div>
            <div className="lord-name">{dynasty.heir.name}</div>
            <div className="lord-meta">年龄：{dynasty.heir.age} 岁</div>
            <div className="trait-box">
              <span className="trait-badge">{dynasty.heir.trait.name}</span>
              <p className="trait-desc">{dynasty.heir.trait.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Population & Household Economy Breakdown */}
      <section className="panel-section">
        <div className="section-header">
          <Users size={18} className="icon-amber" />
          <h3>居民家庭与私人财富</h3>
          <button
            type="button"
            className="explain-link-btn"
            onClick={() => setDiagnosticMetric('population')}
          >
            <HelpCircle size={13} />
            <span>发展解释</span>
          </button>
        </div>

        <div className="stats-grid-2">
          <div className="stat-card">
            <span className="stat-label">领地总户数 / 人口</span>
            <span className="stat-value">
              {population.totalHouseholds} 户 <small>({population.totalPopulation} 人)</small>
            </span>
            <span className="stat-sub">
              户均 {(population.totalPopulation / Math.max(1, population.totalHouseholds)).toFixed(1)} 人 · 住宅容量 {population.housingCapacity} 栋
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">经济部门分布</span>
            <span className="stat-value">
              农 {population.farmHouseholds} 户 · 商工 {population.nonFarmHouseholds} 户
            </span>
            <span className="stat-sub">
              农业 {population.farmPopulation} 人 / 非农 {population.nonFarmPopulation} 人
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">居民私人总积蓄</span>
            <span className="stat-value">
              {(population.farmHouseholdSavings + population.nonFarmHouseholdSavings).toFixed(1)} 金币
            </span>
            <span className="stat-sub">
              农户 {population.farmHouseholdSavings.toFixed(1)} 金 · 商工 {population.nonFarmHouseholdSavings.toFixed(1)} 金
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">上年度人口变动</span>
            <span className="stat-value">
              出生 +{population.annualBirths} / 死亡 -{population.annualDeaths}
            </span>
            <span className="stat-sub">
              迁入 +{population.annualImmigrants}人 · 迁出 -{population.annualEmigrants}人 · 新分户 +{population.newHouseholdsFormed}户
            </span>
          </div>
        </div>
      </section>

      {/* 4. Agriculture & Land Carrying Capacity */}
      <section className="panel-section">
        <div className="section-header">
          <Wheat size={18} className="icon-green" />
          <h3>农业、土地与粮食储备</h3>
          <button
            type="button"
            className="explain-link-btn"
            onClick={() => setDiagnosticMetric('food')}
          >
            <HelpCircle size={13} />
            <span>供需解释</span>
          </button>
        </div>

        <div className="stats-grid-2">
          <div className="stat-card">
            <span className="stat-label">现有控制土地总面积</span>
            <span className="stat-value">{agriculture.controlledLandHa} 公顷</span>
            <span className="stat-sub">
              潜在可耕地：{agriculture.arablePotentialHa} 公顷
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">已开垦耕地 / 当年播种</span>
            <span className="stat-value">
              {agriculture.cultivatedLandHa.toFixed(1)} / {agriculture.sownAreaHa.toFixed(1)} 公顷
            </span>
            <span className="stat-sub">
              本年农民自主新垦：+{agriculture.reclaimedThisYearHa.toFixed(2)} 公顷
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">本年收成与净产</span>
            <span className="stat-value">{agriculture.lastNetYieldTons.toFixed(1)} 吨净粮</span>
            <span className="stat-sub">
              总产 {agriculture.lastGrossYieldTons.toFixed(1)}吨 - 种子 {agriculture.lastSeedTons.toFixed(1)}吨 - 损耗 {agriculture.lastLossTons.toFixed(1)}吨
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">粮食消费与贸易</span>
            <span className="stat-value">年耗 {agriculture.lastAnnualConsumptionTons.toFixed(1)} 吨</span>
            <span className="stat-sub">
              进口 +{agriculture.lastFoodImportedTons.toFixed(1)}吨 · 出口 -{agriculture.lastFoodExportedTons.toFixed(1)}吨
            </span>
          </div>
        </div>

        <div className="info-banner-row">
          <span>气候：{weatherLabelMap[agriculture.weatherType]}</span>
          <span>肥力：{(agriculture.fertility * 100).toFixed(0)}%</span>
          <span>农具技术：{(agriculture.toolsLevel * 100).toFixed(0)}%</span>
        </div>
      </section>

      {/* 5. Commerce, Workshops & Trade */}
      <section className="panel-section">
        <div className="section-header">
          <Store size={18} className="icon-sky" />
          <h3>商业、手工业与治安</h3>
          <button
            type="button"
            className="explain-link-btn"
            onClick={() => setDiagnosticMetric('commerce')}
          >
            <HelpCircle size={13} />
            <span>商业解释</span>
          </button>
        </div>

        <div className="stats-grid-2">
          <div className="stat-card">
            <span className="stat-label">商业繁荣度 / 活跃度</span>
            <span className="stat-value">{economy.commercialProsperity} / 100</span>
            <span className="stat-sub">对外交通便利度 (Trade Access)：{economy.tradeAccess.toFixed(0)}</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">自发手工作坊 / 行商</span>
            <span className="stat-value">
              {economy.workshopsCount} 间作坊 · {economy.merchantsCount} 商号
            </span>
            <span className="stat-sub">
              年粮食进口运力上限：{economy.foodImportCapacityTons.toFixed(1)} 吨
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

