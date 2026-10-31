import React from 'react';
import {
  Castle,
  Coins,
  Hammer,
  ScrollText,
  Scale,
} from 'lucide-react';
import { hasBuilding } from '../game/simulation/agriculture';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { NavTabId, useGameStore } from '../store/gameStore';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, gameState } = useGameStore();

  const toggleTab = (tab: NavTabId) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  // Count how many buildings are currently affordable & meet prerequisites
  const availableBuildsCount = gameState.buildings.filter((b) => {
    if (b.built || b.underConstruction) return false;
    const def = BUILDING_DEFINITIONS[b.id];
    if (gameState.finance.treasury < def.costGold) return false;
    if (
      def.prerequisites.minHouseholds &&
      gameState.population.totalHouseholds < def.prerequisites.minHouseholds
    ) {
      return false;
    }
    if (def.prerequisites.requiredBuildings) {
      for (const req of def.prerequisites.requiredBuildings) {
        if (!hasBuilding(gameState, req)) return false;
      }
    }
    return true;
  }).length;

  const pendingCount = gameState.pendingDecisions.length;

  const navItems: Array<{
    id: Exclude<NavTabId, null>;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'domain',
      label: '领地',
      icon: <Castle size={20} />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'finance',
      label: '财政',
      icon: <Coins size={20} />,
    },
    {
      id: 'policy',
      label: '政策',
      icon: <Scale size={20} />,
    },
    {
      id: 'construction',
      label: '建设',
      icon: <Hammer size={20} />,
      badge: availableBuildsCount > 0 ? availableBuildsCount : undefined,
    },
    {
      id: 'chronicle',
      label: '编年史',
      icon: <ScrollText size={20} />,
    },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => toggleTab(item.id)}
          >
            <div className="nav-icon-wrap">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

