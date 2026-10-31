import React, { useState } from 'react';
import {
  Award,
  Bug,
  CheckCircle2,
  Clock,
  Download,
  FastForward,
  HelpCircle,
  RotateCcw,
  ScrollText,
  Upload,
  X,
} from 'lucide-react';
import { generateDevelopmentExplanation } from '../game/world/progression';
import { useGameStore } from '../store/gameStore';

export const ModalsAndOverlays: React.FC = () => {
  const {
    gameState,
    diagnosticMetric,
    setDiagnosticMetric,
    offlineReport,
    dismissOfflineReport,
    showMilestoneModal,
    dismissMilestoneModal,
    showDebugPanel,
    setShowDebugPanel,
    setActiveTab,
    fastForwardYears,
    simulateOfflineLeave,
    loadScenarioHouseholds,
    resetGame,
    exportSaveJson,
    importSaveJson,
  } = useGameStore();

  const [jsonText, setJsonText] = useState('');
  const [showRawState, setShowRawState] = useState(false);

  const diagnostic = diagnosticMetric
    ? generateDevelopmentExplanation(gameState, diagnosticMetric)
    : null;

  const formatElapsedHours = (sec: number) => {
    const hours = sec / 3600;
    if (hours >= 1) return `${hours.toFixed(1)} 小时`;
    const mins = Math.max(1, Math.round(sec / 60));
    return `${mins} 分钟`;
  };

  return (
    <>
      {/* 1. Explainable Economy Diagnostic Modal (Section 10.6) */}
      {diagnostic && (
        <div className="modal-backdrop" onClick={() => setDiagnosticMetric(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <HelpCircle size={18} className="icon-gold" />
                <h3>{diagnostic.title}</h3>
              </div>
              <button
                type="button"
                className="icon-close-btn"
                onClick={() => setDiagnosticMetric(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-content">
              <div className="diag-headline">{diagnostic.headline}</div>
              <p className="diag-summary">{diagnostic.summary10Years}</p>

              <div className="diag-block">
                <h4>当前正面驱动因素：</h4>
                <ul className="diag-list pro">
                  {diagnostic.positiveFactors.map((f, i) => (
                    <li key={i}>＋ {f}</li>
                  ))}
                </ul>
              </div>

              <div className="diag-block">
                <h4>当前制约或主要原因：</h4>
                <ul className="diag-list con">
                  {diagnostic.limitingFactors.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>

              <div className="diag-advice">{diagnostic.advice}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Offline Development Report Modal (Section 7.5) */}
      {offlineReport && (
        <div className="modal-backdrop" onClick={dismissOfflineReport}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Clock size={18} className="icon-gold" />
                <h3>欢迎回到你的领地！</h3>
              </div>
              <button
                type="button"
                className="icon-close-btn"
                onClick={dismissOfflineReport}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-content">
              <p className="offline-intro">
                你离开了 <strong>{formatElapsedHours(offlineReport.elapsedRealSeconds)}</strong>，
                领地自主运转了 <strong>{offlineReport.yearsSimulated} 年</strong>（公元 {offlineReport.startYear} → {offlineReport.endYear} 年）。
              </p>

              <div className="offline-stats-box">
                <div className="offline-stat-row">
                  <span>领地家庭：</span>
                  <strong>
                    {offlineReport.oldHouseholds} → {offlineReport.newHouseholds} 户
                  </strong>
                </div>
                <div className="offline-stat-row">
                  <span>总人口数：</span>
                  <strong>
                    {offlineReport.oldPopulation} → {offlineReport.newPopulation} 人
                  </strong>
                </div>
                <div className="offline-stat-row">
                  <span>领主金库：</span>
                  <strong>
                    {offlineReport.oldTreasury.toFixed(0)} → {offlineReport.newTreasury.toFixed(0)} 金币
                  </strong>
                </div>
                <div className="offline-stat-row">
                  <span>粮食状况：</span>
                  <strong>{offlineReport.foodStatusText}</strong>
                </div>
                <div className="offline-stat-row">
                  <span>商业发展：</span>
                  <strong>{offlineReport.commerceStatusText}</strong>
                </div>
              </div>

              {offlineReport.highlightEvents.length > 0 && (
                <div className="offline-events-box">
                  <h4>期间重要事件：</h4>
                  <ul>
                    {offlineReport.highlightEvents.map((ev) => (
                      <li key={ev.id}>
                        <span className="ev-year">[{ev.year}年]</span> {ev.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    dismissOfflineReport();
                    setActiveTab('chronicle');
                  }}
                >
                  <ScrollText size={15} />
                  <span>查看详细编年史</span>
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={dismissOfflineReport}
                >
                  <CheckCircle2 size={15} />
                  <span>继续治理领地</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 1000 Households Achievement Modal (Section 11) */}
      {showMilestoneModal && (
        <div className="modal-backdrop" onClick={dismissMilestoneModal}>
          <div className="modal-card achievement-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Award size={22} className="icon-gold" />
                <h3>荣耀成就：千户繁荣领地与重镇！</h3>
              </div>
              <button
                type="button"
                className="icon-close-btn"
                onClick={dismissMilestoneModal}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-content">
              <p className="diag-summary">
                从公元 900 年仅有 10 户佃农的荒僻河谷小庄园起步，你的家族历经世代接力治理，终于在公元{' '}
                <strong>{gameState.milestone1000Year ?? gameState.gameDate.year} 年</strong> 将领地发展为拥有{' '}
                <strong>{gameState.population.totalHouseholds} 户（{gameState.population.totalPopulation} 人）</strong>{' '}
                的宏伟设防重镇！
              </p>

              <div className="offline-stats-box">
                <div className="offline-stat-row">
                  <span>家族传承代数：</span>
                  <strong>共历经 {gameState.dynasty.generation} 代领主</strong>
                </div>
                <div className="offline-stat-row">
                  <span>发展历程耗时：</span>
                  <strong>{gameState.gameDate.year - 900} 年</strong>
                </div>
                <div className="offline-stat-row">
                  <span>农业与非农家庭：</span>
                  <strong>
                    农 {gameState.population.farmHouseholds} 户 / 商工 {gameState.population.nonFarmHouseholds} 户
                  </strong>
                </div>
                <div className="offline-stat-row">
                  <span>领地控制疆域：</span>
                  <strong>
                    {gameState.agriculture.controlledLandHa} 公顷（已垦 {gameState.agriculture.cultivatedLandHa.toFixed(0)} 公顷）
                  </strong>
                </div>
                <div className="offline-stat-row">
                  <span>商业繁荣度 / 威望：</span>
                  <strong>
                    繁荣度 {gameState.economy.commercialProsperity}/100 · 威望 {gameState.economy.prestige}
                  </strong>
                </div>
              </div>

              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    dismissMilestoneModal();
                    setActiveTab('chronicle');
                  }}
                >
                  <ScrollText size={15} />
                  <span>回顾家族编年史</span>
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={dismissMilestoneModal}
                >
                  <CheckCircle2 size={15} />
                  <span>继续长期治理</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Developer Test & Balance Debug Panel (Section 14) */}
      {showDebugPanel && (
        <div className="modal-backdrop" onClick={() => setShowDebugPanel(false)}>
          <div className="modal-card debug-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Bug size={18} className="icon-amber" />
                <h3>开发者模拟与经济调试面板</h3>
              </div>
              <button
                type="button"
                className="icon-close-btn"
                onClick={() => setShowDebugPanel(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-content">
              {/* Time Fast-Forward (Calls genuine deterministic simulation) */}
              <div className="debug-group">
                <h4>1. 快速推进时间（调用真实经济模拟）</h4>
                <div className="debug-btn-grid">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => fastForwardYears(1)}
                  >
                    <FastForward size={13} /> +1 年
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => fastForwardYears(10)}
                  >
                    <FastForward size={13} /> +10 年
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => fastForwardYears(50)}
                  >
                    <FastForward size={13} /> +50 年
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => fastForwardYears(100)}
                  >
                    <FastForward size={13} /> +100 年
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm full-width-btn"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    setShowDebugPanel(false);
                    simulateOfflineLeave(8);
                  }}
                >
                  <Clock size={14} /> 模拟离开 8 小时（触发离线结算报告弹窗）
                </button>
              </div>

              {/* Scenario Presets */}
              <div className="debug-group">
                <h4>2. 生成指定规模演进场景（完整模拟路径）</h4>
                <div className="debug-btn-grid">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => loadScenarioHouseholds(10)}
                  >
                    10户 (初始庄园)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => loadScenarioHouseholds(60)}
                  >
                    ~60户 (河谷村庄)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => loadScenarioHouseholds(180)}
                  >
                    ~180户 (集市乡镇)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => loadScenarioHouseholds(450)}
                  >
                    ~450户 (繁荣城镇)
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => loadScenarioHouseholds(1005)}
                  >
                    1000+户 (设防大重镇)
                  </button>
                </div>
              </div>

              {/* Formula & Seed Readout */}
              <div className="debug-group">
                <h4>3. 核心经济公式实时计算结果</h4>
                <div className="debug-code-box">
                  <div>随机种子 (randomSeed): {gameState.randomSeed}</div>
                  <div>
                    播种面积 = min(已垦 {gameState.agriculture.cultivatedLandHa}ha, 劳力上限{' '}
                    {(gameState.population.farmHouseholds * 4.6).toFixed(1)}ha) × 轮作比 ={' '}
                    {gameState.agriculture.sownAreaHa}ha
                  </div>
                  <div>
                    总产 = {gameState.agriculture.sownAreaHa}ha × 0.8 × 肥力{gameState.agriculture.fertility} × 天气{gameState.agriculture.weatherFactor} × 技术{gameState.agriculture.techFactor} ={' '}
                    {gameState.agriculture.lastGrossYieldTons}t
                  </div>
                  <div>
                    净粮 = 总产{gameState.agriculture.lastGrossYieldTons}t - 留种{gameState.agriculture.lastSeedTons}t - 损耗{gameState.agriculture.lastLossTons}t ={' '}
                    {gameState.agriculture.lastNetYieldTons}t (年消费 {gameState.agriculture.lastAnnualConsumptionTons}t)
                  </div>
                  <div>
                    商业活动 = {gameState.economy.commercialActivity} | 贸易便利度 = {gameState.economy.tradeAccess} | 进口运力 = {gameState.economy.foodImportCapacityTons}t
                  </div>
                  <div>
                    农户总私产 = {gameState.population.farmHouseholdSavings}金 | 非农总私产 = {gameState.population.nonFarmHouseholdSavings}金
                  </div>
                </div>
              </div>

              {/* Save Export / Import / Raw GameState */}
              <div className="debug-group">
                <h4>4. 存档 JSON 导出 / 导入与原始状态</h4>
                <div className="debug-btn-grid">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setJsonText(exportSaveJson())}
                  >
                    <Download size={13} /> 导出当前存档 JSON
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      if (jsonText.trim()) importSaveJson(jsonText);
                    }}
                  >
                    <Upload size={13} /> 导入下方 JSON
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setShowRawState(!showRawState)}
                  >
                    {showRawState ? '隐藏原始 GameState' : '查看原始 GameState'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => void resetGame()}
                  >
                    <RotateCcw size={13} /> 重置新游戏
                  </button>
                </div>

                <textarea
                  className="debug-textarea"
                  rows={4}
                  placeholder="在此粘贴存档 JSON 或点击【导出当前存档 JSON】..."
                  value={showRawState ? exportSaveJson() : jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

