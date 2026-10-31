import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Scale,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { BudgetLevel, RentPolicy } from '../game/world/worldState';
import { useGameStore } from '../store/gameStore';

export const FinanceScreen: React.FC = () => {
  const {
    gameState,
    setRentPolicy,
    setSecurityBudget,
    setMaintenanceBudget,
  } = useGameStore();

  const { finance, policies } = gameState;
  const { incomeBreakdown, expenseBreakdown } = finance;

  const rentLevels: Array<{ id: RentPolicy; label: string }> = [
    { id: 'low', label: '低地租' },
    { id: 'normal', label: '正常地租' },
    { id: 'high', label: '高地租' },
  ];

  const budgetLevels: Array<{ id: BudgetLevel; label: string }> = [
    { id: 'low', label: '低投入' },
    { id: 'normal', label: '正常' },
    { id: 'high', label: '高投入' },
  ];

  return (
    <div className="panel-body">
      {/* 1. Treasury Summary Cards */}
      <section className="panel-section">
        <div className="section-header">
          <Coins size={18} className="icon-gold" />
          <h3>领主金库与年度收支总览</h3>
        </div>

        <div className="finance-hero-grid">
          <div className="finance-hero-item">
            <span className="hero-label">当前金库余额</span>
            <span className="hero-val text-amber-300">{finance.treasury.toFixed(1)} 金币</span>
          </div>
          <div className="finance-hero-item">
            <span className="hero-label">年度净结余</span>
            <span
              className={`hero-val ${finance.annualBalance >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}
            >
              {finance.annualBalance >= 0 ? '+' : ''}
              {finance.annualBalance.toFixed(1)} 金币/年
            </span>
          </div>
        </div>

        {finance.consecutiveDeficitYears > 0 && (
          <div className="deficit-alert">
            <AlertTriangle size={16} />
            <span>
              警告：金库已连续 {finance.consecutiveDeficitYears} 年出现赤字，持续赤字将削弱治安与设施维护！
            </span>
          </div>
        )}
      </section>

      {/* 2. Income & Expense Breakdown */}
      <div className="finance-columns">
        <section className="panel-section">
          <div className="section-header">
            <ArrowUpRight size={18} className="icon-green" />
            <h3>年收入明细 ({finance.annualIncome.toFixed(1)} 金)</h3>
          </div>
          <ul className="ledger-list">
            <li>
              <span>佃农地租与工商税赋</span>
              <strong>+{incomeBreakdown.rentIncome.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>领主自营庄园产出</span>
              <strong>+{incomeBreakdown.demesneIncome.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>水磨坊谷物加工收益</span>
              <strong>+{incomeBreakdown.millIncome.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>定期集市摊位与交易费</span>
              <strong>+{incomeBreakdown.marketFees.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>桥梁与商路过境关税</span>
              <strong>+{incomeBreakdown.tradeTariffs.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>林苑牧场与新封邑收益</span>
              <strong>+{incomeBreakdown.forestryAndSpecial.toFixed(1)} 金</strong>
            </li>
          </ul>
        </section>

        <section className="panel-section">
          <div className="section-header">
            <ArrowDownRight size={18} className="icon-rose" />
            <h3>年支出明细 ({finance.annualExpense.toFixed(1)} 金)</h3>
          </div>
          <ul className="ledger-list">
            <li>
              <span>领主家族内廷生活开支</span>
              <strong className="text-rose-300">-{expenseBreakdown.familyUpkeep.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>庄园管事与行政费用</span>
              <strong className="text-rose-300">-{expenseBreakdown.adminCost.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>领地防卫与治安巡逻</span>
              <strong className="text-rose-300">-{expenseBreakdown.defenseCost.toFixed(1)} 金</strong>
            </li>
            <li>
              <span>公共建筑与道路维护费</span>
              <strong className="text-rose-300">-{expenseBreakdown.maintenanceCost.toFixed(1)} 金</strong>
            </li>
          </ul>
        </section>
      </div>

      {/* 3. Quick Fiscal & Budget Controls (Section 6.5 & 10.2) */}
      <section className="panel-section">
        <div className="section-header">
          <Scale size={18} className="icon-amber" />
          <h3>地租与年度预算调节</h3>
        </div>

        <div className="budget-control-group">
          <div className="budget-row">
            <div className="budget-label">
              <Coins size={15} className="icon-gold" />
              <div>
                <strong>地租征收档位</strong>
                <small>影响领主租金收入与居民留存私产</small>
              </div>
            </div>
            <div className="seg-buttons">
              {rentLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={`seg-btn ${policies.rentPolicy === lvl.id ? 'active' : ''}`}
                  onClick={() => setRentPolicy(lvl.id)}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="budget-row">
            <div className="budget-label">
              <ShieldCheck size={15} className="icon-sky" />
              <div>
                <strong>治安与防卫投入</strong>
                <small>决定巡逻强度与治安目标水平</small>
              </div>
            </div>
            <div className="seg-buttons">
              {budgetLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={`seg-btn ${policies.securityBudget === lvl.id ? 'active' : ''}`}
                  onClick={() => setSecurityBudget(lvl.id)}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="budget-row">
            <div className="budget-label">
              <Wrench size={15} className="icon-green" />
              <div>
                <strong>公共设施维护预算</strong>
                <small>决定磨坊、桥梁与集市的运行效能</small>
              </div>
            </div>
            <div className="seg-buttons">
              {budgetLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={`seg-btn ${policies.maintenanceBudget === lvl.id ? 'active' : ''}`}
                  onClick={() => setMaintenanceBudget(lvl.id)}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

