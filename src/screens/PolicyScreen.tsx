import React from 'react';
import {
  Check,
  Coins,
  Scale,
  Shield,
  Trees,
  Wrench,
} from 'lucide-react';
import {
  LAND_POLICY_OPTIONS,
  MAINTENANCE_BUDGET_OPTIONS,
   PolicyOptionMeta,
  RENT_POLICY_OPTIONS,
  SECURITY_BUDGET_OPTIONS,
  TRADE_POLICY_OPTIONS,
} from '../data/policies';
import { useGameStore } from '../store/gameStore';

function renderPolicySection<T extends string>(
  title: string,
  icon: React.ReactNode,
  currentValue: T,
  options: PolicyOptionMeta<T>[],
  onSelect: (val: T) => void
) {
  return (
    <section className="panel-section">
      <div className="section-header">
        {icon}
        <h3>{title}</h3>
      </div>

      <div className="policy-cards-list">
        {options.map((opt) => {
          const isCurrent = opt.value === currentValue;
          return (
            <div
              key={opt.value}
              className={`policy-option-card ${isCurrent ? 'selected' : ''}`}
              onClick={() => onSelect(opt.value)}
            >
              <div className="policy-card-top">
                <div>
                  <h4>{opt.name}</h4>
                  <span className="policy-subtitle">{opt.subtitle}</span>
                </div>
                {isCurrent ? (
                  <span className="current-policy-pill">
                    <Check size={13} /> 当前施行
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(opt.value);
                    }}
                  >
                    切换政策
                  </button>
                )}
              </div>

              <div className="policy-effects-box">
                {opt.pros.map((pro, idx) => (
                  <div key={idx} className="effect-line pro-line">
                    <span>＋</span>
                    <span>{pro}</span>
                  </div>
                ))}
                {opt.cons.map((con, idx) => (
                  <div key={idx} className="effect-line con-line">
                    <span>－</span>
                    <span>{con}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const PolicyScreen: React.FC = () => {
  const {
    gameState,
    setRentPolicy,
    setLandPolicy,
    setTradePolicy,
    setSecurityBudget,
    setMaintenanceBudget,
  } = useGameStore();

  const { policies } = gameState;

  return (
    <div className="panel-body">
      <p className="panel-intro-note">
        领主颁布的法令将长期生效，管事会按照既定政策治理领地。政策通过影响居民私产留存、垦荒意愿与商业成本发挥作用。
      </p>

      {renderPolicySection(
        '地租与赋税政策',
        <Coins size={18} className="icon-gold" />,
        policies.rentPolicy,
        RENT_POLICY_OPTIONS,
        setRentPolicy
      )}

      {renderPolicySection(
        '土地与林苑开发政策',
        <Trees size={18} className="icon-green" />,
        policies.landPolicy,
        LAND_POLICY_OPTIONS,
        setLandPolicy
      )}

      {renderPolicySection(
        '集市与商业贸易政策',
        <Scale size={18} className="icon-sky" />,
        policies.tradePolicy,
        TRADE_POLICY_OPTIONS,
        setTradePolicy
      )}

      {renderPolicySection(
        '治安巡防预算等级',
        <Shield size={18} className="icon-amber" />,
        policies.securityBudget,
        SECURITY_BUDGET_OPTIONS,
        setSecurityBudget
      )}

      {renderPolicySection(
        '公共设施修缮预算',
        <Wrench size={18} className="icon-green" />,
        policies.maintenanceBudget,
        MAINTENANCE_BUDGET_OPTIONS,
        setMaintenanceBudget
      )}
    </div>
  );
};

