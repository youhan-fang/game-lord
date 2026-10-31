import React, { useEffect, useRef } from 'react';
import {
  Compass,
  FileCheck2,
  Hammer,
  Info,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { MapRenderer } from '../game/rendering/MapRenderer';
import { useGameStore } from '../store/gameStore';

export const MapViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  const {
    gameState,
    selectedAnchorId,
    setSelectedAnchorId,
    setActiveTab,
  } = useGameStore();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new MapRenderer((anchorId) => {
      useGameStore.getState().setSelectedAnchorId(anchorId);
    });
    rendererRef.current = renderer;

    void renderer.mount(el, useGameStore.getState().gameState);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.resize(width, height);
      }
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateState(gameState, selectedAnchorId);
    }
  }, [gameState, selectedAnchorId]);

  const selectedAnchor = selectedAnchorId
    ? gameState.map.anchors.find((a) => a.id === selectedAnchorId) ?? null
    : null;

  const activeConstruction = gameState.buildings.filter(
    (b) => b.underConstruction && !b.built
  );

  const stageNameMap = {
    manor: '小庄园阶段',
    village: '河谷村落阶段',
    township: '集市乡镇阶段',
    prosperous_town: '繁荣城镇阶段',
    fortified_city: '设防大重镇阶段',
  };

  return (
    <div className="map-viewport-wrapper">
      <div ref={containerRef} className="pixi-canvas-host" />

      {/* Top-left floating Settlement Stage & Quick Status Pill */}
      <div className="map-overlay-top-left">
        <div className="stage-pill">
          <span className="stage-dot" />
          <span>{stageNameMap[gameState.map.stage]}</span>
          <span className="stage-sep">·</span>
          <span>已垦 {gameState.agriculture.cultivatedLandHa.toFixed(0)}/{gameState.agriculture.arablePotentialHa} 公顷</span>
        </div>

        {activeConstruction.map((b) => {
          const def = BUILDING_DEFINITIONS[b.id];
          return (
            <div key={b.id} className="construction-pill">
              <Hammer size={13} className="spin-slow" />
              <span>
                正在兴建{def.name} ({b.progressMonths}/{b.totalMonths}月)
              </span>
            </div>
          );
        })}

        {gameState.pendingDecisions.length > 0 && (
          <button
            type="button"
            className="decision-alert-pill"
            onClick={() => setActiveTab('domain')}
          >
            <FileCheck2 size={14} />
            <span>有 {gameState.pendingDecisions.length} 项领地政务请愿待批阅</span>
          </button>
        )}
      </div>

      {/* Right-side floating Map Camera Controls */}
      <div className="map-camera-controls">
        <button
          type="button"
          className="cam-btn"
          onClick={() => rendererRef.current?.zoomBy(1.22)}
          title="放大地图"
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          className="cam-btn"
          onClick={() => rendererRef.current?.zoomBy(0.82)}
          title="缩小地图"
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          className="cam-btn"
          onClick={() => rendererRef.current?.centerCameraOn(460, 675)}
          title="回到领主庄园中心"
        >
          <Compass size={18} />
        </button>
      </div>

      {/* Selected Map Anchor Inspection Card */}
      {selectedAnchor && (
        <div className="anchor-inspect-card">
          <div className="anchor-card-header">
            <div className="anchor-title-group">
              <Info size={16} className="icon-gold" />
              <h4>{selectedAnchor.name}</h4>
              <span className="anchor-lvl-tag">
                等级 {selectedAnchor.level}/{selectedAnchor.maxLevel}
              </span>
            </div>
            <button
              type="button"
              className="icon-close-btn"
              onClick={() => setSelectedAnchorId(null)}
            >
              <X size={16} />
            </button>
          </div>
          <p className="anchor-desc">{selectedAnchor.description}</p>
        </div>
      )}
    </div>
  );
};

