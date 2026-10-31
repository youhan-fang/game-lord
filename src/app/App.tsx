import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { MapViewport } from '../components/MapViewport';
import { ModalsAndOverlays } from '../components/Modals';
import { TopBar } from '../components/TopBar';
import { ChronicleScreen } from '../screens/ChronicleScreen';
import { ConstructionScreen } from '../screens/ConstructionScreen';
import { DomainScreen } from '../screens/DomainScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { PolicyScreen } from '../screens/PolicyScreen';
import { NavTabId, useGameStore } from '../store/gameStore';
import './styles.css';

const PANEL_TITLES: Record<Exclude<NavTabId, null>, string> = {
  domain: '领地总览与家族传承',
  finance: '领主金库与年度财政',
  policy: '领地治理法令与预算',
  construction: '公共设施投资与扩土',
  chronicle: '领地历史编年史',
};

export const App: React.FC = () => {
  const { initGame, tickRealTime, activeTab, setActiveTab, toastMessage } =
    useGameStore();

  useEffect(() => {
    void initGame();

    const timer = window.setInterval(() => {
      tickRealTime(Date.now());
    }, 500);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tickRealTime(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [initGame, tickRealTime]);

  return (
    <div className="app-outer-shell">
      <div className="mobile-portrait-frame">
        {/* Top HUD Bar */}
        <TopBar />

        {/* Center 2D Valley Map */}
        <main className="main-map-stage">
          <MapViewport />

          {/* Toast Feedback Banner */}
          {toastMessage && <div className="toast-banner">{toastMessage}</div>}

          {/* Slide-up Bottom Drawer Panel */}
          {activeTab && (
            <div className="drawer-overlay" onClick={() => setActiveTab(null)}>
              <section
                className="bottom-drawer"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="drawer-header">
                  <div className="drawer-handle-bar" />
                  <div className="drawer-title-row">
                    <h2>{PANEL_TITLES[activeTab]}</h2>
                    <button
                      type="button"
                      className="drawer-close-btn"
                      onClick={() => setActiveTab(null)}
                      aria-label="关闭面板"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </header>

                <div className="drawer-scroll-area">
                  {activeTab === 'domain' && <DomainScreen />}
                  {activeTab === 'finance' && <FinanceScreen />}
                  {activeTab === 'policy' && <PolicyScreen />}
                  {activeTab === 'construction' && <ConstructionScreen />}
                  {activeTab === 'chronicle' && <ChronicleScreen />}
                </div>
              </section>
            </div>
          )}
        </main>

        {/* Bottom 5-Item Navigation Bar */}
        <BottomNav />

        {/* Diagnostic, Offline Report, Achievement & Debug Modals */}
        <ModalsAndOverlays />
      </div>
    </div>
  );
};

