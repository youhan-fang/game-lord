import React, { useState } from 'react';
import { Crown, Filter, ScrollText } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const ChronicleScreen: React.FC = () => {
  const { gameState } = useGameStore();
  const [filterMode, setFilterMode] = useState<'all' | 'important' | 'dynasty'>('all');

  const filteredEvents = gameState.events.filter((e) => {
    if (filterMode === 'important') return e.important;
    if (filterMode === 'dynasty') return e.category === 'dynasty' || e.category === 'milestone';
    return true;
  });

  return (
    <div className="panel-body">
      <div className="subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${filterMode === 'all' ? 'active' : ''}`}
          onClick={() => setFilterMode('all')}
        >
          <ScrollText size={14} />
          <span>全部编年 ({gameState.events.length})</span>
        </button>
        <button
          type="button"
          className={`subtab-btn ${filterMode === 'important' ? 'active' : ''}`}
          onClick={() => setFilterMode('important')}
        >
          <Filter size={14} />
          <span>重要大事</span>
        </button>
        <button
          type="button"
          className={`subtab-btn ${filterMode === 'dynasty' ? 'active' : ''}`}
          onClick={() => setFilterMode('dynasty')}
        >
          <Crown size={14} />
          <span>家族世系 ({gameState.dynasty.pastLords.length + 1}代)</span>
        </button>
      </div>

      {/* Past Lords Lineage Summary when in Dynasty view */}
      {filterMode === 'dynasty' && gameState.dynasty.pastLords.length > 0 && (
        <section className="panel-section">
          <div className="section-header">
            <Crown size={17} className="icon-gold" />
            <h3>{gameState.dynasty.familyName} · 历代先祖名录</h3>
          </div>
          <div className="lineage-list">
            {gameState.dynasty.pastLords.map((lord) => (
              <div key={`${lord.generation}_${lord.startYear}`} className="lineage-item">
                <span className="lineage-gen">第 {lord.generation} 代</span>
                <div className="lineage-info">
                  <strong>{lord.name}</strong>
                  <small>
                    执政：公元 {lord.startYear}–{lord.endYear} 年 · 特质：{lord.trait.name} · 治下最高 {lord.peakHouseholds} 户
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chronological Event Timeline */}
      <div className="chronicle-timeline">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className={`chronicle-entry ${evt.important ? 'important' : ''}`}
          >
            <div className="chronicle-year-badge">
              公元 {evt.year} 年 {evt.month}月
            </div>
            <div className="chronicle-content">
              <h4>{evt.title}</h4>
              <p>{evt.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

