import React from 'react';
import {
  Bug,
  Coins,
  FastForward,
  Home,
  Pause,
  Play,
  Shield,
  TrendingUp,
  Wheat,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const TopBar: React.FC = () => {
  const {
    gameState,
    togglePause,
    setSpeedMultiplier,
    setDiagnosticMetric,
    setShowDebugPanel,
    showDebugPanel,
  } = useGameStore();

  const { gameDate, time, population, agriculture, finance, economy } = gameState;

  const foodRatio =
    agriculture.lastAnnualConsumptionTons > 0
      ? agriculture.foodStockTons / agriculture.lastAnnualConsumptionTons
      : 1;
  const foodStatus =
    foodRatio >= 0.8 ? '充足' : foodRatio >= 0.35 ? '平衡' : '偏紧';
  const foodColor =
    foodRatio >= 0.8
      ? 'text-emerald-300'
      : foodRatio >= 0.35
        ? 'text-amber-300'
        : 'text-rose-400';

  const cycleSpeed = () => {
    // 1 = standard (1h = 3mo), 120 = brisk play (10s = 1mo), 600 = fast (2s = 1mo)
    if (time.speedMultiplier === 1) {
      setSpeedMultiplier(120);
    } else if (time.speedMultiplier === 120) {
      setSpeedMultiplier(600);
    } else {
      setSpeedMultiplier(1);
    }
  };

  const speedLabel =
    time.speedMultiplier === 1
      ? '标准'
      : time.speedMultiplier === 120
        ? '中速'
        : '高速';

  return (
    <header className="top-bar">
      {/* Row 1: Date, Dynasty Lord, and Time Controls */}
      <div className="top-bar-row-main">
        <div className="date-badge">
          <span className="year-text">公元 {gameDate.year} 年</span>
          <span className="month-text">{gameDate.month}月</span>
          {time.isPaused && <span className="paused-pill">已暂停</span>}
        </div>

        <div className="time-controls">
          <button
            type="button"
            className={`ctrl-btn ${time.isPaused ? 'btn-resume' : 'btn-pause'}`}
            onClick={togglePause}
            title={time.isPaused ? '继续游戏' : '暂停游戏'}
          >
            {time.isPaused ? <Play size={15} /> : <Pause size={15} />}
            <span>{time.isPaused ? '继续' : '暂停'}</span>
          </button>

          <button
            type="button"
            className={`ctrl-btn ${time.speedMultiplier > 1 ? 'btn-speed-active' : ''}`}
            onClick={cycleSpeed}
            title="切换游戏流逝速度（标准：现实1小时=3个月）"
          >
            <FastForward size={14} />
            <span>{speedLabel}</span>
          </button>

          <button
            type="button"
            className={`ctrl-btn btn-debug ${showDebugPanel ? 'active' : ''}`}
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            title="开发者测试面板"
          >
            <Bug size={14} />
            <span>调试</span>
          </button>
        </div>
      </div>

      {/* Row 2: Interactive Key Metrics (Click any metric for Explainable Economy diagnostic!) */}
      <div className="metrics-strip">
        <button
          type="button"
          className="metric-pill"
          onClick={() => setDiagnosticMetric('population')}
          title="点击查看人口与家庭发展解释"
        >
          <Home size={14} className="icon-amber" />
          <div className="metric-content">
            <span className="metric-val">{population.totalHouseholds} 户</span>
            <span className="metric-sub">{population.totalPopulation}人</span>
          </div>
        </button>

        <button
          type="button"
          className="metric-pill"
          onClick={() => setDiagnosticMetric('finance')}
          title="点击查看财政与金库解释"
        >
          <Coins size={14} className="icon-gold" />
          <div className="metric-content">
            <span className="metric-val">{finance.treasury.toFixed(0)} 金</span>
            <span
              className={`metric-sub ${finance.annualBalance >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}
            >
              {finance.annualBalance >= 0 ? '+' : ''}
              {finance.annualBalance.toFixed(1)}/年
            </span>
          </div>
        </button>

        <button
          type="button"
          className="metric-pill"
          onClick={() => setDiagnosticMetric('food')}
          title="点击查看农业与粮食供需解释"
        >
          <Wheat size={14} className="icon-green" />
          <div className="metric-content">
            <span className="metric-val">{agriculture.foodStockTons.toFixed(1)} 吨</span>
            <span className={`metric-sub ${foodColor}`}>{foodStatus}</span>
          </div>
        </button>

        <button
          type="button"
          className="metric-pill"
          onClick={() => setDiagnosticMetric('commerce')}
          title="点击查看商业与治安解释"
        >
          <TrendingUp size={14} className="icon-sky" />
          <div className="metric-content">
            <span className="metric-val">商 {economy.commercialProsperity}</span>
            <span className="metric-sub">
              <Shield size={10} style={{ display: 'inline', marginRight: 2 }} />
              安 {economy.security}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

