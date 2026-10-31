import { Application, Container } from 'pixi.js';
import { GameState } from '../world/worldState';
import { BuildingLayer } from './BuildingLayer';
import { EffectsLayer } from './EffectsLayer';
import { SettlementLayer } from './SettlementLayer';
import { MAP_HEIGHT, MAP_WIDTH, TerrainLayer } from './TerrainLayer';

export class MapRenderer {
  private app: Application | null = null;
  private worldContainer: Container;
  private terrainLayer: TerrainLayer;
  private settlementLayer: SettlementLayer;
  private buildingLayer: BuildingLayer;
  private effectsLayer: EffectsLayer;

  private isInitialized: boolean = false;
  private isDestroyed: boolean = false;
  private isPaused: boolean = false;

  // Camera Pan & Pinch-Zoom State
  private scale: number = 0.85;
  private minScale: number = 0.42;
  private maxScale: number = 1.85;
  private camX: number = 0;
  private camY: number = 0;
  private viewportWidth: number = 390;
  private viewportHeight: number = 700;

  // Pointer / Touch tracking
  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private lastPanPoint: { x: number; y: number } | null = null;
  private lastPinchDist: number | null = null;

  constructor(onSelectAnchor: (anchorId: string | null) => void) {
    this.worldContainer = new Container();
    this.terrainLayer = new TerrainLayer();
    this.settlementLayer = new SettlementLayer();
    this.buildingLayer = new BuildingLayer((id) => onSelectAnchor(id));
    this.effectsLayer = new EffectsLayer();

    this.worldContainer.addChild(this.terrainLayer.container);
    this.worldContainer.addChild(this.settlementLayer.container);
    this.worldContainer.addChild(this.buildingLayer.container);
    this.worldContainer.addChild(this.effectsLayer.container);
  }

  public async mount(hostElement: HTMLElement, initialState: GameState): Promise<void> {
    if (this.isInitialized || this.isDestroyed) return;

    this.viewportWidth = hostElement.clientWidth || 390;
    this.viewportHeight = hostElement.clientHeight || 720;

    const app = new Application();
    await app.init({
      width: this.viewportWidth,
      height: this.viewportHeight,
      backgroundColor: 0x5c8f42,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    if (this.isDestroyed) {
      app.destroy(true);
      return;
    }

    this.app = app;
    this.isInitialized = true;
    hostElement.innerHTML = '';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    app.canvas.style.display = 'block';
    app.canvas.style.touchAction = 'none';
    hostElement.appendChild(app.canvas);

    app.stage.addChild(this.worldContainer);

    // Center initial camera on the core manor & village valley (around 460, 680)
    this.scale = Math.max(0.68, Math.min(0.95, this.viewportWidth / 520));
    this.centerCameraOn(460, 675);

    this.setupInteractions(app.canvas);
    this.updateState(initialState, null);

    // Ticker for ambient 60 FPS animations (completely decoupled from simulation logic)
    app.ticker.add((ticker) => {
      const deltaSec = ticker.deltaMS / 1000;
      this.buildingLayer.tickAnimation(this.isPaused ? 0 : deltaSec);
      this.effectsLayer.tick(
        deltaSec,
        this.settlementLayer.activeChimneys,
        this.isPaused
      );
    });
  }

  public centerCameraOn(mapX: number, mapY: number): void {
    this.camX = this.viewportWidth / 2 - mapX * this.scale;
    this.camY = this.viewportHeight / 2 - mapY * this.scale;
    this.clampCamera();
    this.applyCameraTransform();
  }

  public zoomBy(factor: number): void {
    const centerScreenX = this.viewportWidth / 2;
    const centerScreenY = this.viewportHeight / 2;
    this.zoomAtPoint(this.scale * factor, centerScreenX, centerScreenY);
  }

  private zoomAtPoint(nextScaleRaw: number, screenX: number, screenY: number): void {
    const nextScale = Math.max(this.minScale, Math.min(this.maxScale, nextScaleRaw));
    const worldX = (screenX - this.camX) / this.scale;
    const worldY = (screenY - this.camY) / this.scale;

    this.scale = nextScale;
    this.camX = screenX - worldX * this.scale;
    this.camY = screenY - worldY * this.scale;
    this.clampCamera();
    this.applyCameraTransform();
  }

  private clampCamera(): void {
    const scaledW = MAP_WIDTH * this.scale;
    const scaledH = MAP_HEIGHT * this.scale;

    const minX = Math.min(0, this.viewportWidth - scaledW - 60);
    const maxX = Math.max(0, (this.viewportWidth - scaledW) / 2 + 60);
    const minY = Math.min(0, this.viewportHeight - scaledH - 80);
    const maxY = Math.max(0, (this.viewportHeight - scaledH) / 2 + 80);

    this.camX = Math.max(minX, Math.min(maxX, this.camX));
    this.camY = Math.max(minY, Math.min(maxY, this.camY));
  }

  private applyCameraTransform(): void {
    this.worldContainer.scale.set(this.scale);
    this.worldContainer.position.set(this.camX, this.camY);
  }

  public resize(width: number, height: number): void {
    if (!this.app || width <= 0 || height <= 0) return;
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.app.renderer.resize(width, height);
    this.clampCamera();
    this.applyCameraTransform();
  }

  public updateState(state: GameState, selectedAnchorId: string | null): void {
    this.isPaused = state.time.isPaused;
    if (!this.isInitialized) return;
    this.terrainLayer.update(state);
    this.settlementLayer.update(state);
    this.buildingLayer.update(state, selectedAnchorId);
    this.effectsLayer.syncWithState(state);
  }

  private setupInteractions(canvas: HTMLCanvasElement): void {
    const onPointerDown = (e: PointerEvent) => {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.activePointers.size === 1) {
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.lastPinchDist = null;
      } else if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        this.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.activePointers.has(e.pointerId)) return;
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activePointers.size === 1 && this.lastPanPoint) {
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };

        this.camX += dx;
        this.camY += dy;
        this.clampCamera();
        this.applyCameraTransform();
      } else if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;

        if (this.lastPinchDist && this.lastPinchDist > 10) {
          const factor = dist / this.lastPinchDist;
          const rect = canvas.getBoundingClientRect();
          this.zoomAtPoint(this.scale * factor, midX - rect.left, midY - rect.top);
        }
        this.lastPinchDist = dist;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size === 1) {
        const remaining = Array.from(this.activePointers.values())[0];
        this.lastPanPoint = { x: remaining.x, y: remaining.y };
        this.lastPinchDist = null;
      } else if (this.activePointers.size === 0) {
        this.lastPanPoint = null;
        this.lastPinchDist = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      this.zoomAtPoint(this.scale * factor, e.clientX - rect.left, e.clientY - rect.top);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}

